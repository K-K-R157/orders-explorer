import { useCallback, useMemo, useRef, useState } from 'react';
import { DetailsPanel } from './components/DetailsPanel';
import type { Order } from './data/types';
import { useOrders } from './data/useOrders';
import { DataGrid, type DataGridHandle } from './grid/DataGrid';
import { EMPTY_SELECTION, type Selection } from './grid/selection';
import { sortOrders, type SortState } from './grid/sort';
import { formatCount } from './lib/format';

const NO_ORDERS: readonly Order[] = [];

function App() {
  const state = useOrders();
  const [sort, setSort] = useState<SortState>(null);
  // Order ID is pinned by default so each row stays identifiable while scrolling sideways.
  const [pinned, setPinned] = useState<keyof Order | null>('id');
  const [selected, setSelected] = useState<Selection>(EMPTY_SELECTION);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const gridRef = useRef<DataGridHandle>(null);

  const orders = state.kind === 'ready' ? state.data.orders : NO_ORDERS;
  // Only re-sorts when the data or the sort actually changes, not on every render.
  const sortedRows = useMemo(() => sortOrders(orders, sort), [orders, sort]);
  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const detailsOrder = detailsId ? ordersById.get(detailsId) : undefined;

  const openDetails = useCallback((order: Order) => setDetailsId(order.id), []);
  // Return focus to the grid so keyboard users keep their place.
  const closeDetails = useCallback(() => {
    setDetailsId(null);
    gridRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-10 shrink-0 items-center gap-4 border-b border-slate-300 px-3">
        <h1 className="text-sm font-semibold">Orders Explorer</h1>
        {state.kind === 'ready' && (
          <span className="text-slate-500 tabular-nums">{formatCount(orders.length)} orders</span>
        )}
        {selected.size > 0 && (
          <span className="flex items-center gap-2 tabular-nums" aria-live="polite">
            <span className="font-medium text-blue-700">{formatCount(selected.size)} selected</span>
            <button
              type="button"
              onClick={() => setSelected(EMPTY_SELECTION)}
              className="cursor-pointer rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Clear
            </button>
          </span>
        )}
      </header>

      {state.kind === 'loading' && <p className="px-3 py-6 text-slate-500">Loading orders…</p>}
      {state.kind === 'error' && (
        <p className="px-3 py-6 text-red-700" role="alert">
          Could not load orders: {state.message}
        </p>
      )}
      {state.kind === 'ready' && (
        <main className="flex min-h-0 flex-1">
          <DataGrid
            ref={gridRef}
            rows={sortedRows}
            sort={sort}
            onSortChange={setSort}
            pinned={pinned}
            onPinnedChange={setPinned}
            selected={selected}
            onSelectedChange={setSelected}
            detailsOpen={detailsOrder !== undefined}
            onOpenDetails={openDetails}
            onCloseDetails={closeDetails}
          />
          {detailsOrder && <DetailsPanel order={detailsOrder} onClose={closeDetails} />}
        </main>
      )}
    </div>
  );
}

export default App;
