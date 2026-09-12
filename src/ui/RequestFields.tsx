import type { PlanRequest } from "../contracts";
import { muscles } from "../catalog/taxonomy";
import { Field, label } from "./primitives";

export function RequestFields({
  request,
  onChange,
}: {
  readonly request: PlanRequest;
  readonly onChange: (request: PlanRequest) => void;
}) {
  return (
    <div className="request-fields">
      <Field title="Plan name">
        <input
          required
          aria-label="Plan name"
          maxLength={100}
          value={request.name}
          onChange={(e) => onChange({ ...request, name: e.target.value })}
        />
      </Field>
      <div className="form-row">
        <Field title="Days per week">
          <select
            value={request.daysPerWeek}
            onChange={(e) => onChange({ ...request, daysPerWeek: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field title="Exercises per day">
          <select
            value={request.exercisesPerDay}
            onChange={(e) => onChange({ ...request, exercisesPerDay: Number(e.target.value) })}
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field title="Training experience">
        <select
          value={request.experience}
          onChange={(e) => {
            const experience = e.target.value;
            if (experience === "beginner" || experience === "intermediate" || experience === "advanced")
              onChange({ ...request, experience });
          }}
        >
          <option value="beginner">Beginner · building the basics</option>
          <option value="intermediate">Intermediate · finding your rhythm</option>
          <option value="advanced">Advanced · refining your training</option>
        </select>
      </Field>
      <fieldset>
        <legend>
          Muscle focus <span className="muted">· none selected means full body</span>
        </legend>
        <div className="wrapped-chips">
          {muscles.map((muscle) => (
            <button
              type="button"
              className="chip"
              key={muscle}
              aria-pressed={request.focus.includes(muscle)}
              onClick={() =>
                onChange({
                  ...request,
                  focus: request.focus.includes(muscle)
                    ? request.focus.filter((m) => m !== muscle)
                    : [...request.focus, muscle],
                })
              }
            >
              {label(muscle)}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
