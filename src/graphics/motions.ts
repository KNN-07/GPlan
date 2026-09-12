import type { AnimationSpec, Movement } from '../contracts';

export const motionFamilies = ['squat', 'hinge', 'lunge', 'horizontal-press', 'vertical-press', 'horizontal-pull', 'vertical-pull', 'curl', 'extension', 'raise', 'calf-raise', 'crunch', 'leg-curl', 'static'] as const;
export type Triple = [number, number, number];
export type ArmPose = { readonly shoulder: Triple; readonly elbow: number };
export type LegPose = { readonly hip: number; readonly knee: number; readonly ankle: number };
export type MotionPose = {
  readonly position: Triple; readonly rotation: Triple; readonly spine: number;
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

/** Phase is a cycle, not radians. Every family has a cosine-eased closed loop. */
export function sampleMotion(spec: AnimationSpec, phase: number, movement?: Movement): MotionPose {
  const base = basePosture(spec.posture);
  const cycle = ((phase % 1) + 1) % 1;
  const q = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  const r = spec.unilateral ? 0 : q;
  // These local accumulators describe articulation, not mutations of input metadata.
  let leftArm = base.leftArm;
  let rightArm = base.rightArm;
  let leftLeg = base.leftLeg;
  let rightLeg = base.rightLeg;
  let spine = 0;
  let lift = 0;
  switch (spec.family) {
    case 'squat':
      leftLeg = { hip: -q, knee: 1.85 * q, ankle: -.35 * q };
      rightLeg = { hip: -r, knee: 1.85 * r, ankle: -.35 * r };
      spine = .32 * q; lift = -.36 * q;
      leftArm = { shoulder: [-.8, 0, 0], elbow: .6 };
      rightArm = leftArm;
      switch (spec.posture) {
        case 'seated':
          leftLeg = { ...base.leftLeg, knee: 1.5 - 1.44 * q };
          rightLeg = { ...base.rightLeg, knee: 1.5 - 1.44 * r };
          leftArm = base.leftArm; rightArm = base.rightArm; spine = 0; lift = 0;
          break;
        case 'standing': case 'supine': case 'prone': case 'quadruped': break;
        default: return unreachable(spec.posture);
      }
      break;
    case 'hinge':
      spine = .9 * q; lift = -.12 * q;
      leftLeg = { ...leftLeg, hip: -.25 * q, knee: .4 * q };
      rightLeg = spec.unilateral ? { hip: .9 * q, knee: .12 * q, ankle: 0 } : leftLeg;
      leftArm = { shoulder: [-.8 * q, 0, 0], elbow: .08 };
      rightArm = leftArm;
      break;
    case 'lunge':
      leftLeg = { hip: -.85 * q, knee: 1.4 * q, ankle: -.3 * q };
      rightLeg = { hip: .65 * q, knee: .75 * q, ankle: -.4 * q };
      lift = -.24 * q; spine = .08 * q;
      break;
    case 'horizontal-press':
      leftArm = { shoulder: [-1.15 - .38 * q, 0, -.45 * (1 - q)], elbow: 1.4 * (1 - q) + .08 };
      rightArm = { shoulder: [-1.15 - .38 * r, 0, .45 * (1 - r)], elbow: 1.4 * (1 - r) + .08 };
      break;
    case 'vertical-press':
      leftArm = { shoulder: [-1.4 - 1.55 * q, 0, -.28], elbow: 1.45 * (1 - q) + .1 };
      rightArm = { shoulder: [-1.4 - 1.55 * r, 0, .28], elbow: 1.45 * (1 - r) + .1 };
      break;
    case 'horizontal-pull':
      leftArm = { shoulder: [-1.45 + 1.45 * q, 0, -.12], elbow: 1.35 * q + .1 };
      rightArm = { shoulder: [-1.45 + 1.45 * r, 0, .12], elbow: 1.35 * r + .1 };
      spine = .08 * q;
      break;
    case 'vertical-pull':
      leftArm = { shoulder: [-2.9 + 1.65 * q, 0, -.25], elbow: 1.55 * q + .1 };
      rightArm = { shoulder: [-2.9 + 1.65 * r, 0, .25], elbow: 1.55 * r + .1 };
      break;
    case 'curl':
      leftArm = { shoulder: [-.08, 0, -.08], elbow: .12 + 2.1 * q };
      rightArm = { shoulder: [-.08, 0, .08], elbow: .12 + 2.1 * r };
      break;
    case 'extension':
      // The catalog intentionally shares this family between knee and elbow extension.
      switch (movement) {
        case 'knee-extension':
          leftLeg = { ...leftLeg, knee: 1.5 * (1 - q) + .06 };
          rightLeg = { ...rightLeg, knee: 1.5 * (1 - r) + .06 };
          break;
        default:
          leftArm = { shoulder: [-2.85, 0, -.1], elbow: 1.9 * (1 - q) + .12 };
          rightArm = { shoulder: [-2.85, 0, .1], elbow: 1.9 * (1 - r) + .12 };
      }
      break;
    case 'raise':
      switch (movement) {
        case 'hip-isolation':
          return base;
        default:
          leftArm = { shoulder: [0, 0, -1.35 * q - .06], elbow: .16 };
          rightArm = { shoulder: [0, 0, 1.35 * r + .06], elbow: .16 };
      }
      break;
    case 'calf-raise':
      lift = .13 * q;
      leftLeg = { ...leftLeg, ankle: .42 * q };
      rightLeg = { ...rightLeg, ankle: .42 * r };
      break;
    case 'crunch':
      spine = .45 * q;
      leftLeg = { hip: -.8, knee: 1.5, ankle: 0 }; rightLeg = leftLeg;
      leftArm = { shoulder: [-2.2, 0, -.5], elbow: 2 }; rightArm = { shoulder: [-2.2, 0, .5], elbow: 2 };
      break;
    case 'leg-curl':
      leftLeg = { ...leftLeg, knee: leftLeg.knee + 1.5 * q };
      rightLeg = { ...rightLeg, knee: rightLeg.knee + 1.5 * r };
      break;
    case 'static': return base;
    default: return unreachable(spec.family);
  }
  return { ...base, position: [base.position[0], base.position[1] + lift, base.position[2]], spine, leftArm, rightArm, leftLeg, rightLeg };
}

/** Cap suspension delta so returning to the tab never teleports the pose. */
export function advancePhase(phase: number, delta: number, active: boolean): number {
  return active ? (phase + Math.min(Math.max(delta, 0), .1) / 4) % 1 : phase;
}
