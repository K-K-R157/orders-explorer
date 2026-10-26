import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { DetailsPanel } from './components/DetailsPanel';
import { EmptyState } from './components/EmptyState';
import type { Order } from './data/types';
import { useOrders } from './data/useOrders';
import { compileFilter } from './filter/evaluate';
import { FilterBar } from './filter/FilterBar';
import { EMPTY_FILTER, type FilterState } from './filter/model';
import { DataGrid, type DataGridHandle } from './grid/DataGrid';
import { EMPTY_SELECTION, countSelected, type Selection } from './grid/selection';
import { sortOrders, type SortState } from './grid/sort';
import { formatCount } from './lib/format';

const NO_ORDERS: readonly Order[] = [];             

function App() {
  const state = useOrders();
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortState>(null);
  // Order ID is pinned by default so each row stays identifiable while scrolling sideways.
  const [pinned, setPinned] = useState<keyof Order | null>('id');
  const [selected, setSelected] = useState<Selection>(EMPTY_SELECTION);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const gridRef = useRef<DataGridHandle>(null);

  const orders = state.kind === 'ready' ? state.data.orders : NO_ORDERS;

  // Sort once, then filter the sorted list (filtering keeps order), so editing a
  // filter never re-sorts. The deferred filter lets inputs update immediately while
  // the 50k-row pass runs right after, so typing doesn't lag.
  const deferredFilter = useDeferredValue(filter);
  const sortedRows = useMemo(() => sortOrders(orders, sort), [orders, sort]);
  const predicate = useMemo(() => compileFilter(deferredFilter), [deferredFilter]);
  const visibleRows = useMemo(
    () => (predicate ? sortedRows.filter(predicate) : sortedRows),
    [sortedRows, predicate],
  );

  // Selection is kept for hidden rows, but only visible selected rows count
  // (and will be exported), so the number on screen always matches the export.
  const selectedVisible = useMemo(() => countSelected(selected, visibleRows), [selected, visibleRows]);
  const selectedHidden = selected.size - selectedVisible;

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
          <span className="text-slate-500 tabular-nums" aria-live="polite">
            {predicate ? (
              <>
                <strong className="font-semibold text-slate-900">{formatCount(visibleRows.length)}</strong> of{' '}
                {formatCount(orders.length)} orders
              </>
            ) : (
              `${formatCount(orders.length)} orders`
            )}
          </span>
        )}
        {selected.size > 0 && (
          <span className="flex items-center gap-2 tabular-nums">
            <span className="font-medium text-blue-700">{formatCount(selectedVisible)} selected</span>
            {selectedHidden > 0 && (
              <span
                className="text-slate-500"
                title="These rows are still selected but hidden by the filter. They are not counted or exported."
              >
                ({formatCount(selectedHidden)} hidden by filter)
              </span>
            )}
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
        <>
          <FilterBar filter={filter} onChange={setFilter} />
          <main className="flex min-h-0 flex-1">
            <div className="relative flex min-w-0 flex-1">
              <DataGrid
                ref={gridRef}
                rows={visibleRows}
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
              {visibleRows.length === 0 && <EmptyState onClearFilters={() => setFilter(EMPTY_FILTER)} />}
            </div>
            {detailsOrder && <DetailsPanel order={detailsOrder} onClose={closeDetails} />}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
