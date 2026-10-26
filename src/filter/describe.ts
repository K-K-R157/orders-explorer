import { formatAmount } from '../lib/format';
import { getField, operatorLabel, type Condition } from './model';

const MAX_LISTED = 3;

// Human-readable text for a chip, e.g. `Status is one of shipped, delivered` or `Amount > ₹5,000.00`.
export function describeCondition(c: Condition): string {
  const field = getField(c.field);
  const label = field.label.replace(/ \(UTC\)$/, '');

  if (field.kind === 'enum') {
    const names = c.values.map((v) => field.options.find((o) => o.value === v)?.label ?? v);
    const listed = names.slice(0, MAX_LISTED).join(', ');
    const more = names.length > MAX_LISTED ? ` +${names.length - MAX_LISTED}` : '';
    return `${label}: ${listed}${more}`;
  }

  const show = (v: string) => {
    if (field.kind === 'text') return `"${v.trim()}"`;
    if (field.kind === 'number' && c.field === 'amount') return formatAmount(Number(v.replace(/[,\s₹]/g, '')));
    return v.trim();
  };

  const op = operatorLabel(field.kind, c.op);
  if (c.op === 'between') return `${label} ${show(c.value)} – ${show(c.value2)}`;
  if (c.op === 'gt') return `${label} > ${show(c.value)}`;
  if (c.op === 'lt') return `${label} < ${show(c.value)}`;
  if (c.op === 'eq') return `${label} = ${show(c.value)}`;
  return `${label} ${op} ${show(c.value)}`;
}
