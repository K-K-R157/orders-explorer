import { useEffect, useState } from 'react';
import { loadOrders } from './loadOrders';
import type { NormalizeResult } from './normalize';

export type OrdersState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: NormalizeResult };

export function useOrders(): OrdersState {
  const [state, setState] = useState<OrdersState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false; // ignore the result if the component unmounted
    loadOrders()
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
