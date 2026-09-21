import type { AnimationSpec, Exercise } from '../contracts';
import { sampleLowerMotion } from './lowerMotions';
import { sampleUpperMotion } from './upperMotions';
import { sampleCoreMotion } from './coreMotions';

export type Triple = [number, number, number];
export type ArmPose = { readonly shoulder: Triple; readonly elbow: number; readonly wrist?: Triple };
export type LegPose = { readonly hip: number; readonly knee: number; readonly ankle: number; readonly abduction?: number; readonly yaw?: number };
export type MotionPose = {
  readonly position: Triple; readonly rotation: Triple; readonly spine: number;
  readonly spineTwist?: number; readonly stance?: number; readonly neck?: Triple;
  readonly leftArm: ArmPose; readonly rightArm: ArmPose;
  readonly leftLeg: LegPose; readonly rightLeg: LegPose;
};

function unreachable(value: never): never {
  throw new Error(`Unsupported animation metadata: ${value}`);
}

function basePosture(posture: AnimationSpec['posture']): MotionPose {
  const arm: ArmPose = { shoulder: [0, 0, 0], elbow: .12 };
  const leg: LegPose = { hip: 0, knee: 0, ankle: 0 };
  const base: MotionPose = { position: [0, 1.04, 0], rotation: [0, 0, 0], spine: 0, leftArm: arm, rightArm: arm, leftLeg: leg, rightLeg: leg };
  switch (posture) {
    case 'standing': return base;
    case 'seated': return { ...base, position: [0, .65, 0], leftLeg: { ...leg, hip: -1.5, knee: 1.5 }, rightLeg: { ...leg, hip: -1.5, knee: 1.5 } };
    case 'supine': return { ...base, position: [0, .63, 0], rotation: [-Math.PI / 2, 0, 0] };
    case 'prone': return { ...base, position: [0, .63, 0], rotation: [Math.PI / 2, 0, 0] };
    case 'quadruped': return { ...base, position: [0, .7, -.3], rotation: [Math.PI / 2, 0, 0], leftArm: { ...arm, shoulder: [-1.5, 0, 0] }, rightArm: { ...arm, shoulder: [-1.5, 0, 0] }, leftLeg: { ...leg, hip: -1.4, knee: 1.4 }, rightLeg: { ...leg, hip: -1.4, knee: 1.4 } };
    default: return unreachable(posture);
  }
}

/** Catalog-specific mechanics share only the neutral posture, never another exercise's motion. */
export function sampleExerciseMotion(exercise: Exercise, phase: number): MotionPose {
  const base = basePosture(exercise.animation.posture);
  return sampleLowerMotion(exercise, phase, base)
    ?? sampleUpperMotion(exercise, phase, base)
    ?? sampleCoreMotion(exercise, phase, base)
    ?? base;
}

/** Cap suspension delta so returning to the tab never teleports the pose. */
export function advancePhase(phase: number, delta: number, active: boolean): number {
  return active ? (phase + Math.min(Math.max(delta, 0), .1) / 4) % 1 : phase;
}
