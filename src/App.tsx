import { TopBar } from './components/TopBar';
import { useOrders } from './data/useOrders';
import { OrdersExplorer } from './OrdersExplorer';

// Loads the data; the explorer mounts once orders exist, so it can check the
// link (selected / opened order IDs) against real orders.
function App() {
  const state = useOrders();

  if (state.kind === 'ready') return <OrdersExplorer orders={state.data.orders} />;

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      {state.kind === 'loading' ? (
        <p className="px-3 py-6 text-slate-500">Loading orders…</p>
      ) : (
        <p className="px-3 py-6 text-red-700" role="alert">
          Could not load orders: {state.message}
        </p>
      )}
    </div>
  );
}

export default App;
