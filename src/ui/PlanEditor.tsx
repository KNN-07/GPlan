import { useState } from "react";
import type { Exercise, WorkoutDay, WorkoutItem, WorkoutPlan } from "../contracts";
import { exerciseById } from "../catalog";
import { findSwaps, isAvailable } from "../core/catalog";
import { replaceExercise } from "../core/planner";
import { Dialog, Field, Icon, label, MuscleMap } from "./primitives";
import type { Planner } from "./usePlanner";

import { ItemEditor } from "./ItemEditor";

export function PlanEditor({
  planner,
  onCreate,
  onBrowse,
  onDetail,
  onAi,
}: {
  readonly planner: Planner;
  readonly onCreate: () => void;
  readonly onBrowse: () => void;
  readonly onDetail: (exercise: Exercise) => void;
  readonly onAi: () => void;
}) {
  const [swap, setSwap] = useState<WorkoutItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const plan = planner.state.plans.find((p) => p.id === planner.state.activePlanId) ?? planner.state.plans[0];
  const day = plan?.days.find((d) => d.id === planner.dayId) ?? plan?.days[0];
  function changePlan(next: WorkoutPlan) {
    planner.putPlan({ ...next, updatedAt: new Date().toISOString() });
  }
  function changeDay(next: WorkoutDay) {
    if (plan) changePlan({ ...plan, days: plan.days.map((d) => (d.id === next.id ? next : d)) });
  }
  return (
    <section className="plan-page">
      <div className="page-heading">
        <p className="eyebrow">YOUR PERSONAL TRAINING JOURNAL</p>
        <h1>
          Show up.
          <br />
          Make it yours.
        </h1>
        <p>A routine that moves with you. Saved on this device.</p>
      </div>
      <div className="page-actions">
        <button className="button primary" onClick={onCreate}>
          <Icon name="plus" />
          New plan
        </button>
        <button className="button" onClick={onAi}>
          Plan with AI <span aria-hidden="true">↗</span>
        </button>
      </div>
      {!plan ? (
        <div className="empty-state plan-empty">
          <MuscleMap primary={["chest", "quads"]} large />
          <p className="eyebrow">A FRESH PAGE</p>
          <h2>Your first session starts here.</h2>
          <p>
            Build a balanced local plan or choose your own movements.
            <br />
            No account or connection needed.
          </p>
          <button className="button" onClick={onBrowse}>
            Explore exercises <Icon name="arrow" />
          </button>
        </div>
      ) : (
        <>
          <div className="plan-toolbar">
            <Field title="Your saved plans">
              <select
                aria-label="Your saved plans"
                value={plan.id}
                onChange={(e) => {
                  planner.update((state) => ({ ...state, activePlanId: e.target.value }));
                  planner.setDayId("");
                }}
              >
                {planner.state.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <span className="source-tag">
              {plan.source} · {plan.days.length} days
            </span>
            <button className="text-button danger" onClick={() => setDeleting(true)}>
              Delete plan
            </button>
          </div>
          <Field title="Plan name">
            <input
              aria-label="Plan name"
              className="editable-plan-name"
              value={plan.name}
              onChange={(e) => {
                if (e.target.value.trim()) changePlan({ ...plan, name: e.target.value });
              }}
            />
          </Field>
          <div className="day-tabs" aria-label="Training days">
            {plan.days.map((d, i) => (
              <button
                key={d.id}
                className="day-tab"
                aria-pressed={d.id === day?.id}
                onClick={() => planner.setDayId(d.id)}
              >
                <span>SESSION {String(i + 1).padStart(2, "0")}</span>
                <strong>{d.name}</strong>
                <span>{d.items.length} movements</span>
              </button>
            ))}
          </div>
          {day && (
            <>
              <div className="day-heading">
                <Field title="Day name">
                  <input
                    aria-label="Day name"
                    value={day.name}
                    onChange={(e) => {
                      if (e.target.value.trim()) changeDay({ ...day, name: e.target.value });
                    }}
                  />
                </Field>
                <span>{day.items.reduce((sum, item) => sum + item.sets, 0)} total sets</span>
              </div>
              <div className="plan-items">
                {day.items.map((item, index) => {
                  const exercise = exerciseById.get(item.exerciseId);
                  return (
                    exercise && (
                      <ItemEditor
                        key={item.id}
                        item={item}
                        exercise={exercise}
                        index={index}
                        total={day.items.length}
                        available={isAvailable(exercise, planner.state.gym)}
                        onDetail={() => onDetail(exercise)}
                        onSwap={() => setSwap(item)}
                        onRemove={() => changeDay({ ...day, items: day.items.filter((i) => i.id !== item.id) })}
                        onChange={(next) =>
                          changeDay({ ...day, items: day.items.map((i) => (i.id === next.id ? next : i)) })
                        }
                        onMove={(direction) => {
                          const items = [...day.items];
                          items.splice(index, 1);
                          items.splice(index + direction, 0, item);
                          changeDay({ ...day, items });
                        }}
                      />
                    )
                  );
                })}
              </div>
              {!day.items.length && (
                <p className="empty-state">A blank session. Add the movements you want to work on.</p>
              )}
            </>
          )}
          <button className="button add-movement" onClick={onBrowse}>
            <Icon name="plus" />
            Add a movement
          </button>
        </>
      )}
      {swap && plan && day && (
        <Dialog title="A different way to get there." onClose={() => setSwap(null)}>
          <p className="muted">
            Alternatives to <strong>{exerciseById.get(swap.exerciseId)?.name}</strong>, ranked by shared muscles and
            movement. Only equipment available in your gym.
          </p>
          <div className="swap-list">
            {findSwaps(swap.exerciseId, planner.state.gym).map((candidate) => (
              <button
                className="swap-option"
                key={candidate.exercise.id}
                onClick={() => {
                  planner.putPlan(
                    replaceExercise(plan, day.id, swap.id, candidate.exercise.id, new Date().toISOString()),
                  );
                  setSwap(null);
                }}
              >
                <MuscleMap primary={candidate.exercise.primary} />
                <span>
                  <strong>{candidate.exercise.name}</strong>
                  <small>
                    Shared: {candidate.sharedPrimary.map(label).join(", ")}
                    {candidate.sameMovement ? " · Same movement" : " · Different movement"}
                  </small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          {!findSwaps(swap.exerciseId, planner.state.gym).length && (
            <p className="empty-state">No suitable swaps with your current equipment. Update your gym in Settings.</p>
          )}
        </Dialog>
      )}
      {deleting && plan && (
        <Dialog title="Delete this plan?" onClose={() => setDeleting(false)}>
          <p>
            <strong>{plan.name}</strong> will be removed from this device. Export a backup in Settings if you want to
            keep a copy.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setDeleting(false)}>
              Keep plan
            </button>
            <button
              className="button destructive"
              onClick={() => {
                planner.update((state) => {
                  const plans = state.plans.filter((p) => p.id !== plan.id);
                  return { ...state, plans, activePlanId: plans[0]?.id ?? null };
                });
                setDeleting(false);
              }}
            >
              Delete permanently
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
