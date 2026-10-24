import { normalizeOrders, type NormalizeResult } from './normalize';

// orders.json lives in public/ so it is fetched at runtime instead of being
// bundled into the JavaScript (17 MB would make the app bundle huge).
export async function loadOrders(): Promise<NormalizeResult> {
  const res = await fetch('/orders.json');
  if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
  return normalizeOrders(await res.json());
}
