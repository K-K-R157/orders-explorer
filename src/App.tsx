import { useEffect, useState } from 'react';
import { loadOrders } from './data/loadOrders';
import type { NormalizeResult } from './data/normalize';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: NormalizeResult };

function App() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    loadOrders()
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) =>
        setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) }),
      );
  }, []);

  if (state.kind === 'loading') return <p>Loading orders…</p>;
  if (state.kind === 'error') return <p role="alert">Could not load orders: {state.message}</p>;

  const { orders, skipped, duplicatesRemoved } = state.data;
  return (
    <p>
      Loaded {orders.length.toLocaleString('en-IN')} orders ({duplicatesRemoved} duplicates
      removed, {skipped} skipped)
    </p>
  );
}

export default App;
