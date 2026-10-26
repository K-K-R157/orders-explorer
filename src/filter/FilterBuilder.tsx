import { Fragment, useState } from 'react';
import { ConditionRow } from './ConditionRow';
import {
  addCondition,
  addGroup,
  newCondition,
  newGroup,
  removeCondition,
  removeGroup,
  updateCondition,
  type FilterState,
} from './model';

type FilterBuilderProps = {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  onClose: () => void;
};

const ADD_BUTTON =
  'cursor-pointer rounded px-1.5 py-0.5 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600';

// Panel for editing the filter: groups (AND) of conditions (OR). Changes apply live.
export function FilterBuilder({ filter, onChange, onClose }: FilterBuilderProps) {
  // The condition just added gets keyboard focus, so you can keep typing.
  const [focusId, setFocusId] = useState<string | null>(
    () => filter.groups[0]?.conditions[0]?.id ?? null,
  );

  const addOrCondition = (groupId: string) => {
    const condition = newCondition();
    setFocusId(condition.id);
    onChange(addCondition(filter, groupId, condition));
  };

  const addAndGroup = () => {
    const group = newGroup();
    setFocusId(group.conditions[0].id);
    onChange(addGroup(filter, group));
  };

  return (
    <div
      role="dialog"
      aria-label="Filter builder"
      className="absolute top-full left-3 z-40 mt-1 flex max-h-[70vh] w-190 max-w-[calc(100vw-1.5rem)] flex-col rounded-md border border-slate-300 bg-white shadow-lg"
    >
      <div className="flex flex-col gap-2 overflow-auto p-3">
        {filter.groups.length === 0 && (
          <p className="text-slate-500">No filters yet. Add a group to start narrowing down orders.</p>
        )}
        {filter.groups.map((group, gi) => (
          <Fragment key={group.id}>
            {gi > 0 && <Divider label="and" />}
            <fieldset className="rounded border border-slate-200 bg-slate-50/50 px-2 pt-1 pb-2">
              <legend className="px-1 text-xs text-slate-500">
                Group {gi + 1} · match <strong className="font-semibold">any</strong> of these
              </legend>
              <div className="flex flex-col gap-1">
                {group.conditions.map((condition, ci) => (
                  <Fragment key={condition.id}>
                    {ci > 0 && <span className="pl-1 text-xs font-semibold text-slate-400">or</span>}
                    <ConditionRow
                      condition={condition}
                      autoFocus={condition.id === focusId}
                      onChange={(c) => onChange(updateCondition(filter, group.id, c))}
                      onRemove={() => onChange(removeCondition(filter, condition.id))}
                    />
                  </Fragment>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <button type="button" className={ADD_BUTTON} onClick={() => addOrCondition(group.id)}>
                  + Or condition
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                  onClick={() => onChange(removeGroup(filter, group.id))}
                >
                  Remove group
                </button>
              </div>
            </fieldset>
          </Fragment>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
        <button type="button" className={ADD_BUTTON} onClick={addAndGroup}>
          + And group
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Esc to close</span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 cursor-pointer rounded bg-blue-600 px-3 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
