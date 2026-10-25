import { memo, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Order, Status } from '../data/types';
import { COLUMNS, type Column } from './columns';
import { HeaderCell, PINNED_CELL } from './HeaderCell';
import { nextSort, type SortState } from './sort';
import { useVirtualRows } from './useVirtualRows';

const ROW_HEIGHT = 28;
const MIN_COLUMN_WIDTH = 50;

type ColumnKey = keyof Order;
type Widths = Record<ColumnKey, number>;

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Widths;

// Shared cell look: single line, cut long text with "…".
const CELL = 'truncate border-r border-slate-200 px-2';

const ALIGN: Record<Column['align'], string> = {
  left: 'text-left',
  right: 'text-right tabular-nums',
};

// Written out in full so Tailwind can find these class names.
const STATUS_DOT: Record<Status, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  shipped: 'bg-violet-500',
  delivered: 'bg-emerald-600',
  cancelled: 'bg-red-600',
};

type DataGridProps = {
  rows: readonly Order[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pinned: ColumnKey | null;
  onPinnedChange: (pinned: ColumnKey | null) => void;
};

export function DataGrid({ rows, sort, onSortChange, pinned, onPinnedChange }: DataGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end, totalHeight } = useVirtualRows(scrollRef, rows.length, ROW_HEIGHT);
  const [widths, setWidths] = useState<Widths>(DEFAULT_WIDTHS);

  // The pinned column is moved to the front, then made sticky on the left.
  // Kept stable with useMemo so resizing doesn't force every row to re-render.
  const columns = useMemo(() => {
    const pinnedColumn = COLUMNS.find((c) => c.key === pinned);
    return pinnedColumn ? [pinnedColumn, ...COLUMNS.filter((c) => c !== pinnedColumn)] : COLUMNS;
  }, [pinned]);

  const setWidth = (key: ColumnKey, width: number) =>
    setWidths((prev) => ({ ...prev, [key]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) }));

  // Column widths live in CSS variables shared by header and rows, so they always
  // line up. Resizing only changes these variables; row contents stay untouched.
  const gridStyle = {
    '--grid-template': columns.map((c) => `${widths[c.key]}px`).join(' '),
    '--grid-width': `${columns.reduce((sum, c) => sum + widths[c.key], 0)}px`,
  } as CSSProperties;

  const visibleRows = [];
  for (let i = start; i < end; i++) {
    visibleRows.push(
      <GridRow key={rows[i].id} order={rows[i]} index={i} columns={columns} pinned={pinned} />,
    );
  }

  return (
    // The grid is its own scroll container: the sticky header lives inside it,
    // so header and rows scroll sideways together.
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-auto"
      style={gridStyle}
      role="grid"
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length}
    >
      <div
        className="sticky top-0 z-20 grid h-[30px] w-(--grid-width) grid-cols-(--grid-template) border-b border-slate-300 bg-slate-50 leading-[30px] font-semibold text-slate-600"
        role="row"
        aria-rowindex={1}
      >
        {columns.map((col) => (
          <HeaderCell
            key={col.key}
            column={col}
            width={widths[col.key]}
            sortDir={sort?.key === col.key ? sort.dir : null}
            pinned={pinned === col.key}
            onSort={() => onSortChange(nextSort(sort, col.key))}
            onTogglePin={() => onPinnedChange(pinned === col.key ? null : col.key)}
            onResize={(w) => setWidth(col.key, w)}
            onResetWidth={() => setWidth(col.key, DEFAULT_WIDTHS[col.key])}
          />
        ))}
      </div>
      <div className="relative w-(--grid-width)" style={{ height: totalHeight }}>
        {visibleRows}
      </div>
    </div>
  );
}

type GridRowProps = {
  order: Order;
  index: number;
  columns: Column[];
  pinned: ColumnKey | null;
};

// memo: while scrolling or resizing, rows whose props didn't change are not re-rendered.
const GridRow = memo(function GridRow({ order, index, columns, pinned }: GridRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      // Row colours are opaque so the sticky pinned cell (bg-inherit) hides what scrolls under it.
      className={`absolute top-0 left-0 grid h-7 w-(--grid-width) grid-cols-(--grid-template) border-b border-slate-100 leading-6.75 hover:bg-blue-50 ${
        index % 2 === 1 ? 'bg-slate-50' : 'bg-white'
      }`}
      style={{ transform: `translateY(${index * ROW_HEIGHT}px)` }}
    >
      {columns.map((col) => {
        const value = col.format(order);
        return (
          <div
            key={col.key}
            role="gridcell"
            className={`${CELL} ${ALIGN[col.align]} ${pinned === col.key ? `${PINNED_CELL} bg-inherit` : ''}`}
            // Full value on hover for truncated text. React renders it as plain text, never HTML.
            title={col.type === 'text' ? value : undefined}
          >
            {col.key === 'status' && (
              <span
                className={`mr-1.5 inline-block size-1.75 rounded-full align-[1px] ${STATUS_DOT[order.status]}`}
                aria-hidden="true"
              />
            )}
            {value}
          </div>
        );
      })}
    </div>
  );
});
