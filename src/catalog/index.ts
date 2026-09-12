import type { Exercise } from '../contracts';
import { armExercises } from './arms';
import { coreExercises } from './core';
import { lowerExercises } from './lower';
import { upperExercises } from './upper';

export const exercises: readonly Exercise[] = [...upperExercises, ...armExercises, ...lowerExercises, ...coreExercises];
export const exerciseById: ReadonlyMap<string, Exercise> = new Map(exercises.map(exercise => [exercise.id, exercise]));
