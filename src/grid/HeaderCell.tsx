import type { Column } from './columns';
import { ResizeHandle } from './ResizeHandle';
import type { SortDir } from './sort';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

// Sticks just right of the checkbox column (w-8 = 32px). The shadow shows it floats above the others.
export const PINNED_CELL = 'sticky left-8 z-10 shadow-[2px_0_4px_-2px_rgb(0_0_0/0.2)]';

type HeaderCellProps = {
  column: Column;
  width: number;
  sortDir: SortDir | null;
  pinned: boolean;
  onSort: () => void;
  onTogglePin: () => void;
  onResize: (width: number) => void;
  onResetWidth: () => void;
};

export function HeaderCell({
  column,
  width,
  sortDir,
  pinned,
  onSort,
  onTogglePin,
  onResize,
  onResetWidth,
}: HeaderCellProps) {
  return (
    <div
      role="columnheader"
      aria-sort={sortDir ? ARIA_SORT[sortDir] : 'none'}
      className={`group relative flex border-r border-slate-200 bg-slate-50 ${pinned ? PINNED_CELL : ''}`}
    >
      {/* Real buttons, so sorting and pinning also work from the keyboard. */}
      <button
        type="button"
        onClick={onSort}
        title={`Sort by ${column.label}`}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1 pl-2 font-semibold ${pinned ? 'pr-6' : 'pr-2'} hover:text-slate-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
          column.align === 'right' ? 'flex-row-reverse' : ''
        } ${sortDir ? 'text-slate-900' : ''}`}
      >
        <span className="truncate">{column.label}</span>
        <span className="w-2.5 shrink-0 text-[10px] text-blue-600" aria-hidden="true">
          {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${column.label}` : `Pin ${column.label}`}
        title={pinned ? 'Unpin column' : 'Pin column to the left'}
        // Overlaid on the right of the header (not in the flow) so it takes no room until shown.
        className={`absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded bg-slate-50 p-0.5 hover:bg-slate-200 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-600 ${
          pinned ? 'text-red-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'
        }`}
      >
        <PinIcon filled={pinned} />
      </button>
      <ResizeHandle
        label={column.label}
        width={width}
        onResize={onResize}
        onReset={onResetWidth}
      />
    </div>
  );
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 1.5h4l-.5 4 2.5 3H4l2.5-3z" strokeLinejoin="round" />
      <path d="M8 8.5v6" strokeLinecap="round" />
    </svg>
  );
}
