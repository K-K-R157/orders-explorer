import { useOrders } from './data/useOrders';
import { DataGrid } from './grid/DataGrid';
import { formatCount } from './lib/format';

function App() {
  const state = useOrders();

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-10 shrink-0 items-center gap-4 border-b border-slate-300 px-3">
        <h1 className="text-sm font-semibold">Orders Explorer</h1>
        {state.kind === 'ready' && (
          <span className="text-slate-500 tabular-nums">
            {formatCount(state.data.orders.length)} orders
          </span>
        )}
      </header>

      {state.kind === 'loading' && <p className="px-3 py-6 text-slate-500">Loading orders…</p>}
      {state.kind === 'error' && (
        <p className="px-3 py-6 text-red-700" role="alert">
          Could not load orders: {state.message}
        </p>
      )}
      {state.kind === 'ready' && <DataGrid rows={state.data.orders} />}
    </div>
  );
}

export default App;
