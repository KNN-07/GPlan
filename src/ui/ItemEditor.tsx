import type { Exercise, WorkoutItem } from "../contracts";
import { Field, Icon, label, MuscleMap } from "./primitives";

function NumberField({
  title,
  value,
  onChange,
  min = 1,
}: {
  readonly title: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
}) {
  return (
    <Field title={title}>
      <input
        aria-label={title}
        type="number"
        min={min}
        max={3600}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isInteger(next) && next >= min && next <= 3600) onChange(next);
        }}
      />
    </Field>
  );
}
export function ItemEditor({
  item,
  exercise,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onSwap,
  onDetail,
  available,
}: {
  readonly item: WorkoutItem;
  readonly exercise: Exercise;
  readonly index: number;
  readonly total: number;
  readonly onChange: (item: WorkoutItem) => void;
  readonly onMove: (direction: number) => void;
  readonly onRemove: () => void;
  readonly onSwap: () => void;
  readonly onDetail: () => void;
  readonly available: boolean;
}) {
  return (
    <article className="plan-item">
      <div className="plan-item-heading">
        <span className="item-order">{String(index + 1).padStart(2, "0")}</span>
        <MuscleMap primary={exercise.primary} />
        <div>
          <p className="eyebrow">{exercise.primary.map(label).join(" / ")}</p>
          <button className="exercise-name" onClick={onDetail}>
            {exercise.name}
          </button>
          {!available && (
            <p className="unavailable-label">Equipment unavailable in your gym · swap or update Settings</p>
          )}
        </div>
      </div>
      <div className="prescription-fields">
        <NumberField title="Sets" value={item.sets} onChange={(sets) => onChange({ ...item, sets })} />
        {item.prescription.kind === "reps" ? (
          <>
            <NumberField
              title="Min reps"
              value={item.prescription.min}
              onChange={(min) => {
                if (item.prescription.kind === "reps")
                  onChange({ ...item, prescription: { kind: "reps", min, max: Math.max(min, item.prescription.max) } });
              }}
            />
            <NumberField
              title="Max reps"
              value={item.prescription.max}
              onChange={(max) => {
                if (item.prescription.kind === "reps")
                  onChange({ ...item, prescription: { kind: "reps", min: Math.min(max, item.prescription.min), max } });
              }}
            />
          </>
        ) : (
          <NumberField
            title="Time (sec)"
            value={item.prescription.seconds}
            onChange={(seconds) => onChange({ ...item, prescription: { kind: "time", seconds } })}
          />
        )}
        <NumberField
          title="Rest (sec)"
          min={0}
          value={item.restSeconds}
          onChange={(restSeconds) => onChange({ ...item, restSeconds })}
        />
      </div>
      <div className="plan-item-actions">
        <button className="text-button" onClick={onSwap}>
          <Icon name="swap" size={16} />
          Swap exercise
        </button>
        <div>
          <button
            className="icon-button"
            aria-label={`Move ${exercise.name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            className="icon-button"
            aria-label={`Move ${exercise.name} down`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button className="text-button danger" onClick={onRemove} aria-label={`Remove ${exercise.name}`}>
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
