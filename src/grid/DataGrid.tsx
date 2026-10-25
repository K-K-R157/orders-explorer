import {
  memo,
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import type { Order, Status } from '../data/types';
import { COLUMNS, type Column } from './columns';
import { HeaderCell, PINNED_CELL } from './HeaderCell';
import { moveFocus, type CellPos } from './keyboard';
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
const HEADER_HEIGHT = 30;
const MIN_COLUMN_WIDTH = 50;
const SELECT_COLUMN_WIDTH = 32; // matches w-8 / left-8 used for the sticky offsets

type ColumnKey = keyof Order;
type Widths = Record<ColumnKey, number>;

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, c.width])) as Widths;

// Shared cell look: single line, cut long text with "…".
const CELL = 'truncate border-r border-slate-200 px-2';

// Checkbox column: always stuck to the far left.
const SELECT_CELL = 'sticky left-0 z-10 flex items-center justify-center border-r border-slate-200';

// Focused cell: strong ring while the grid has focus, faint ring otherwise.
const FOCUS_RING_ACTIVE = 'outline-2 -outline-offset-2 outline-blue-600';
const FOCUS_RING_IDLE = 'outline-1 -outline-offset-1 outline-slate-400';

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

export type DataGridHandle = { focus: () => void };

type DataGridProps = {
  ref?: Ref<DataGridHandle>;
  rows: readonly Order[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pinned: ColumnKey | null;
  onPinnedChange: (pinned: ColumnKey | null) => void;
  selected: Selection;
  onSelectedChange: (selected: Selection) => void;
  detailsOpen: boolean;
  onOpenDetails: (order: Order) => void;
  onCloseDetails: () => void;
};

export function DataGrid({
  ref,
  rows,
  sort,
  onSortChange,
  pinned,
  onPinnedChange,
  selected,
  onSelectedChange,
  detailsOpen,
  onOpenDetails,
  onCloseDetails,
}: DataGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end, totalHeight } = useVirtualRows(scrollRef, rows.length, ROW_HEIGHT);
  const [widths, setWidths] = useState<Widths>(DEFAULT_WIDTHS);
  const [focus, setFocus] = useState<CellPos>({ row: 0, col: 0 });
  const [gridFocused, setGridFocused] = useState(false);
  // Last row clicked without Shift: the starting point for Shift ranges.
  const anchorId = useRef<string | null>(null);
  const idPrefix = useId();

  useImperativeHandle(ref, () => ({ focus: () => scrollRef.current?.focus() }), []);

  // The pinned column is moved to the front, then made sticky on the left.
  // Kept stable with useMemo so resizing doesn't force every row to re-render.
  const columns = useMemo(() => {
    const pinnedColumn = COLUMNS.find((c) => c.key === pinned);
    return pinnedColumn ? [pinnedColumn, ...COLUMNS.filter((c) => c !== pinnedColumn)] : COLUMNS;
  }, [pinned]);

  // Keep focus inside the grid if the row count shrinks (e.g. after filtering).
  const focusRow = Math.min(focus.row, rows.length - 1); // -1 when there are no rows
  const focusCol = Math.min(focus.col, columns.length - 1);

  const setWidth = (key: ColumnKey, width: number) =>
    setWidths((prev) => ({ ...prev, [key]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) }));

  // Click: select only this row. Ctrl/Cmd+click or checkbox: toggle this row.
  // Shift+click: add every row from the anchor to here. Clicking also moves cell focus.
  const handleRowClick = useCallback(
    (index: number, e: MouseEvent, additive: boolean) => {
      const colAttr = (e.target as HTMLElement).closest('[data-col]')?.getAttribute('data-col');
      setFocus((prev) => ({ row: index, col: colAttr ? Number(colAttr) : prev.col }));

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

  const handleRowOpen = useCallback((index: number) => onOpenDetails(rows[index]), [rows, onOpenDetails]);

  // Scrolls just enough to show the cell, accounting for the sticky header and sticky columns.
  const scrollCellIntoView = (pos: CellPos) => {
    const el = scrollRef.current;
    if (!el) return;

    const rowTop = pos.row * ROW_HEIGHT;
    if (rowTop < el.scrollTop) el.scrollTop = rowTop;
    else if (HEADER_HEIGHT + rowTop + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = HEADER_HEIGHT + rowTop + ROW_HEIGHT - el.clientHeight;
    }

    const column = columns[pos.col];
    if (column.key === pinned) return; // always visible
    let left = SELECT_COLUMN_WIDTH;
    for (let i = 0; i < pos.col; i++) left += widths[columns[i].key];
    const right = left + widths[column.key];
    const stickyWidth = SELECT_COLUMN_WIDTH + (pinned ? widths[pinned] : 0);
    if (left - stickyWidth < el.scrollLeft) el.scrollLeft = left - stickyWidth;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Header buttons (sort/pin) handle their own Enter/Space.
    if ((e.target as HTMLElement).closest('[data-grid-header]')) return;
    if (rows.length === 0) return;

    const current = { row: focusRow, col: focusCol };
    const order = rows[current.row];

    if (e.key === 'Enter') {
      e.preventDefault();
      onOpenDetails(order);
      return;
    }
    if (e.key === ' ') {
      e.preventDefault(); // don't scroll the page
      onSelectedChange(toggleId(selected, order.id));
      anchorId.current = order.id;
      return;
    }
    if (e.key === 'Escape') {
      if (detailsOpen) {
        e.preventDefault();
        onCloseDetails();
      }
      return;
    }
    if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); // instead of selecting all page text
      onSelectedChange(addAll(selected, rows));
      return;
    }

    const el = scrollRef.current;
    const pageSize = el ? Math.max(1, Math.floor((el.clientHeight - HEADER_HEIGHT) / ROW_HEIGHT) - 1) : 10;
    const next = moveFocus(current, e.key, {
      rowCount: rows.length,
      colCount: columns.length,
      pageSize,
      jump: e.ctrlKey || e.metaKey,
    });
    if (!next) return;

    e.preventDefault();
    setFocus(next);
    scrollCellIntoView(next);

    if (next.row !== current.row) {
      // Shift+↑/↓ extends the selection from the anchor, like Shift+click.
      if (e.shiftKey) {
        if (anchorId.current === null) anchorId.current = order.id;
        const anchorIndex = rows.findIndex((r) => r.id === anchorId.current);
        onSelectedChange(addRange(selected, rows, anchorIndex === -1 ? current.row : anchorIndex, next.row));
      }
      // While the details panel is open it follows the focused row.
      if (detailsOpen) onOpenDetails(rows[next.row]);
    }
  };

  const selectedCount = useMemo(() => countSelected(selected, rows), [selected, rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;

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
    const isFocusRow = i === focusRow;
    visibleRows.push(
      <GridRow
        key={rows[i].id}
        order={rows[i]}
        index={i}
        columns={columns}
        pinned={pinned}
        selected={selected.has(rows[i].id)}
        // Only the focused row gets focus props, so moving focus re-renders just two rows.
        focusedCol={isFocusRow ? focusCol : null}
        focusActive={isFocusRow && gridFocused}
        focusedCellId={isFocusRow ? cellId(i, focusCol) : undefined}
        onClick={handleRowClick}
        onOpen={handleRowOpen}
      />,
    );
  }

  return (
    // The grid is its own scroll container: the sticky header lives inside it,
    // so header and rows scroll sideways together. It's a single Tab stop;
    // aria-activedescendant tells screen readers which cell is focused.
    <div
      ref={scrollRef}
      tabIndex={0}
      className="relative min-h-0 min-w-0 flex-1 overflow-auto outline-none"
      style={gridStyle}
      role="grid"
      aria-label="Orders"
      aria-multiselectable="true"
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length + 1}
      aria-activedescendant={focusRow >= 0 ? cellId(focusRow, focusCol) : undefined}
      onKeyDown={handleKeyDown}
      onFocus={() => setGridFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setGridFocused(false);
      }}
    >
      <div
        data-grid-header
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
  focusedCol: number | null;
  focusActive: boolean;
  focusedCellId: string | undefined;
  onClick: (index: number, e: MouseEvent, additive: boolean) => void;
  onOpen: (index: number) => void;
};

// memo: while scrolling or resizing, rows whose props didn't change are not re-rendered.
const GridRow = memo(function GridRow({
  order,
  index,
  columns,
  pinned,
  selected,
  focusedCol,
  focusActive,
  focusedCellId,
  onClick,
  onOpen,
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
      onDoubleClick={() => onOpen(index)}
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
      {columns.map((col, c) => {
        const value = col.format(order);
        const isFocused = focusedCol === c;
        const ring = isFocused ? (focusActive ? FOCUS_RING_ACTIVE : FOCUS_RING_IDLE) : '';
        return (
          <div
            key={col.key}
            id={isFocused ? focusedCellId : undefined}
            data-col={c}
            role="gridcell"
            className={`${CELL} ${ALIGN[col.align]} ${pinned === col.key ? `${PINNED_CELL} bg-inherit` : ''} ${ring}`}
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
