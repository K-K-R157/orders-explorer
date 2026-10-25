import { memo, useRef, type CSSProperties } from 'react';
import type { Order, Status } from '../data/types';
import { COLUMNS, type Column } from './columns';
import { nextSort, type SortState } from './sort';
import { useVirtualRows } from './useVirtualRows';

const ROW_HEIGHT = 28;

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

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

type DataGridProps = {
  rows: readonly Order[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
};

export function DataGrid({ rows, sort, onSortChange }: DataGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end, totalHeight } = useVirtualRows(scrollRef, rows.length, ROW_HEIGHT);

  // Column widths live in CSS variables shared by header and rows,
  // so they always line up (and resizing later only touches one place).
  const gridStyle = {
    '--grid-template': COLUMNS.map((c) => `${c.width}px`).join(' '),
    '--grid-width': `${COLUMNS.reduce((sum, c) => sum + c.width, 0)}px`,
  } as CSSProperties;

  const visibleRows = [];
  for (let i = start; i < end; i++) {
    visibleRows.push(<GridRow key={rows[i].id} order={rows[i]} index={i} />);
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
      aria-colcount={COLUMNS.length}
    >
      <div
        className="sticky top-0 z-20 grid h-[30px] w-(--grid-width) grid-cols-(--grid-template) border-b border-slate-300 bg-slate-50 leading-[30px] font-semibold text-slate-600"
        role="row"
        aria-rowindex={1}
      >
        {COLUMNS.map((col) => {
          const dir = sort?.key === col.key ? sort.dir : null;
          return (
            <div
              key={col.key}
              role="columnheader"
              aria-sort={dir ? ARIA_SORT[dir] : 'none'}
              className="border-r border-slate-200"
            >
              {/* A real button, so sorting also works from the keyboard. */}
              <button
                type="button"
                onClick={() => onSortChange(nextSort(sort, col.key))}
                title={`Sort by ${col.label}`}
                className={`flex h-full w-full cursor-pointer items-center gap-1 px-2 font-semibold hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
                  col.align === 'right' ? 'flex-row-reverse' : ''
                } ${dir ? 'text-slate-900' : ''}`}
              >
                <span className="truncate">{col.label}</span>
                <span className="w-2.5 shrink-0 text-[10px] text-blue-600" aria-hidden="true">
                  {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : ''}
                </span>
              </button>
            </div>
          );
        })}
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
};

// memo: while scrolling, rows that stay on screen are not re-rendered.
const GridRow = memo(function GridRow({ order, index }: GridRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      className={`absolute top-0 left-0 grid h-7 w-(--grid-width) grid-cols-(--grid-template) border-b border-slate-100 leading-6.75 hover:bg-blue-50 ${
        index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
      }`}
      style={{ transform: `translateY(${index * ROW_HEIGHT}px)` }}
    >
      {COLUMNS.map((col) => {
        const value = col.format(order);
        return (
          <div
            key={col.key}
            role="gridcell"
            className={`${CELL} ${ALIGN[col.align]}`}
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
