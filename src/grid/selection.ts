import type { Order } from '../data/types';

// Selection is a set of order IDs (not row positions), so it survives sorting and filtering.
export type Selection = ReadonlySet<string>;

export const EMPTY_SELECTION: Selection = new Set();

export function toggleId(selection: Selection, id: string): Selection {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// Adds every row between two positions (inclusive, either direction) to the selection.
export function addRange(
  selection: Selection,
  rows: readonly Order[],
  fromIndex: number,
  toIndex: number,
): Selection {
  const next = new Set(selection);
  const [lo, hi] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  for (let i = lo; i <= hi; i++) next.add(rows[i].id);
  return next;
}

export function addAll(selection: Selection, rows: readonly Order[]): Selection {
  const next = new Set(selection);
  for (const row of rows) next.add(row.id);
  return next;
}

export function removeAll(selection: Selection, rows: readonly Order[]): Selection {
  const next = new Set(selection);
  for (const row of rows) next.delete(row.id);
  return next;
}

export function countSelected(selection: Selection, rows: readonly Order[]): number {
  if (selection.size === 0) return 0;
  let count = 0;
  for (const row of rows) if (selection.has(row.id)) count++;
  return count;
}
