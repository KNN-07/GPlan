import type { CatalogQuery, Exercise, GymProfile, Muscle, SwapCandidate } from '../contracts';
import { exerciseById, exercises } from '../catalog';

export function isAvailable(exercise: Exercise, gym: GymProfile): boolean {
  return exercise.equipmentOptions.some(option => option.every(equipment => gym.availableEquipment.includes(equipment)));
}

export function queryExercises(query: CatalogQuery, gym: GymProfile): readonly Exercise[] {
  const text = query.text?.trim().toLowerCase() ?? '';
  return exercises.filter(exercise =>
    (!text || [exercise.name, ...exercise.aliases].some(name => name.toLowerCase().includes(text))) &&
    (!query.muscles?.length || [...exercise.primary, ...exercise.secondary].some(muscle => query.muscles?.includes(muscle))) &&
    (!query.equipment?.length || exercise.equipmentOptions.some(option => option.some(equipment => query.equipment?.includes(equipment)))) &&
    (!query.availableOnly || isAvailable(exercise, gym)),
  );
}

function jaccard(left: readonly Muscle[], right: readonly Muscle[]): number {
  const union = new Set([...left, ...right]);
  return union.size === 0 ? 0 : [...new Set(left)].filter(muscle => right.includes(muscle)).length / union.size;
}

export function findSwaps(exerciseId: string, gym: GymProfile, limit = 10): readonly SwapCandidate[] {
  const original = exerciseById.get(exerciseId);
  if (!original) return [];
  return exercises.filter(exercise => exercise.id !== exerciseId &&
    exercise.primary.some(muscle => original.primary.includes(muscle)) && isAvailable(exercise, gym))
    .map(exercise => {
      const sameMovement = exercise.movement === original.movement;
      return {
        exercise, sameMovement,
        sharedPrimary:exercise.primary.filter(muscle => original.primary.includes(muscle)),
        score:100 * jaccard(original.primary, exercise.primary) + 40 * Number(sameMovement) + 10 * jaccard(original.secondary, exercise.secondary),
      };
    })
    .sort((left, right) => right.score - left.score || (left.exercise.id < right.exercise.id ? -1 : left.exercise.id > right.exercise.id ? 1 : 0))
    .slice(0, Math.max(0, Math.floor(limit)));
}
