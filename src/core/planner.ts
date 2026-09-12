import { z } from 'zod';
import type { AiPlanDraft, CreationContext, Exercise, Muscle, PlanRequest, Prescription, Result, WorkoutPlan } from '../contracts';
import { exerciseById, exercises } from '../catalog';
import { equipment, muscles } from '../catalog/taxonomy';
import { isAvailable } from './catalog';

const requestSchema = z.object({
  name:z.string().trim().min(1),
  daysPerWeek:z.number().int().min(1).max(7),
  exercisesPerDay:z.number().int().positive(),
  focus:z.array(z.enum(muscles)),
  experience:z.enum(['beginner','intermediate','advanced']),
  gym:z.object({ availableEquipment:z.array(z.enum(equipment)) }),
});
const difficulty = { beginner:0, intermediate:1, advanced:2 } as const;

function defaultPrescription(kind: Exercise['prescription']): Prescription {
  switch (kind) {
    case 'reps': return { kind:'reps', min:8, max:12 };
    case 'time': return { kind:'time', seconds:30 };
    default: return kind satisfies never;
  }
}

export function createLocalPlan(request: PlanRequest, context: CreationContext): Result<WorkoutPlan> {
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return { ok:false, error:{ code:'invalid-request', message:'Choose a name, 1-7 days, a positive exercise count, and valid training preferences.' } };
  const input = parsed.data;
  const candidates = exercises.filter(exercise => isAvailable(exercise, input.gym) &&
    difficulty[exercise.difficulty] <= difficulty[input.experience] &&
    (!input.focus.length || exercise.primary.some(muscle => input.focus.includes(muscle))));
  if (candidates.length < input.exercisesPerDay) {
    return { ok:false, error:{ code:'insufficient-options', message:`Only ${candidates.length} suitable exercises are available; ${input.exercisesPerDay} are requested per day. Reduce the count, broaden the focus, or add equipment.` } };
  }
  // These accumulators deliberately track weekly use so equivalent variants rotate between days.
  const weeklyUse = new Map<string, number>();
  const weeklyPrimaryUse = new Map<Muscle, number>();
  const days = Array.from({ length:input.daysPerWeek }, (_, dayIndex) => {
    const primaryUse = new Map<Muscle, number>();
    const movementUse = new Map<Exercise['movement'], number>();
    const selected: Exercise[] = [];
    const rank = (exercise: Exercise) =>
      exercise.primary.reduce((total, muscle) => total + (primaryUse.get(muscle) ?? 0) * 100 + (weeklyPrimaryUse.get(muscle) ?? 0) * 20, 0) / exercise.primary.length +
      (movementUse.get(exercise.movement) ?? 0) * 40 + (weeklyUse.get(exercise.id) ?? 0) * 10;
    for (let index = 0; index < input.exercisesPerDay; index += 1) {
      const chosen = candidates.filter(exercise => !selected.includes(exercise))
        .reduce((best, candidate) => {
          const difference = rank(candidate) - rank(best);
          return difference < 0 || (difference === 0 && candidate.id < best.id) ? candidate : best;
        });
      selected.push(chosen);
      chosen.primary.forEach(muscle => {
        primaryUse.set(muscle, (primaryUse.get(muscle) ?? 0) + 1);
        weeklyPrimaryUse.set(muscle, (weeklyPrimaryUse.get(muscle) ?? 0) + 1);
      });
      movementUse.set(chosen.movement, (movementUse.get(chosen.movement) ?? 0) + 1);
      weeklyUse.set(chosen.id, (weeklyUse.get(chosen.id) ?? 0) + 1);
    }
    return { id:context.newId(), name:`Day ${dayIndex + 1}`, items:selected.map(exercise => ({
      id:context.newId(), exerciseId:exercise.id, sets:3,
      prescription:defaultPrescription(exercise.prescription), restSeconds:90,
    })) };
  });
  return { ok:true, value:{ id:context.newId(), name:input.name, days, createdAt:context.now, updatedAt:context.now, source:'local' } };
}

/** The AI provider boundary has already validated the draft. */
export function materializeAiPlan(draft: AiPlanDraft, context: CreationContext): WorkoutPlan {
  return {
    id:context.newId(), name:draft.name, source:'ai', createdAt:context.now, updatedAt:context.now,
    days:draft.days.map(day => ({ id:context.newId(), name:day.name, items:day.items.map(item => ({
      ...item, id:context.newId(), prescription:{ ...item.prescription },
    })) })),
  };
}

// Five parameters are the frozen shared API, not a local design choice.
export function replaceExercise(plan: WorkoutPlan, dayId: string, itemId: string, replacementId: string, now: string): WorkoutPlan {
  const replacement = exerciseById.get(replacementId);
  const day = plan.days.find(candidate => candidate.id === dayId);
  const item = day?.items.find(candidate => candidate.id === itemId);
  if (!replacement || !day || !item || item.exerciseId === replacementId) return plan;
  return { ...plan, updatedAt:now, days:plan.days.map(candidate => candidate === day ? {
    ...day, items:day.items.map(candidateItem => candidateItem === item ? {
      ...item, exerciseId:replacementId,
      prescription:item.prescription.kind === replacement.prescription ? { ...item.prescription } : defaultPrescription(replacement.prescription),
    } : candidateItem),
  } : candidate) };
}
