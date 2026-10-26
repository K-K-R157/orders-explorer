import type { Order } from '../data/types';
import { parseDay, parseNumber } from '../filter/evaluate';
import {
  EMPTY_FILTER,
  getField,
  isFieldKey,
  isOperatorFor,
  newId,
  type Condition,
  type FieldKey,
  type FilterState,
} from '../filter/model';
import { COLUMNS } from '../grid/columns';
import { EMPTY_SELECTION, type Selection } from '../grid/selection';
import type { SortState } from '../grid/sort';

// Everything needed to reproduce the screen from a link.
export type ViewState = {
  filter: FilterState;
  sort: SortState;
  pinned: FieldKey | null;
  selected: Selection;
  detailsId: string | null;
};

export const DEFAULT_VIEW: ViewState = {
  filter: EMPTY_FILTER,
  sort: null,
  pinned: 'id', // Order ID pinned by default so rows stay identifiable when scrolling sideways
  selected: EMPTY_SELECTION,
  detailsId: null,
};

// URL parameter names, e.g. ?f=…&sort=-amount&pin=customer&sel=1-9_4&open=ORD-0000042
const P = { filter: 'f', sort: 'sort', pin: 'pin', selected: 'sel', details: 'open' } as const;

const MAX_GROUPS = 20;
const MAX_CONDITIONS = 20;
const MAX_TEXT = 200;
const MAX_SELECTED = 1_000_000;

class UrlError extends Error {}

// ---- Write -------------------------------------------------------------------

export function serializeView(view: ViewState): string {
  const params = new URLSearchParams();
  if (view.filter.groups.length > 0) params.set(P.filter, encodeFilter(view.filter));
  if (view.sort) params.set(P.sort, `${view.sort.dir === 'desc' ? '-' : ''}${view.sort.key}`);
  if (view.pinned !== DEFAULT_VIEW.pinned) params.set(P.pin, view.pinned ?? 'none');
  if (view.selected.size > 0) params.set(P.selected, encodeSelection(view.selected));
  if (view.detailsId) params.set(P.details, view.detailsId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

// ---- Read --------------------------------------------------------------------

export type ParseResult = { view: ViewState; error: string | null };

// Reads the view from a query string. If any part is invalid, the whole view falls
// back to the default and `error` explains what was wrong, so the app never crashes
// on a broken or hand-edited link.
export function parseView(search: string, ordersById: ReadonlyMap<string, Order>): ParseResult {
  const params = new URLSearchParams(search);
  const read = <T,>(key: string, decode: (value: string) => T, fallback: T): T => {
    const value = params.get(key);
    return value === null ? fallback : decode(value);
  };
  try {
    const view: ViewState = {
      filter: read(P.filter, decodeFilter, DEFAULT_VIEW.filter),
      sort: read(P.sort, decodeSort, DEFAULT_VIEW.sort),
      pinned: read(P.pin, decodePinned, DEFAULT_VIEW.pinned),
      selected: read(P.selected, (v) => decodeSelection(v, ordersById), DEFAULT_VIEW.selected),
      detailsId: read(P.details, (v) => decodeDetails(v, ordersById), DEFAULT_VIEW.detailsId),
    };
    return { view, error: null };
  } catch (err) {
    const reason = err instanceof UrlError ? err.message : 'it could not be read';
    return { view: DEFAULT_VIEW, error: reason };
  }
}

// ---- Sort / pin / details ------------------------------------------------------

const COLUMN_KEYS = new Set<string>(COLUMNS.map((c) => c.key));

function decodeSort(value: string): SortState {
  const desc = value.startsWith('-');
  const key = desc ? value.slice(1) : value;
  if (!COLUMN_KEYS.has(key)) throw new UrlError(`the sort column "${value}" does not exist`);
  return { key: key as FieldKey, dir: desc ? 'desc' : 'asc' };
}

function decodePinned(value: string): FieldKey | null {
  if (value === 'none') return null;
  if (!COLUMN_KEYS.has(value)) throw new UrlError(`the pinned column "${value}" does not exist`);
  return value as FieldKey;
}

function decodeDetails(value: string, ordersById: ReadonlyMap<string, Order>): string {
  if (!ordersById.has(value)) throw new UrlError(`order "${value}" does not exist`);
  return value;
}

// ---- Selection: "ORD-0000042" ids as delta/run-length encoded base36 numbers -----
// e.g. ORD-1…ORD-200 + ORD-305 → "1-5j_2x"; all 50,000 orders → "1-12kv".

const ID_PATTERN = /^ORD-(\d+)$/;
const ID_DIGITS = 7;

function encodeSelection(selected: Selection): string {
  const nums = [...selected]
    .map((id) => ID_PATTERN.exec(id))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);

  const tokens: string[] = [];
  let prev = 0;
  for (let i = 0; i < nums.length; i++) {
    const start = nums[i];
    let end = start;
    while (i + 1 < nums.length && nums[i + 1] === end + 1) end = nums[++i];
    const run = end - start;
    tokens.push((start - prev).toString(36) + (run > 0 ? `-${run.toString(36)}` : ''));
    prev = end;
  }
  return tokens.join('_');
}

function decodeSelection(value: string, ordersById: ReadonlyMap<string, Order>): Selection {
  const selected = new Set<string>();
  let prev = 0;
  for (const token of value.split('_')) {
    const m = /^([0-9a-z]+)(?:-([0-9a-z]+))?$/.exec(token);
    if (!m) throw new UrlError('the selected rows are not in a valid format');
    const start = prev + parseInt(m[1], 36);
    const end = start + (m[2] ? parseInt(m[2], 36) : 0);
    if (end - start + selected.size > MAX_SELECTED) throw new UrlError('too many rows are selected');
    for (let n = start; n <= end; n++) {
      const id = `ORD-${String(n).padStart(ID_DIGITS, '0')}`;
      if (!ordersById.has(id)) throw new UrlError(`selected order "${id}" does not exist`);
      selected.add(id);
    }
    prev = end;
  }
  return selected;
}

// ---- Filter: compact JSON, base64url-encoded --------------------------------------
// Groups → conditions → [field, op, value, value2?] or [field, "in", [values…]].

type CompactCondition = [string, string, ...unknown[]];

function encodeFilter(filter: FilterState): string {
  const compact = filter.groups.map((g) =>
    g.conditions.map((c): CompactCondition => {
      if (getField(c.field).kind === 'enum') return [c.field, c.op, c.values];
      return c.op === 'between' ? [c.field, c.op, c.value, c.value2] : [c.field, c.op, c.value];
    }),
  );
  return toBase64Url(JSON.stringify(compact));
}

function decodeFilter(value: string): FilterState {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(value));
  } catch {
    throw new UrlError('the filter could not be read');
  }
  if (!Array.isArray(raw) || raw.length > MAX_GROUPS) throw new UrlError('the filter is not valid');

  return {
    groups: raw.map((group: unknown) => {
      if (!Array.isArray(group) || group.length === 0 || group.length > MAX_CONDITIONS) {
        throw new UrlError('the filter is not valid');
      }
      return { id: newId(), conditions: group.map(decodeCondition) };
    }),
  };
}

function decodeCondition(raw: unknown): Condition {
  if (!Array.isArray(raw)) throw new UrlError('a filter condition is not valid');
  const [field, op, a, b] = raw as unknown[];
  if (!isFieldKey(field)) throw new UrlError(`the filter field "${String(field)}" does not exist`);
  const def = getField(field);
  if (!isOperatorFor(def.kind, op)) {
    throw new UrlError(`"${String(op)}" is not a valid operator for ${def.label}`);
  }
  const base: Condition = { id: newId(), field, op, value: '', value2: '', values: [] };

  if (def.kind === 'enum') {
    const allowed = new Set(def.options.map((o) => o.value));
    if (!Array.isArray(a) || a.length === 0 || !a.every((v) => typeof v === 'string' && allowed.has(v))) {
      throw new UrlError(`the ${def.label} filter has an unknown value`);
    }
    return { ...base, values: [...new Set(a as string[])] };
  }

  const check = (v: unknown): string => {
    const ok =
      typeof v === 'string' &&
      v.length <= MAX_TEXT &&
      (def.kind === 'text'
        ? v.trim() !== ''
        : def.kind === 'number'
          ? parseNumber(v) !== null
          : parseDay(v) !== null);
    if (!ok) throw new UrlError(`the ${def.label} filter has an invalid value`);
    return v as string;
  };
  return { ...base, value: check(a), value2: op === 'between' ? check(b) : '' };
}

// UTF-8 safe base64url (URL-friendly: no +, / or = characters).
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
