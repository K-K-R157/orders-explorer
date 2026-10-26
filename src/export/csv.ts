import type { Order } from '../data/types';
import { formatPriority } from '../lib/format';

// CSV is for spreadsheets, so values are machine-friendly: plain numbers and ISO dates,
// not the ₹ / display formats used in the grid.
const CSV_COLUMNS: { header: string; value: (o: Order) => string }[] = [
  { header: 'Order ID', value: (o) => o.id },
  { header: 'Customer', value: (o) => o.customer },
  { header: 'Email', value: (o) => o.customerEmail },
  { header: 'Status', value: (o) => o.status },
  { header: 'Amount (INR)', value: (o) => o.amount.toFixed(2) },
  { header: 'Created (UTC)', value: (o) => new Date(o.createdAt).toISOString() },
  { header: 'Updated (UTC)', value: (o) => (o.updatedAt === null ? '' : new Date(o.updatedAt).toISOString()) },
  { header: 'Region', value: (o) => o.region },
  { header: 'Channel', value: (o) => o.channel },
  { header: 'Priority', value: (o) => formatPriority(o.priority) },
  { header: 'Payment', value: (o) => o.paymentMethod },
  { header: 'Items', value: (o) => String(o.itemCount) },
  { header: 'Notes', value: (o) => o.notes },
];

// Byte order mark: makes Excel open the file as UTF-8 (names, notes).
const BOM = String.fromCharCode(0xfeff);

function escapeCell(value: string): string {
  // A cell starting with = + - @ would run as a formula in Excel/Sheets; prefix it to keep it text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: readonly Order[]): string {
  const lines = [CSV_COLUMNS.map((c) => escapeCell(c.header)).join(',')];
  for (const row of rows) lines.push(CSV_COLUMNS.map((c) => escapeCell(c.value(row))).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

export function downloadCsv(rows: readonly Order[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${stamp}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
