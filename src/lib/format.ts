import type { Order } from '../data/types';

// One place for display formatting so the grid, details panel and CSV agree.

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat('en-IN');

// ₹1,23,456.50 (Indian digit grouping)
export function formatAmount(rupees: number): string {
  return amountFormatter.format(rupees);
}

export function formatCount(n: number): string {
  return countFormatter.format(n);
}

const pad = (n: number) => String(n).padStart(2, '0');

// Always UTC, always YYYY-MM-DD HH:mm, so every date in the app looks the same.
export function formatDate(ms: number | null): string {
  if (ms === null) return '—';
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatPriority(priority: Order['priority']): string {
  return priority === null ? 'None' : `P${priority}`;
}
