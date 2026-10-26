type EmptyStateProps = {
  onClearFilters: () => void;
};

// Shown over the grid body (the header stays visible) when the filter matches nothing.
export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[30px] bottom-0 flex items-start justify-center pt-20">
      <div
        role="status"
        className="pointer-events-auto flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-white px-8 py-6 text-center shadow-sm"
      >
        <p className="text-sm font-semibold text-slate-800">No orders match these filters</p>
        <p className="text-slate-500">Remove a filter chip above, or clear them all.</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-3 h-7 cursor-pointer rounded bg-blue-600 px-3 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
