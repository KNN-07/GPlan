import type { Exercise } from '../contracts';
import type { ArmPose, LegPose, MotionPose, Triple } from './motions';

const halfTurn = Math.PI / 2;
const straight: LegPose = { hip: 0, knee: 0, ankle: 0 };
const resting: ArmPose = { shoulder: [0, 0, 0], elbow: 0 };
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Two-link inverse kinematics: targets are relative to the shoulder. */
function reach(x: number, y: number, z: number): ArmPose {
  const distance = Math.min(.6799, Math.max(.001, Math.hypot(x, y, z)));
  const length = Math.hypot(x, y, z) || 1;
  const dx = x / length, dy = y / length, dz = z / length;
  const along = distance / .68;
  const bend = Math.sqrt(1 - along * along);
  // Bend toward the hips, rather than sending elbows behind the head.
  let bx = dx * dy, by = -1 + dy * dy, bz = dz * dy;
  let bLength = Math.hypot(bx, by, bz);
  if (bLength < .001) { bx = 0; by = -dz; bz = dy; bLength = Math.hypot(by, bz); }
  bx /= bLength; by /= bLength; bz /= bLength;
  const ux = dx * along + bx * bend;
  const uy = dy * along + by * bend;
  const uz = dz * along + bz * bend;
  const wx = dx * bend - bx * along;
  const wy = dy * bend - by * along;
  const wz = dz * bend - bz * along;
  const xx = -uy * wz + uz * wy;
  return { shoulder: [Math.atan2(-wy, wz), Math.asin(clamp(wx)), Math.atan2(ux, xx)], elbow: 2 * Math.acos(along) };
}

function worldHand(position: Triple, rotation: number, spine: number, side: number, target: Triple): ArmPose {
  const dy = target[1] - position[1], dz = target[2] - position[2];
  const y = Math.cos(rotation) * dy + Math.sin(rotation) * dz - .09;
  const z = -Math.sin(rotation) * dy + Math.cos(rotation) * dz;
  return reach(target[0] - position[0] - side * .34, Math.cos(spine) * y + Math.sin(spine) * z - .46, -Math.sin(spine) * y + Math.cos(spine) * z);
}

function foot(position: Triple, rotation: number, y: number, z: number): LegPose {
  const dy = y - position[1] + .08 * Math.cos(rotation);
  const dz = z - position[2] + .08 * Math.sin(rotation);
  const knee = Math.acos(clamp((dy * dy + dz * dz - .46 ** 2 - .43 ** 2) / (.92 * .43)));
  const angle = Math.atan2(-dz, -dy) - Math.atan2(.43 * Math.sin(knee), .46 + .43 * Math.cos(knee));
  return { hip: angle - rotation, knee, ankle: -angle - knee };
}

/** Exercise-specific core mechanics; unrelated catalog entries fall through. */
export function sampleCoreMotion(exercise: Exercise, phase: number, base: MotionPose): MotionPose | undefined {
  const cycle = ((phase % 1) + 1) % 1;
  const q = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  const alternate = Math.sin(cycle * Math.PI * 2);
  const left = Math.max(0, alternate) ** 2;
  const right = Math.max(0, -alternate) ** 2;
  let position: Triple = [0, .18, 0];
  let rotation = -halfTurn;
  let spine = 0;
  let spineTwist = 0;
  let stance = .145;
  let leftArm = resting, rightArm = resting;
  let leftLeg = straight, rightLeg = straight;
  const floorLeg = foot(position, rotation, .09, .59);
  const ears = (side: number): ArmPose => reach(-side * .19, .20, .04);
  switch (exercise.id) {
    case 'crunch':
    case 'dumbbell-crunch':
      spine = .38 * q;
      leftLeg = rightLeg = floorLeg;
      leftArm = exercise.id === 'dumbbell-crunch' ? reach(.25, -.10, .23) : ears(-1);
      rightArm = exercise.id === 'dumbbell-crunch' ? reach(-.25, -.10, .23) : ears(1);
      break;
    case 'reverse-crunch':
      rotation -= .18 * q;
      position = [0, .18 + .07 * q, 0];
      spine = .18 * q;
      leftLeg = rightLeg = { hip: -halfTurn - .20 * q, knee: halfTurn, ankle: 0 };
      leftArm = worldHand(position, rotation, spine, -1, [-.34, .065, .12]);
      rightArm = worldHand(position, rotation, spine, 1, [.34, .065, .12]);
      break;
    case 'bicycle-crunch':
      spine = .25;
      spineTwist = .28 * alternate;
      leftArm = ears(-1); rightArm = ears(1);
      leftLeg = { hip: -.23 - 1.35 * left, knee: .10 + 1.55 * left, ankle: 0 };
      rightLeg = { hip: -.23 - 1.35 * right, knee: .10 + 1.55 * right, ankle: 0 };
      break;
    case 'stability-ball-crunch':
      position = [0, .69, 0];
      rotation = -1.10;
      spine = -.18 + .48 * q;
      stance = .24;
      leftLeg = rightLeg = foot(position, rotation, .09, .57);
      leftArm = ears(-1); rightArm = ears(1);
      break;
    case 'cable-crunch':
      position = [0, .545, 0]; rotation = .12;
      spine = .62 * q;
      leftLeg = rightLeg = { hip: -.12, knee: halfTurn, ankle: halfTurn };
      leftArm = ears(-1); rightArm = ears(1);
      break;
    case 'plank':
      rotation = Math.acos(.175 / 1.52);
      position = [0, .235 + .97 * Math.cos(rotation), 0];
      leftLeg = rightLeg = { ...straight, ankle: halfTurn - rotation };
      leftArm = { shoulder: [-rotation, 0, 0], elbow: halfTurn };
      rightArm = leftArm;
      break;
    case 'knee-plank':
      rotation = Math.acos(.325 / 1.09);
      position = [0, .085 + .54 * Math.cos(rotation), 0];
      leftLeg = rightLeg = { ...straight, knee: halfTurn - rotation, ankle: halfTurn };
      leftArm = { shoulder: [-rotation, 0, 0], elbow: halfTurn };
      rightArm = leftArm;
      break;
    case 'side-plank':
      return { ...base, position: [0, .35, 0], rotation: [0, 0, -1.27], spine: 0, spineTwist: 0,
        leftArm: { shoulder: [0, 0, .10], elbow: 1.6 }, rightArm: { shoulder: [0, 0, 2.47], elbow: halfTurn },
        leftLeg: { ...straight, abduction: -.09 }, rightLeg: { ...straight, abduction: -.201 } };
    case 'hollow-hold':
      spine = .28;
      leftLeg = rightLeg = { ...straight, hip: -.18 };
      leftArm = rightArm = { shoulder: [-2.85, 0, 0], elbow: .06 };
      break;
    case 'wall-sit':
      position = [0, .60, 0]; rotation = 0;
      leftLeg = rightLeg = foot(position, rotation, .09, .46);
      leftArm = reach(.05, -.55, .25); rightArm = reach(-.05, -.55, .25);
      break;
    case 'farmer-hold':
      position = [0, 1.06, 0]; rotation = 0;
      leftArm = { shoulder: [0, 0, -.08], elbow: .04 };
      rightArm = { shoulder: [0, 0, .08], elbow: .04 };
      break;
    case 'dead-bug':
      leftLeg = { hip: -halfTurn + 1.32 * left, knee: halfTurn * (1 - left), ankle: 0 };
      rightLeg = { hip: -halfTurn + 1.32 * right, knee: halfTurn * (1 - right), ankle: 0 };
      leftArm = { shoulder: [-halfTurn - 1.32 * right, 0, 0], elbow: 0 };
      rightArm = { shoulder: [-halfTurn - 1.32 * left, 0, 0], elbow: 0 };
      break;
    case 'bird-dog': {
      rotation = halfTurn;
      position = [0, .545, 0];
      leftLeg = { hip: -halfTurn * (1 - left), knee: halfTurn * (1 - left), ankle: halfTurn };
      rightLeg = { hip: -halfTurn * (1 - right), knee: halfTurn * (1 - right), ankle: halfTurn };
      leftArm = worldHand(position, rotation, 0, -1, [-.34, .065 + .48 * right, .55 + .65 * right]);
      rightArm = worldHand(position, rotation, 0, 1, [.34, .065 + .48 * left, .55 + .65 * left]);
      break;
    }
    case 'pallof-press':
      position = [0, 1.06, 0]; rotation = 0; stance = .20;
      leftArm = worldHand(position, 0, 0, -1, [-.04, 1.43, .22 + .34 * q]);
      rightArm = worldHand(position, 0, 0, 1, [.04, 1.43, .22 + .34 * q]);
      break;
    case 'ab-wheel-rollout': {
      rotation = 1.20 + .24 * q;
      const thigh = .60 + .35 * q;
      position = [0, .085 + .08 * Math.cos(rotation) + .46 * Math.cos(thigh), .08 * Math.sin(rotation) + .46 * Math.sin(thigh)];
      leftLeg = rightLeg = { hip: thigh - rotation, knee: halfTurn - thigh, ankle: halfTurn };
      // A fixed knee contact is the pivot; the wheel rolls along the floor.
      const wheel = position[2] + .55 * Math.sin(rotation) + .24 + .17 * q;
      leftArm = worldHand(position, rotation, 0, -1, [-.16, .12, wheel]);
      rightArm = worldHand(position, rotation, 0, 1, [.16, .12, wheel]);
      break;
    }
    case 'plank-shoulder-tap': {
      rotation = 1.29; stance = .27;
      position = [0, .235 + .97 * Math.cos(rotation), 0];
      leftLeg = rightLeg = { ...straight, ankle: halfTurn - rotation };
      const shoulderY = position[1] + .55 * Math.cos(rotation);
      const shoulderZ = .55 * Math.sin(rotation);
      leftArm = worldHand(position, rotation, 0, -1, [-.34 + .62 * left, .065 + (shoulderY - .09) * left, shoulderZ]);
      rightArm = worldHand(position, rotation, 0, 1, [.34 - .62 * right, .065 + (shoulderY - .09) * right, shoulderZ]);
      break;
    }
    default: return undefined;
  }
  return { ...base, position, rotation: [rotation, 0, 0], spine, spineTwist, stance, leftArm, rightArm, leftLeg, rightLeg };
}
