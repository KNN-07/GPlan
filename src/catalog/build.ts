import type { AnimationSpec, Equipment, Exercise } from '../contracts';

type ExerciseProfile = Readonly<Pick<Exercise, 'primary'|'secondary'|'movement'|'prescription'>> & {
  readonly animation: AnimationSpec;
  readonly cues: readonly [string, string];
};
type ExerciseRow = readonly [name:string, equipment:Equipment[][], setup:string, overrides?:Partial<Pick<Exercise, 'difficulty'|'primary'|'secondary'|'aliases'|'animation'|'movement'>>];

/** Rows share only the biomechanics of their family; setup describes the actual variant. */
export function defineExercises(profile: ExerciseProfile, rows: readonly ExerciseRow[]): Exercise[] {
  return rows.map(([name, equipmentOptions, setup, overrides]) => ({
    id:name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
    name, aliases:[], primary:[...profile.primary], secondary:[...profile.secondary],
    movement:profile.movement, prescription:profile.prescription, equipmentOptions,
    difficulty:'beginner', instructions:[setup, ...profile.cues],
    animation:{ ...profile.animation }, ...overrides,
  }));
}

export function animation(family: AnimationSpec['family'], posture: AnimationSpec['posture'], prop: AnimationSpec['prop'] = 'none'): AnimationSpec {
  return { family, posture, prop, unilateral:false };
}
