import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import type { Order, Status } from '../data/types';
import { COLUMNS, type Column } from './columns';
import { HeaderCell, PINNED_CELL } from './HeaderCell';
import {
  addAll,
  addRange,
  countSelected,
  removeAll,
  toggleId,
  type Selection,
} from './selection';
import { nextSort, type SortState } from './sort';
import { useVirtualRows } from './useVirtualRows';

const ROW_HEIGHT = 28;
const MIN_COLUMN_WIDTH = 50;
const SELECT_COLUMN_WIDTH = 32; // matches w-8 / left-8 used for the sticky offsets

type ColumnKey = keyof Order;
type Widths = Record<ColumnKey, number>;

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Widths;

// Shared cell look: single line, cut long text with "…".
const CELL = 'truncate border-r border-slate-200 px-2';

// Checkbox column: always stuck to the far left.
const SELECT_CELL = 'sticky left-0 z-10 flex items-center justify-center border-r border-slate-200';

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
  selected: Selection;
  onSelectedChange: (selected: Selection) => void;
};

export function DataGrid({
  rows,
  sort,
  onSortChange,
  pinned,
  onPinnedChange,
  selected,
  onSelectedChange,
}: DataGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end, totalHeight } = useVirtualRows(scrollRef, rows.length, ROW_HEIGHT);
  const [widths, setWidths] = useState<Widths>(DEFAULT_WIDTHS);
  // Last row clicked without Shift: the starting point for Shift+click ranges.
  const anchorId = useRef<string | null>(null);

  // The pinned column is moved to the front, then made sticky on the left.
  // Kept stable with useMemo so resizing doesn't force every row to re-render.
  const columns = useMemo(() => {
    const pinnedColumn = COLUMNS.find((c) => c.key === pinned);
    return pinnedColumn ? [pinnedColumn, ...COLUMNS.filter((c) => c !== pinnedColumn)] : COLUMNS;
  }, [pinned]);

  const setWidth = (key: ColumnKey, width: number) =>
    setWidths((prev) => ({ ...prev, [key]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) }));

  // Click: select only this row. Ctrl/Cmd+click or checkbox: toggle this row.
  // Shift+click: add every row from the anchor to here.
  const handleRowClick = useCallback(
    (index: number, e: MouseEvent, additive: boolean) => {
      const id = rows[index].id;
      if (e.shiftKey && anchorId.current !== null) {
        const anchorIndex = rows.findIndex((r) => r.id === anchorId.current);
        if (anchorIndex !== -1) {
          onSelectedChange(addRange(selected, rows, anchorIndex, index));
          return;
        }
      }
      if (additive || e.ctrlKey || e.metaKey) onSelectedChange(toggleId(selected, id));
      else onSelectedChange(new Set([id]));
      anchorId.current = id;
    },
    [rows, selected, onSelectedChange],
  );

  const selectedCount = useMemo(() => countSelected(selected, rows), [selected, rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  // Column widths live in CSS variables shared by header and rows, so they always
  // line up. Resizing only changes these variables; row contents stay untouched.
  const gridStyle = {
    '--grid-template': [SELECT_COLUMN_WIDTH, ...columns.map((c) => widths[c.key])]
      .map((w) => `${w}px`)
      .join(' '),
    '--grid-width': `${columns.reduce((sum, c) => sum + widths[c.key], SELECT_COLUMN_WIDTH)}px`,
  } as CSSProperties;

  const visibleRows = [];
  for (let i = start; i < end; i++) {
    visibleRows.push(
      <GridRow
        key={rows[i].id}
        order={rows[i]}
        index={i}
        columns={columns}
        pinned={pinned}
        selected={selected.has(rows[i].id)}
        onClick={handleRowClick}
      />,
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
      aria-multiselectable="true"
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length + 1}
    >
      <div
        className="sticky top-0 z-20 grid h-[30px] w-(--grid-width) grid-cols-(--grid-template) border-b border-slate-300 bg-slate-50 leading-[30px] font-semibold text-slate-600"
        role="row"
        aria-rowindex={1}
      >
        <div role="columnheader" className={`${SELECT_CELL} bg-slate-50`}>
          <input
            type="checkbox"
            aria-label={allSelected ? 'Unselect all rows' : 'Select all rows'}
            title={allSelected ? 'Unselect all rows' : 'Select all rows'}
            className="cursor-pointer accent-blue-600"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selectedCount > 0 && !allSelected;
            }}
            onChange={() =>
              onSelectedChange(allSelected ? removeAll(selected, rows) : addAll(selected, rows))
            }
          />
        </div>
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
  selected: boolean;
  onClick: (index: number, e: MouseEvent, additive: boolean) => void;
};

// memo: while scrolling or resizing, rows whose props didn't change are not re-rendered.
const GridRow = memo(function GridRow({
  order,
  index,
  columns,
  pinned,
  selected,
  onClick,
}: GridRowProps) {
  // Row colours are opaque so sticky cells (bg-inherit) hide what scrolls under them.
  const background = selected
    ? 'bg-blue-100'
    : `${index % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50`;

  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      className={`absolute top-0 left-0 grid h-7 w-(--grid-width) cursor-default grid-cols-(--grid-template) border-b border-slate-100 leading-6.75 ${background}`}
      style={{ transform: `translateY(${index * ROW_HEIGHT}px)` }}
      onMouseDown={(e) => {
        if (e.shiftKey) e.preventDefault(); // stop Shift+click from selecting page text
      }}
      onClick={(e) => onClick(index, e, false)}
    >
      <div role="gridcell" className={`${SELECT_CELL} bg-inherit`}>
        <input
          type="checkbox"
          tabIndex={-1}
          aria-label={`Select ${order.id}`}
          className="cursor-pointer accent-blue-600"
          checked={selected}
          readOnly
          onClick={(e) => {
            e.stopPropagation(); // handled here, not by the row
            onClick(index, e, true);
          }}
        />
      </div>
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
