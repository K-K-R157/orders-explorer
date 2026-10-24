import {
  CHANNELS,
  PAYMENT_METHODS,
  REGIONS,
  STATUSES,
  type Order,
} from './types';

// All data cleaning lives here, so the grid and filters only ever see clean `Order`s.

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

// v1 stores paise, v2 stores rupees. Some amounts are strings.
export function parseAmount(value: unknown, schemaVersion: number): number | null {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return schemaVersion === 1 ? n / 100 : n;
}

// Four formats: ISO with zone, ISO without zone (UTC), epoch seconds, DD/MM/YYYY (UTC midnight).
export function parseDate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value * 1000 : null;
  if (typeof value !== 'string') return null;

  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (dmy) return Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const hasZone = /(Z|[+-]\d{2}:\d{2})$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function parsePriority(value: unknown): Order['priority'] {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// Turns one raw record into a clean Order, or null if it is unusable.
export function normalizeOrder(raw: unknown): Order | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id = asString(r.id);
  const schemaVersion = r.schemaVersion === 1 ? 1 : 2;
  const status = asString(r.status).trim().toLowerCase();
  const region = asString(r.region).trim().toUpperCase();
  const channel = asString(r.channel).trim().toLowerCase();
  const paymentMethod = asString(r.paymentMethod).trim().toLowerCase();
  const amount = parseAmount(r.amount, schemaVersion);
  const createdAt = parseDate(r.createdAt);

  if (
    !id ||
    amount === null ||
    createdAt === null ||
    !isOneOf(STATUSES, status) ||
    !isOneOf(REGIONS, region) ||
    !isOneOf(CHANNELS, channel) ||
    !isOneOf(PAYMENT_METHODS, paymentMethod)
  ) {
    return null;
  }

  return {
    id,
    customer: asString(r.customerName ?? r.customer_name).trim(),
    customerEmail: asString(r.customerEmail).trim(),
    status,
    amount,
    currency: asString(r.currency).trim(),
    createdAt,
    updatedAt: parseDate(r.updatedAt), // null or missing both become null
    region,
    channel,
    priority: parsePriority(r.priority),
    paymentMethod,
    itemCount: typeof r.itemCount === 'number' ? r.itemCount : 0,
    notes: asString(r.notes),
  };
}

// Duplicate IDs: prefer the later updatedAt; if only one has updatedAt keep it;
// if neither has it keep the one that appears later in the file.
function shouldReplace(existing: Order, incoming: Order): boolean {
  if (existing.updatedAt !== null && incoming.updatedAt !== null) {
    return incoming.updatedAt >= existing.updatedAt;
  }
  if (existing.updatedAt !== null) return false;
  return true; // incoming has updatedAt, or neither does (incoming is later in file)
}

export type NormalizeResult = {
  orders: Order[];
  skipped: number; // records that could not be parsed
  duplicatesRemoved: number;
};

export function normalizeOrders(raw: unknown): NormalizeResult {
  if (!Array.isArray(raw)) throw new Error('orders.json is not a list of orders');

  const byId = new Map<string, Order>();
  let skipped = 0;
  let duplicatesRemoved = 0;

  for (const item of raw) {
    const order = normalizeOrder(item);
    if (!order) {
      skipped++;
      continue;
    }
    const existing = byId.get(order.id);
    if (existing) {
      duplicatesRemoved++;
      if (shouldReplace(existing, order)) byId.set(order.id, order);
    } else {
      byId.set(order.id, order);
    }
  }

  return { orders: [...byId.values()], skipped, duplicatesRemoved };
}
