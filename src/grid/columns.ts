import type { Order } from '../data/types';
import { formatAmount, formatDate, formatPriority } from '../lib/format';

export type ColumnType = 'text' | 'number' | 'date' | 'enum';

export type Column = {
  key: keyof Order;
  label: string;
  type: ColumnType;
  width: number; // default width in px
  align: 'left' | 'right';
  format: (order: Order) => string;
};

const text = (key: keyof Order) => (o: Order) => String(o[key] ?? '');

export const COLUMNS: Column[] = [
  { key: 'id', label: 'Order ID', type: 'text', width: 110, align: 'left', format: text('id') },
  { key: 'customer', label: 'Customer', type: 'text', width: 150, align: 'left', format: text('customer') },
  { key: 'customerEmail', label: 'Email', type: 'text', width: 210, align: 'left', format: text('customerEmail') },
  { key: 'status', label: 'Status', type: 'enum', width: 100, align: 'left', format: text('status') },
  { key: 'amount', label: 'Amount', type: 'number', width: 110, align: 'right', format: (o) => formatAmount(o.amount) },
  { key: 'createdAt', label: 'Created (UTC)', type: 'date', width: 130, align: 'left', format: (o) => formatDate(o.createdAt) },
  { key: 'updatedAt', label: 'Updated (UTC)', type: 'date', width: 130, align: 'left', format: (o) => formatDate(o.updatedAt) },
  { key: 'region', label: 'Region', type: 'enum', width: 95, align: 'left', format: text('region') },
  { key: 'channel', label: 'Channel', type: 'enum', width: 75, align: 'left', format: text('channel') },
  { key: 'priority', label: 'Priority', type: 'enum', width: 70, align: 'left', format: (o) => formatPriority(o.priority) },
  { key: 'paymentMethod', label: 'Payment', type: 'enum', width: 95, align: 'left', format: text('paymentMethod') },
  { key: 'itemCount', label: 'Items', type: 'number', width: 60, align: 'right', format: (o) => String(o.itemCount) },
  { key: 'notes', label: 'Notes', type: 'text', width: 260, align: 'left', format: text('notes') },
];
