import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { DetailsPanel } from './components/DetailsPanel';
import { EmptyState } from './components/EmptyState';
import { TopBar } from './components/TopBar';
import { UrlNotice } from './components/UrlNotice';
import type { Order } from './data/types';
import { downloadCsv } from './export/csv';
import { compileFilter } from './filter/evaluate';
import { FilterBar } from './filter/FilterBar';
import { EMPTY_FILTER, type FieldKey, type FilterState } from './filter/model';
import { DataGrid, type DataGridHandle } from './grid/DataGrid';
import { EMPTY_SELECTION, countSelected, type Selection } from './grid/selection';
import { sortOrders, type SortState } from './grid/sort';
import { formatCount } from './lib/format';
import { parseView } from './url/urlState';
import { useUrlSync } from './url/useUrlSync';

type OrdersExplorerProps = {
  orders: readonly Order[];
};

// The main screen: filter bar + grid + details, with all view state mirrored in the URL.
export function OrdersExplorer({ orders }: OrdersExplorerProps) {
  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  // Read the link once on mount. A bad link falls back to the default view with a message.
  const [initial] = useState(() => parseView(window.location.search, ordersById));
  const [urlError, setUrlError] = useState(initial.error);
  const [filter, setFilter] = useState<FilterState>(initial.view.filter);
  const [sort, setSort] = useState<SortState>(initial.view.sort);
  const [pinned, setPinned] = useState<FieldKey | null>(initial.view.pinned);
  const [selected, setSelected] = useState<Selection>(initial.view.selected);
  const [detailsId, setDetailsId] = useState<string | null>(initial.view.detailsId);
  const gridRef = useRef<DataGridHandle>(null);

  useUrlSync({ filter, sort, pinned, selected, detailsId });

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

  // Selection is kept for hidden rows, but only visible selected rows are counted
  // and exported, so the number on screen always matches the CSV.
  const selectedVisible = useMemo(() => countSelected(selected, visibleRows), [selected, visibleRows]);
  const selectedHidden = selected.size - selectedVisible;

  const exportSelected = () => downloadCsv(visibleRows.filter((o) => selected.has(o.id)));

  const detailsOrder = detailsId ? ordersById.get(detailsId) : undefined;
  const openDetails = useCallback((order: Order) => setDetailsId(order.id), []);
  // Return focus to the grid so keyboard users keep their place.
  const closeDetails = useCallback(() => {
    setDetailsId(null);
    gridRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <TopBar>
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
        <button
          type="button"
          onClick={exportSelected}
          disabled={selectedVisible === 0}
          title={selectedVisible === 0 ? 'Select rows to export them' : `Download ${selectedVisible} rows as CSV`}
          className="ml-auto h-7 cursor-pointer rounded border border-slate-300 px-2.5 font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          Export CSV{selectedVisible > 0 && ` (${formatCount(selectedVisible)})`}
        </button>
      </TopBar>

      {urlError && <UrlNotice reason={urlError} onDismiss={() => setUrlError(null)} />}
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
    </div>
  );
}
