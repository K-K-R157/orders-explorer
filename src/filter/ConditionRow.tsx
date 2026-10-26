import {
  FILTER_FIELDS,
  OPERATORS,
  changeField,
  getField,
  type Condition,
  type FieldKey,
  type Operator,
} from './model';

export const INPUT =
  'h-7 rounded border border-slate-300 bg-white px-1.5 text-[13px] focus:border-blue-600 focus:outline-1 focus:outline-blue-600';

type ConditionRowProps = {
  condition: Condition;
  autoFocus: boolean;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
};

export function ConditionRow({ condition, autoFocus, onChange, onRemove }: ConditionRowProps) {
  const field = getField(condition.field);
  const set = (patch: Partial<Condition>) => onChange({ ...condition, ...patch });

  return (
    <div className="flex items-start gap-1.5">
      <select
        aria-label="Field"
        className={`${INPUT} w-32 shrink-0`}
        value={condition.field}
        autoFocus={autoFocus}
        onChange={(e) => onChange(changeField(condition, e.target.value as FieldKey))}
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      {field.kind === 'enum' ? (
        <span className="w-32 shrink-0 px-1.5 leading-7 text-slate-500">is one of</span>
      ) : (
        <select
          aria-label="Operator"
          className={`${INPUT} w-32 shrink-0`}
          value={condition.op}
          onChange={(e) => set({ op: e.target.value as Operator })}
        >
          {OPERATORS[field.kind].map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {/* Takes the remaining width; long option lists wrap inside it, so × stays on the row. */}
      <div className="min-w-0 flex-1">
        <ValueInput condition={condition} onChange={set} />
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove condition"
        title="Remove condition"
        className="shrink-0 cursor-pointer rounded px-1.5 text-base leading-6 text-slate-400 hover:bg-slate-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        ×
      </button>
    </div>
  );
}

type ValueInputProps = {
  condition: Condition;
  onChange: (patch: Partial<Condition>) => void;
};

// The input matches the field type: text box, number box(es), date picker(s), or option toggles.
function ValueInput({ condition, onChange }: ValueInputProps) {
  const field = getField(condition.field);

  if (field.kind === 'enum') {
    const toggle = (value: string) =>
      onChange({
        values: condition.values.includes(value)
          ? condition.values.filter((v) => v !== value)
          : [...condition.values, value],
      });
    return (
      <div role="group" aria-label={`${field.label} values`} className="flex flex-wrap gap-1">
        {field.options.map((o) => {
          const on = condition.values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={`h-7 cursor-pointer rounded border px-2 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                on
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  const type = field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text';
  const width = field.kind === 'text' ? 'w-48' : 'w-32';
  const between = condition.op === 'between';

  return (
    <div className="flex items-center gap-1.5">
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        aria-label={between ? 'From' : 'Value'}
        placeholder={field.kind === 'text' ? 'Type to filter…' : undefined}
        className={`${INPUT} ${width}`}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
      />
      {between && (
        <>
          <span className="text-slate-500">and</span>
          <input
            type={type}
            step={type === 'number' ? 'any' : undefined}
            aria-label="To"
            className={`${INPUT} ${width}`}
            value={condition.value2}
            onChange={(e) => onChange({ value2: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
