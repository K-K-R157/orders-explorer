import { CHANNELS, PAYMENT_METHODS, REGIONS, STATUSES, type Order } from '../data/types';
import { COLUMNS, type ColumnType } from '../grid/columns';

// ---- Fields -------------------------------------------------------------

export type FieldKey = keyof Order;
export type FieldKind = ColumnType; // 'text' | 'number' | 'date' | 'enum'

export type Option = { value: string; label: string };

// Fixed value lists for "pick from a list" fields. Priority stores 'none' for missing.
const ENUM_OPTIONS: Partial<Record<FieldKey, Option[]>> = {
  status: STATUSES.map((s) => ({ value: s, label: s })),
  region: REGIONS.map((r) => ({ value: r, label: r })),
  channel: CHANNELS.map((c) => ({ value: c, label: c })),
  paymentMethod: PAYMENT_METHODS.map((p) => ({ value: p, label: p })),
  priority: [
    { value: '1', label: 'P1' },
    { value: '2', label: 'P2' },
    { value: '3', label: 'P3' },
    { value: 'none', label: 'None' },
  ],
};

export type FilterField = { key: FieldKey; label: string; kind: FieldKind; options: Option[] };

// Every grid column can be filtered; its type decides the operators and input.
export const FILTER_FIELDS: FilterField[] = COLUMNS.map((c) => ({
  key: c.key,
  label: c.label,
  kind: c.type,
  options: ENUM_OPTIONS[c.key] ?? [],
}));

const FIELD_BY_KEY = new Map(FILTER_FIELDS.map((f) => [f.key, f]));

export function getField(key: FieldKey): FilterField {
  const field = FIELD_BY_KEY.get(key);
  if (!field) throw new Error(`Unknown filter field: ${key}`);
  return field;
}

export function isFieldKey(value: unknown): value is FieldKey {
  return typeof value === 'string' && FIELD_BY_KEY.has(value as FieldKey);
}

// ---- Operators ----------------------------------------------------------

export const OPERATORS = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'equals', label: 'equals' },
  ],
  number: [
    { value: 'eq', label: 'equals' },
    { value: 'gt', label: 'greater than' },
    { value: 'lt', label: 'less than' },
    { value: 'between', label: 'between' },
  ],
  date: [
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'between', label: 'between' },
  ],
  enum: [{ value: 'in', label: 'is one of' }],
} as const;

export type Operator = (typeof OPERATORS)[FieldKind][number]['value'];

export function isOperatorFor(kind: FieldKind, op: unknown): op is Operator {
  return OPERATORS[kind].some((o) => o.value === op);
}

export function operatorLabel(kind: FieldKind, op: Operator): string {
  return OPERATORS[kind].find((o) => o.value === op)?.label ?? op;
}

// ---- Filter state -------------------------------------------------------

// One flat shape for every field type keeps editing and URL storage simple.
// Which parts are used depends on the field's kind.
export type Condition = {
  id: string;
  field: FieldKey;
  op: Operator;
  value: string; // text, number or date (YYYY-MM-DD), exactly as typed
  value2: string; // upper bound for "between"
  values: string[]; // picked options for enum fields
};

// Conditions inside a group are OR-ed; groups are AND-ed.
export type Group = { id: string; conditions: Condition[] };
export type FilterState = { groups: Group[] };

export const EMPTY_FILTER: FilterState = { groups: [] };

export const newId = () => Math.random().toString(36).slice(2, 9);

export function newCondition(field: FieldKey = 'status'): Condition {
  const kind = getField(field).kind;
  return { id: newId(), field, op: OPERATORS[kind][0].value, value: '', value2: '', values: [] };
}

export function newGroup(): Group {
  return { id: newId(), conditions: [newCondition()] };
}

// ---- Immutable updates used by the builder and chips ----------------------

export function addGroup(filter: FilterState, group: Group = newGroup()): FilterState {
  return { groups: [...filter.groups, group] };
}

export function removeGroup(filter: FilterState, groupId: string): FilterState {
  return { groups: filter.groups.filter((g) => g.id !== groupId) };
}

export function addCondition(filter: FilterState, groupId: string, condition: Condition): FilterState {
  return {
    groups: filter.groups.map((g) =>
      g.id === groupId ? { ...g, conditions: [...g.conditions, condition] } : g,
    ),
  };
}

export function updateCondition(filter: FilterState, groupId: string, condition: Condition): FilterState {
  return {
    groups: filter.groups.map((g) =>
      g.id === groupId
        ? { ...g, conditions: g.conditions.map((c) => (c.id === condition.id ? condition : c)) }
        : g,
    ),
  };
}

// Removing the last condition of a group removes the group too.
export function removeCondition(filter: FilterState, conditionId: string): FilterState {
  return {
    groups: filter.groups
      .map((g) => ({ ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }))
      .filter((g) => g.conditions.length > 0),
  };
}

// Switching field resets operator and value, unless the new field has the same kind.
export function changeField(condition: Condition, field: FieldKey): Condition {
  const sameKind = getField(field).kind === getField(condition.field).kind;
  return sameKind && getField(field).kind !== 'enum'
    ? { ...condition, field }
    : { ...newCondition(field), id: condition.id };
}
