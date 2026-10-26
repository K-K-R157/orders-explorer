import type { Order } from '../data/types';
import { getField, type Condition, type FilterState } from './model';

type Predicate = (order: Order) => boolean;

const DAY_MS = 24 * 60 * 60 * 1000;
const AMOUNT_EPSILON = 0.005; // "equals" on rupee amounts compares to the paisa

export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s₹]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// "YYYY-MM-DD" from <input type="date"> → start of that day in UTC (dates are shown in UTC).
export function parseDay(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject impossible dates like 2024-13-45 instead of letting them roll over.
  return new Date(ms).toISOString().startsWith(text) ? ms : null;
}

// Turns one condition into a fast predicate. Values are parsed once here, not per row.
// Returns null while the condition is incomplete (e.g. empty value), so it's ignored.
function compileCondition(c: Condition): Predicate | null {
  const kind = getField(c.field).kind;

  if (kind === 'text') {
    const needle = c.value.trim().toLowerCase();
    if (!needle) return null;
    const text = (o: Order) => String(o[c.field] ?? '').toLowerCase();
    if (c.op === 'contains') return (o) => text(o).includes(needle);
    if (c.op === 'notContains') return (o) => !text(o).includes(needle);
    return (o) => text(o) === needle;
  }

  if (kind === 'number') {
    const a = parseNumber(c.value);
    if (a === null) return null;
    const num = (o: Order) => o[c.field] as number;
    if (c.op === 'eq') return (o) => Math.abs(num(o) - a) < AMOUNT_EPSILON;
    if (c.op === 'gt') return (o) => num(o) > a;
    if (c.op === 'lt') return (o) => num(o) < a;
    const b = parseNumber(c.value2);
    if (b === null) return null;
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return (o) => num(o) >= lo && num(o) <= hi; // inclusive
  }

  if (kind === 'date') {
    const a = parseDay(c.value);
    if (a === null) return null;
    // Missing dates (e.g. no updatedAt) never match a date condition.
    const inRange = (from: number, to: number) => (o: Order) => {
      const t = o[c.field] as number | null;
      return t !== null && t >= from && t < to;
    };
    if (c.op === 'before') return inRange(-Infinity, a);
    if (c.op === 'after') return inRange(a + DAY_MS, Infinity);
    const b = parseDay(c.value2);
    if (b === null) return null;
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return inRange(lo, hi + DAY_MS); // whole days, both ends inclusive
  }

  // enum: "is one of"
  if (c.values.length === 0) return null;
  const allowed = new Set(c.values);
  if (c.field === 'priority') {
    return (o) => allowed.has(o.priority === null ? 'none' : String(o.priority));
  }
  return (o) => allowed.has(String(o[c.field]));
}

export function isComplete(c: Condition): boolean {
  return compileCondition(c) !== null;
}

// (a OR b) AND (c OR d) ... Groups with no complete conditions are skipped.
// Returns null when nothing is active, so callers can skip filtering entirely.
export function compileFilter(filter: FilterState): Predicate | null {
  const groups = filter.groups
    .map((g) => g.conditions.map(compileCondition).filter((p): p is Predicate => p !== null))
    .filter((predicates) => predicates.length > 0);

  if (groups.length === 0) return null;
  return (order) => groups.every((predicates) => predicates.some((p) => p(order)));
}

// Drops unfinished conditions (and groups left empty), e.g. when the builder closes.
export function pruneIncomplete(filter: FilterState): FilterState {
  return {
    groups: filter.groups
      .map((g) => ({ ...g, conditions: g.conditions.filter(isComplete) }))
      .filter((g) => g.conditions.length > 0),
  };
}

export function countActiveConditions(filter: FilterState): number {
  return filter.groups.reduce((n, g) => n + g.conditions.filter(isComplete).length, 0);
}
