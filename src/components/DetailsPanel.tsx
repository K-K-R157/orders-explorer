import { Fragment } from 'react';
import type { Order } from '../data/types';
import { COLUMNS } from '../grid/columns';

type DetailsPanelProps = {
  order: Order;
  onClose: () => void;
};

// Side panel with every field of one order, untruncated.
// Values are rendered as plain text, so HTML in notes is shown, never executed.
export function DetailsPanel({ order, onClose }: DetailsPanelProps) {
  return (
    <aside
      aria-label={`Details for order ${order.id}`}
      className="flex w-80 shrink-0 flex-col border-l border-slate-300 bg-white"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex h-[30px] shrink-0 items-center justify-between border-b border-slate-300 bg-slate-50 pr-1 pl-3">
        <h2 className="font-semibold">{order.id}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
          className="cursor-pointer rounded px-1.5 text-base leading-6 text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          ×
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1.5 overflow-auto p-3">
        {COLUMNS.filter((col) => col.key !== 'id').map((col) => (
          <Fragment key={col.key}>
            <dt className="text-slate-500">{col.label}</dt>
            <dd
              className={`min-w-0 wrap-anywhere ${col.align === 'right' ? 'tabular-nums' : ''} ${
                col.key === 'notes' ? 'whitespace-pre-wrap' : ''
              }`}
            >
              {col.format(order) || '—'}
            </dd>
          </Fragment>
        ))}
      </dl>
      <p className="mt-auto border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        ↑ ↓ to move between orders · Esc to close
      </p>
    </aside>
  );
}
