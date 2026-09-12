import { useRef, useState } from "react";
import type { Exercise, PlannerState, WorkoutPlan } from "../contracts";
import { defaultState, loadState, saveState } from "../core/storage";

export const context = () => ({ now: new Date().toISOString(), newId: () => crypto.randomUUID() });
function selectExistingPlan(state: PlannerState): PlannerState {
  return { ...state, activePlanId: state.activePlanId ?? state.plans[0]?.id ?? null };
}
export function usePlanner() {
  const [loaded] = useState(loadState);
  const [state, setState] = useState<PlannerState>(() => selectExistingPlan(loaded.ok ? loaded.value : structuredClone(defaultState)));
  const current = useRef(state);
  const [error, setError] = useState(loaded.ok ? "" : loaded.error.message);
  const [notice, setNotice] = useState("");
  const [dayId, setDayId] = useState("");
  function update(change: (previous: PlannerState) => PlannerState) {
    const next = selectExistingPlan(change(current.current));
    const saved = saveState(next);
    current.current = next;
    setState(next);
    setError(saved.ok ? "" : `${saved.error.message} Changes are in memory only; export a backup.`);
    return saved.ok;
  }
  function putPlan(plan: WorkoutPlan) {
    update((previous) => ({
      ...previous,
      plans: [...previous.plans.filter((p) => p.id !== plan.id), plan],
      activePlanId: plan.id,
    }));
  }
  function addExercise(exercise: Exercise) {
    const now = context();
    const previous = current.current;
    const plan = previous.plans.find((p) => p.id === previous.activePlanId);
    const item = {
      id: now.newId(),
      exerciseId: exercise.id,
      sets: 3,
      restSeconds: 90,
      prescription:
        exercise.prescription === "time"
          ? { kind: "time" as const, seconds: 30 }
          : { kind: "reps" as const, min: 8, max: 12 },
    };
    if (!plan || !plan.days.length) {
      const day = { id: now.newId(), name: "Day 1", items: [item] };
      putPlan(
        plan
          ? { ...plan, days: [day], updatedAt: now.now }
          : {
              id: now.newId(),
              name: "My training plan",
              days: [day],
              source: "manual",
              createdAt: now.now,
              updatedAt: now.now,
            },
      );
      setDayId(day.id);
    } else {
      const target = plan.days.find((day) => day.id === dayId) ?? plan.days[0];
      putPlan({
        ...plan,
        updatedAt: now.now,
        days: plan.days.map((day) => (day.id === target.id ? { ...day, items: [...day.items, item] } : day)),
      });
    }
    setNotice(`${exercise.name} added to your plan.`);
  }
  return { state, update, putPlan, addExercise, error, notice, setNotice, dayId, setDayId };
}
export type Planner = ReturnType<typeof usePlanner>;
