import { Fragment } from 'react';
import { describeCondition } from './describe';
import { pruneIncomplete } from './evaluate';
import { removeCondition, type FilterState } from './model';

type FilterChipsProps = {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  onEdit: () => void;
};

// The active filter as small removable chips. OR-ed chips share a dashed outline;
// groups are joined with "and", mirroring the builder.
export function FilterChips({ filter, onChange, onEdit }: FilterChipsProps) {
  const groups = pruneIncomplete(filter).groups;

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {groups.map((group, gi) => (
        <Fragment key={group.id}>
          {gi > 0 && (
            <li className="text-xs font-semibold text-slate-400 uppercase" aria-hidden="true">
              and
            </li>
          )}
          <li
            className={`flex items-center gap-1 ${
              group.conditions.length > 1 ? 'rounded-full border border-dashed border-slate-300 p-0.5' : ''
            }`}
          >
            {group.conditions.map((condition, ci) => {
              const text = describeCondition(condition);
              return (
                <Fragment key={condition.id}>
                  {ci > 0 && <span className="text-xs text-slate-400">or</span>}
                  <span className="inline-flex h-6 items-center rounded-full border border-blue-200 bg-blue-50 text-blue-900">
                    <button
                      type="button"
                      onClick={onEdit}
                      title={`${text} (click to edit)`}
                      className="max-w-64 cursor-pointer truncate rounded-l-full pr-1 pl-2.5 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      {text}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(removeCondition(filter, condition.id))}
                      aria-label={`Remove filter: ${text}`}
                      title="Remove"
                      className="h-full cursor-pointer rounded-r-full pr-2 pl-1 text-blue-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      ×
                    </button>
                  </span>
                </Fragment>
              );
            })}
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
