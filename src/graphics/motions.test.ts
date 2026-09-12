import { describe, expect, it } from 'vitest';
import type { AnimationSpec } from '../contracts';
import { advancePhase, motionFamilies, sampleMotion } from './motions';

const postures = ['standing', 'seated', 'supine', 'prone', 'quadruped'] as const;
const props = ['none', 'dumbbells', 'barbell', 'cable', 'machine'] as const;
const spec: AnimationSpec = { family: 'squat', posture: 'standing', prop: 'none', unilateral: false };
function numbers(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(numbers);
  return [];
}

describe('procedural motion contract', () => {
  it.each(motionFamilies)('returns deterministic finite bounded transforms for %s across metadata', (family) => {
    // Given every frozen posture/prop/unilateral combination and representative phases.
    const inputs = postures.flatMap(posture => props.flatMap(prop => [false, true].map(unilateral => ({ family, posture, prop, unilateral }))));
    // When sampling each combination.
    const samples = inputs.flatMap(input => [-100.25, 0, .125, .25, .5, .75, 1, 1000000.25].map(phase => ({ input, phase, pose: sampleMotion(input, phase) })));
    // Then all transforms are bounded, deterministic and nonempty.
    for (const { input, phase, pose } of samples) {
      expect(numbers(pose).length).toBeGreaterThan(20);
      expect(numbers(pose).every(n => Number.isFinite(n) && Math.abs(n) <= Math.PI + 1)).toBe(true);
      expect(pose).toEqual(sampleMotion(input, phase));
    }
  });

  it.each(motionFamilies)('closes %s loops continuously including the seam', family => {
    // Given a family, every posture and a small phase epsilon.
    for (const posture of postures) {
      const input = { ...spec, family, posture };
      // When sampling either side of a loop and exact endpoints.
      const before = numbers(sampleMotion(input, 1 - 1e-6));
      const after = numbers(sampleMotion(input, 1e-6));
      // Then the seam is continuous, and phase is periodic.
      expect(sampleMotion(input, 0)).toEqual(sampleMotion(input, 1));
      expect(numbers(sampleMotion(input, .25))).toEqual(numbers(sampleMotion(input, 100.25)));
      expect(Math.max(...before.map((n, index) => Math.abs(n - (after[index] ?? Infinity))))).toBeLessThan(.0001);
    }
  });

  it.each(motionFamilies.filter(family => family !== 'static'))('articulates %s rather than only moving a rigid figure', family => {
    // Given a standing repetition.
    const input = { ...spec, family };
    // When comparing rest and exertion.
    const { position: _p0, rotation: _r0, ...rest } = sampleMotion(input, 0);
    const { position: _p1, rotation: _r1, ...exertion } = sampleMotion(input, .5);
    // Then at least one joint changes.
    expect(exertion).not.toEqual(rest);
  });

  it('holds the right arm when a curl is unilateral', () => {
    // Given unilateral curl metadata.
    const input = { ...spec, family: 'curl', unilateral: true } as const;
    // When sampling a full contraction.
    const pose = sampleMotion(input, .5);
    // Then the active arm flexes and the other rests.
    expect(pose.leftArm.elbow).toBeGreaterThan(1);
    expect(pose.rightArm.elbow).toBeLessThan(.3);
  });

  it('extends the knee rather than the elbow for knee-extension metadata', () => {
    // Given the catalog leg-extension exercise mapped to the shared extension family.
    const input = { ...spec, family: 'extension', posture: 'seated', prop: 'machine' } as const;
    // When the repetition reaches full extension.
    const pose = sampleMotion(input, .5, 'knee-extension');
    // Then the knee straightens while the arms remain at rest.
    expect(pose.leftLeg.knee).toBeLessThan(.2);
    expect(pose.leftArm.elbow).toBeLessThan(.3);
    expect(pose.leftArm.shoulder[0]).toBe(0);
  });

  it.each([false, true])('keeps leg-press hips seated with unilateral=%s', unilateral => {
    // Given the catalog seated leg-press metadata.
    const input = { ...spec, posture: 'seated', prop: 'machine', unilateral } as const;
    // When sampling rest and contraction.
    const poses = [0, .125, .25, .5, .75, 1].map(phase => sampleMotion(input, phase));
    // Then the thighs remain seated and the pelvis stays on the seat.
    for (const pose of poses) {
      expect(pose.leftLeg.hip).toBe(-1.5);
      expect(pose.rightLeg.hip).toBe(-1.5);
      expect(pose.position[1]).toBeCloseTo(.65);
      expect(pose.leftLeg.knee).toBeGreaterThan(0);
      expect(pose.leftLeg.knee).toBeLessThanOrEqual(1.5);
    }
    expect(sampleMotion(input, 0).leftLeg.knee).toBe(1.5);
  });

  it.each(['squat', 'hinge'] as const)('differentiates the supporting leg for unilateral %s', family => {
    // Given unilateral lower-body metadata.
    const input = { ...spec, family, unilateral: true };
    // When sampling contraction.
    const pose = sampleMotion(input, .5);
    // Then the legs have distinct supporting/working roles.
    expect(pose.leftLeg).not.toEqual(pose.rightLeg);
  });

  it.each(postures)('holds unsupported hip-isolation raises as a static %s schematic', posture => {
    // Given a hip-isolation exercise sharing the arm-raise family.
    const input = { ...spec, family: 'raise', posture, unilateral: true } as const;
    const staticPose = sampleMotion({ ...input, family: 'static' }, 0);
    // When sampling the entire repetition, including contraction and the seam.
    const poses = [0, .125, .25, .5, .75, 1].map(phase => sampleMotion(input, phase, 'hip-isolation'));
    // Then all joints retain the static posture rather than implying unsupported motion.
    for (const pose of poses) expect(pose).toEqual(staticPose);
  });

  it('holds static postures across the entire loop', () => {
    // Given static family metadata for every posture.
    const inputs = postures.map(posture => ({ ...spec, family: 'static', posture } as const));
    // When comparing phase samples, then the whole figure holds still.
    for (const input of inputs) expect(sampleMotion(input, .125)).toEqual(sampleMotion(input, .625));
  });

  it('gives each posture a distinct base transform', () => {
    // Given all five postures.
    const inputs = postures.map(posture => ({ ...spec, posture }));
    // When sampling the rest pose.
    const poses = inputs.map(input => JSON.stringify(sampleMotion(input, 0)));
    // Then each posture has a distinct figure configuration.
    expect(new Set(poses).size).toBe(5);
  });
});

describe('playback clock', () => {
  it('preserves phase when inactive', () => {
    // Given a paused, reduced-motion or hidden animation.
    const phase = .37;
    // When time advances, then phase stays frozen.
    expect(advancePhase(phase, 1, false)).toBe(phase);
  });
  it('advances and wraps on the four-second repetition clock', () => {
    // Given a nearly completed loop.
    const phase = .99;
    // When a normal frame advances the clock.
    const next = advancePhase(phase, .08, true);
    // Then it wraps without discontinuity.
    expect(next).toBeCloseTo(.01);
  });
  it('caps a resumed frame delta to avoid jumping after suspension', () => {
    // Given an active loop resumed after a long browser suspension.
    const phase = .2;
    // When the browser supplies a large frame delta.
    const next = advancePhase(phase, 100, true);
    // Then at most .025 of the cycle advances.
    expect(next).toBeCloseTo(.225);
  });
});
