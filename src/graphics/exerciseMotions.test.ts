import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Vector3 } from 'three';
import { exercises, exerciseById } from '../catalog';
import { sampleExerciseMotion } from './motions';
import type { MotionPose, Triple } from './motions';

function values(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(values);
  return [];
}
function pose(id: string, phase: number) {
  const exercise = exerciseById.get(id);
  if (!exercise) throw new Error(`Missing exercise ${id}`);
  return sampleExerciseMotion(exercise, phase);
}

function landmarks(p: MotionPose) {
  const transform = (position: Triple, rotation: Triple = [0, 0, 0]) =>
    new Matrix4().makeRotationFromEuler(new Euler(...rotation)).setPosition(...position);
  const root = transform(p.position, p.rotation);
  const spine = root.clone().multiply(transform([0, .09, 0], [p.spine, p.spineTwist ?? 0, 0]));
  const head = spine.clone().multiply(transform([0, .46, 0], p.neck ?? [0, 0, 0]));
  const points: Record<string, Vector3> = { head: new Vector3(0, .38, 0).applyMatrix4(head) };
  for (const [side, sign] of [['left', -1], ['right', 1]] as const) {
    const arm = side === 'left' ? p.leftArm : p.rightArm;
    const leg = side === 'left' ? p.leftLeg : p.rightLeg;
    const shoulder = spine.clone().multiply(transform([sign * .34, .46, 0], arm.shoulder));
    const elbow = shoulder.multiply(transform([0, -.34, 0], [-arm.elbow, 0, 0]));
    const hip = root.clone().multiply(transform([sign * (p.stance ?? .145), -.08, 0], [leg.hip, leg.yaw ?? 0, leg.abduction ?? 0]));
    const knee = hip.multiply(transform([0, -.46, 0], [leg.knee, 0, 0]));
    points[`${side}Hand`] = new Vector3(0, -.34, 0).applyMatrix4(elbow);
    points[`${side}Knee`] = new Vector3().applyMatrix4(knee);
    const ankle = knee.multiply(transform([0, -.43, 0], [leg.ankle, 0, 0]));
    points[`${side}Ankle`] = new Vector3().applyMatrix4(ankle);
    points[`${side}Toe`] = new Vector3(0, -.025, .21).applyMatrix4(ankle);
  }
  return points;
}

describe('exercise limb roles', () => {
  it('alternating curls work one arm at a time on opposite half cycles', () => {
    const first = pose('alternating-dumbbell-curl', .25);
    const second = pose('alternating-dumbbell-curl', .75);
    expect(first.leftArm.elbow).toBeGreaterThan(2);
    expect(first.rightArm.elbow).toBeLessThan(.2);
    expect(second.rightArm.elbow).toBeGreaterThan(2);
    expect(second.leftArm.elbow).toBeLessThan(.2);
  });

  it('single-leg extension straightens only the working knee', () => {
    const start = pose('single-leg-extension', 0);
    const end = pose('single-leg-extension', .5);
    expect(end.leftLeg.knee).toBeLessThan(.2);
    expect(end.rightLeg).toEqual(start.rightLeg);
    expect(end.leftArm).toEqual(start.leftArm);
    expect(end.rightArm).toEqual(start.rightArm);
  });
});

describe('catalog exercise motion', () => {
  it.each(exercises)('$name stays finite and continuous across the repetition seam', exercise => {
    const start = sampleExerciseMotion(exercise, 0);
    expect(sampleExerciseMotion(exercise, 1)).toEqual(start);
    const before = values(sampleExerciseMotion(exercise, 1 - 1e-7));
    const after = values(sampleExerciseMotion(exercise, 1e-7));
    expect(Math.max(...before.map((n, i) => Math.abs(n - after[i]!)))).toBeLessThan(.0001);
    for (const phase of [-100.25, 0, .125, .25, .5, .75, 100.25]) {
      expect(values(sampleExerciseMotion(exercise, phase)).every(Number.isFinite)).toBe(true);
    }
  });

  it.each(exercises)('$name keeps its head and limb endpoints above the floor', exercise => {
    for (let frame = 0; frame <= 16; frame++) {
      for (const [joint, point] of Object.entries(landmarks(sampleExerciseMotion(exercise, frame / 16)))) {
        expect(point.y, `${joint} at phase ${frame / 16}`).toBeGreaterThanOrEqual(-.005);
      }
    }
  });

  it.each(['push-up', 'knee-push-up', 'wall-push-up', 'incline-push-up', 'decline-push-up', 'pike-push-up', 'pull-up', 'chin-up', 'inverted-row', 'parallel-bar-dip'])('%s keeps both hands on its support while the body moves', id => {
    const initial = landmarks(pose(id, 0));
    for (const phase of [.125, .25, .375, .5, .75]) {
      const current = landmarks(pose(id, phase));
      expect(current.leftHand!.distanceTo(initial.leftHand!)).toBeLessThan(.003);
      expect(current.rightHand!.distanceTo(initial.rightHand!)).toBeLessThan(.003);
    }
  });

  it.each(['barbell-deadlift', 'sumo-deadlift'])('%s returns the plates to the floor', id => {
    const bottom = landmarks(pose(id, .5));
    expect(bottom.leftHand!.y).toBeCloseTo(.23, 1);
    expect(bottom.rightHand!.y).toBeCloseTo(.23, 1);
  });

  it.each(exercises.filter(exercise => exercise.prescription === 'reps'))('$name demonstrates movement rather than a static placeholder', exercise => {
    const start = sampleExerciseMotion(exercise, 0);
    expect([.125, .25, .5, .75].some(phase => JSON.stringify(sampleExerciseMotion(exercise, phase)) !== JSON.stringify(start))).toBe(true);
  });

  it.each(exercises.filter(exercise => exercise.prescription === 'time'))('$name holds its isometric position', exercise => {
    expect(sampleExerciseMotion(exercise, .5)).toEqual(sampleExerciseMotion(exercise, 0));
  });

  it('pushdowns extend beside the torso instead of overhead', () => {
    const start = pose('cable-triceps-pushdown', 0);
    const end = pose('cable-triceps-pushdown', .5);
    expect(Math.abs(end.leftArm.shoulder[0])).toBeLessThan(.5);
    expect(end.leftArm.elbow).toBeLessThan(start.leftArm.elbow);
    expect(Math.abs(pose('overhead-cable-triceps-extension', .5).leftArm.shoulder[0])).toBeGreaterThan(2);
  });

  it('front raises travel forward while lateral raises travel sideways', () => {
    const front = pose('dumbbell-front-raise', .5).leftArm.shoulder;
    const lateral = pose('dumbbell-lateral-raise', .5).leftArm.shoulder;
    expect(Math.abs(front[0])).toBeGreaterThan(1);
    expect(Math.abs(front[2])).toBeLessThan(.4);
    expect(Math.abs(lateral[2])).toBeGreaterThan(1);
  });

  it('hip isolation moves legs rather than shoulders', () => {
    for (const id of ['seated-hip-adduction', 'cable-hip-adduction', 'seated-hip-abduction', 'cable-hip-abduction', 'side-lying-hip-abduction']) {
      const start = pose(id, 0);
      const end = pose(id, .5);
      expect(end.leftArm).toEqual(start.leftArm);
      expect([end.leftLeg, end.rightLeg]).not.toEqual([start.leftLeg, start.rightLeg]);
      expect(end.rightArm).toEqual(start.rightArm);
    }
  });
});
