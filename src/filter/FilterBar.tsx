import { useEffect, useRef, useState } from 'react';
import { countActiveConditions, pruneIncomplete } from './evaluate';
import { FilterBuilder } from './FilterBuilder';
import { FilterChips } from './FilterChips';
import { EMPTY_FILTER, addGroup, type FilterState } from './model';

type FilterBarProps = {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
};

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('input, select, textarea') !== null;
}

// Row above the grid: "Filter" button, active chips, "Clear all", and the builder dropdown.
export function FilterBar({ filter, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeCount = countActiveConditions(filter);

  const openBuilder = () => {
    if (filter.groups.length === 0) onChange(addGroup(filter)); // start with one empty condition
    setOpen(true);
  };

  const closeBuilder = (returnFocus = true) => {
    setOpen(false);
    onChange(pruneIncomplete(filter)); // unfinished conditions don't linger
    if (returnFocus) buttonRef.current?.focus();
  };

  // "/" opens the filter from anywhere (a common shortcut in keyboard-heavy tools).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !open && !isTyping(e.target)) {
        e.preventDefault();
        if (filter.groups.length === 0) onChange(addGroup(filter));
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, filter, onChange]);

  // Clicking outside the bar closes the builder.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onChange(pruneIncomplete(filter));
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, filter, onChange]);

  return (
    <div
      ref={barRef}
      className="relative flex min-h-9 shrink-0 items-center gap-2 border-b border-slate-300 px-3 py-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          closeBuilder();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Filter orders ( / )"
        onClick={() => (open ? closeBuilder(false) : openBuilder())}
        className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded border px-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
          open || activeCount > 0
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <FunnelIcon />
        Filter
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 text-xs leading-4 text-white">{activeCount}</span>
        )}
        <kbd className="ml-0.5 rounded border border-slate-300 bg-white px-1 font-sans text-[11px] leading-4 text-slate-500">
          /
        </kbd>
      </button>

      {activeCount === 0 ? (
        <span className="text-slate-400">No filters applied</span>
      ) : (
        <>
          <FilterChips filter={filter} onChange={onChange} onEdit={openBuilder} />
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Clear all
          </button>
        </>
      )}

      {open && <FilterBuilder filter={filter} onChange={onChange} onClose={() => closeBuilder()} />}
    </div>
  );
}

function FunnelIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 3h12l-4.5 5.5V13l-3 1.5v-6z" strokeLinejoin="round" />
    </svg>
  );
}
