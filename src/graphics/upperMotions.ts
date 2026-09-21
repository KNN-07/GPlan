import type { Exercise } from '../contracts';
import { upperExercises } from '../catalog/upper';
import { armExercises } from '../catalog/arms';
import type { ArmPose, LegPose, MotionPose, Triple } from './motions';

const owned: Record<string, true> = Object.fromEntries([...upperExercises, ...armExercises].map(exercise => [exercise.id, true]));
const PI = Math.PI;
const rest: ArmPose = { shoulder: [0, 0, 0], elbow: .08 };
const straight: LegPose = { hip: 0, knee: 0, ankle: 0 };
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Two equal arm segments, with a pole selecting the anatomical elbow plane. */
function reach(target: Triple, pole: Triple, wrist: Triple = [0, 0, 0]): ArmPose {
  const distance = Math.hypot(...target);
  const d = Math.min(.6795, Math.max(.025, distance));
  const direction = target.map(n => n / Math.max(distance, .0001)) as Triple;
  const dot = direction[0] * pole[0] + direction[1] * pole[1] + direction[2] * pole[2];
  let bend: Triple = [pole[0] - direction[0] * dot, pole[1] - direction[1] * dot, pole[2] - direction[2] * dot];
  let length = Math.hypot(...bend);
  if (length < .0001) {
    bend = [direction[1], -direction[0], 0];
    length = Math.hypot(...bend);
    if (length < .0001) { bend = [1, 0, 0]; length = 1; }
  }
  const c = d / .68;
  const s = Math.sqrt(1 - c * c);
  const y = direction.map((n, i) => -n * c + bend[i] / length * s) as Triple;
  const z = direction.map((n, i) => n * s + bend[i] / length * c) as Triple;
  const x: Triple = [y[1] * z[2] - y[2] * z[1], y[2] * z[0] - y[0] * z[2], y[0] * z[1] - y[1] * z[0]];
  const shoulder: Triple = Math.abs(z[0]) < .999999
    ? [Math.atan2(-z[1], z[2]), Math.asin(clamp(z[0])), Math.atan2(-y[0], x[0])]
    : [Math.atan2(y[2], y[1]), Math.asin(clamp(z[0])), 0];
  return { shoulder, elbow: 2 * Math.acos(c), wrist };
}

function rotateX(v: Triple, angle: number): Triple {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function worldReach(pose: MotionPose, side: number, hand: Triple, pole: Triple = [0, 0, 1]): ArmPose {
  const root = pose.rotation[0];
  const angle = root + pose.spine;
  const shoulder: Triple = [side * .34, .09 * Math.cos(root) + .46 * Math.cos(angle), .09 * Math.sin(root) + .46 * Math.sin(angle)];
  const local = rotateX([hand[0] - pose.position[0] - shoulder[0], hand[1] - pose.position[1] - shoulder[1], hand[2] - pose.position[2] - shoulder[2]], -angle);
  return reach(local, rotateX(pole, -angle));
}

function feetOnFloor(pose: MotionPose, ankleZ = .56): MotionPose {
  const a = pose.rotation[0];
  const hipY = pose.position[1] - .08 * Math.cos(a);
  const hipZ = pose.position[2] - .08 * Math.sin(a);
  const dy = .09 - hipY, dz = ankleZ - hipZ;
  const knee = Math.acos(clamp((dy * dy + dz * dz - .46 ** 2 - .43 ** 2) / (2 * .46 * .43)));
  const hip = Math.atan2(-dz, -dy) - Math.atan2(.43 * Math.sin(knee), .46 + .43 * Math.cos(knee));
  const leg: LegPose = { hip: hip - a, knee, ankle: -hip - knee };
  return { ...pose, leftLeg: leg, rightLeg: leg };
}

function seated(pose: MotionPose, angle = 0): MotionPose {
  return feetOnFloor({ ...pose, position: [0, .69, 0], rotation: [angle, 0, 0] }, .48);
}

function standing(pose: MotionPose, hinge = 0): MotionPose {
  const leg: LegPose = { hip: -.15, knee: .3, ankle: -.15 };
  return { ...pose, position: [0, .17 + .89 * Math.cos(.15), 0], rotation: [0, 0, 0], spine: hinge, leftArm: rest, rightArm: rest, leftLeg: leg, rightLeg: leg };
}

function bench(pose: MotionPose, floor: boolean, incline: boolean): MotionPose {
  return feetOnFloor({ ...pose, position: [0, floor ? .18 : .69, 0], rotation: [incline ? -PI / 3 : -PI / 2, 0, 0], spine: 0 }, floor ? .5 : .65);
}

/** Catalog-specific mechanics; undefined leaves unrelated catalog ownership untouched. */
export function sampleUpperMotion(exercise: Exercise, phase: number, base: MotionPose): MotionPose | undefined {
  if (!owned[exercise.id]) return undefined;
  const id = exercise.id;
  const cycle = ((phase % 1) + 1) % 1;
  let q = (1 - Math.cos(2 * PI * cycle)) / 2;
  let pose = standing(base);
  const single = exercise.animation.unilateral;
  const neutral = id.includes('neutral') || id.includes('hammer') || id.includes('rope');
  const wrist: Triple = [0, neutral ? PI / 2 : id.includes('underhand') || id.includes('curl') && !id.includes('reverse') || id === 'chin-up' ? PI : 0, 0];

  if (id.includes('push-up')) {
    if (id === 'paused-push-up') {
      const descent = Math.min(1, q / .82);
      q = descent * descent * (3 - 2 * descent);
    }
    if (id === 'wall-push-up') {
      const a = mix(.12, .34, q);
      pose = { ...pose, rotation: [a, 0, 0], position: [0, .09 + .97 * Math.cos(a), .97 * Math.sin(a)], leftLeg: { ...straight, ankle: -a }, rightLeg: { ...straight, ankle: -a } };
      return { ...pose, leftArm: worldReach(pose, -1, [-.37, 1.36, .68]), rightArm: worldReach(pose, 1, [.37, 1.36, .68]) };
    }
    if (id === 'pike-push-up') {
      const a = mix(2, 2.18, q);
      const hip = -1.28;
      const legAngle = a + hip;
      pose = { ...pose, rotation: [a, 0, 0], position: [0, .235 + .08 * Math.cos(a) + .89 * Math.cos(legAngle), .08 * Math.sin(a) + .89 * Math.sin(legAngle)], leftLeg: { hip, knee: 0, ankle: PI / 2 - legAngle }, rightLeg: { hip, knee: 0, ankle: PI / 2 - legAngle } };
      return { ...pose, leftArm: worldReach(pose, -1, [-.34, .065, 1.32]), rightArm: worldReach(pose, 1, [.34, .065, 1.32]) };
    }
    const incline = id === 'incline-push-up', decline = id === 'decline-push-up', knee = id === 'knee-push-up';
    const a = incline ? mix(.98, 1.17, q) : decline ? mix(1.65, 1.85, q) : knee ? mix(.98, 1.34, q) : mix(1.3, 1.53, q);
    const footY = knee ? .09 : decline ? .755 : .235;
    const leg: LegPose = knee ? { hip: 0, knee: .8, ankle: -a - .8 } : { ...straight, ankle: PI / 2 - a };
    const support = knee ? .54 : .97;
    pose = { ...pose, position: [0, footY + support * Math.cos(a), support * Math.sin(a)], rotation: [a, 0, 0], leftLeg: leg, rightLeg: leg };
    const width = id === 'wide-push-up' ? .53 : id === 'close-grip-push-up' ? .22 : .37;
    const z = knee ? 1.03 : 1.48;
    const y = incline ? .585 : .065;
    return { ...pose, leftArm: worldReach(pose, -1, [-width, y, z], [0, 0, 1]), rightArm: worldReach(pose, 1, [width, y, z], [0, 0, 1]) };
  }

  if (id === 'parallel-bar-dip' || id === 'assisted-dip') {
    pose = { ...pose, position: [0, mix(1.25, .98, q), 0], leftLeg: { hip: .12, knee: .75, ankle: -.25 }, rightLeg: { hip: .12, knee: .75, ankle: -.25 } };
    return { ...pose, leftArm: worldReach(pose, -1, [-.34, 1.15, .03]), rightArm: worldReach(pose, 1, [.34, 1.15, .03]) };
  }

  if (exercise.movement === 'horizontal-push') {
    const fly = id.includes('fly');
    const supine = exercise.animation.posture === 'supine';
    if (supine) pose = bench(pose, id.includes('floor'), id.includes('incline'));
    else if (exercise.animation.posture === 'seated') pose = seated(pose);
    if (fly) {
      const low = id === 'low-to-high-cable-fly', high = id === 'high-to-low-cable-fly';
      const spread = mix(1.28, -.42, q);
      const pitch = supine ? -PI / 2 : low ? mix(-.5, -1.75, q) : high ? mix(-1.9, -.95, q) : -PI / 2;
      const arm = (side: number): ArmPose => ({ shoulder: [pitch, 0, side * spread], elbow: .22, wrist: [0, side * PI / 2, 0] });
      return { ...pose, leftArm: arm(-1), rightArm: arm(1) };
    }
    const floor = id.includes('floor');
    const squeeze = id.includes('squeeze');
    const narrow = id.includes('close-grip') || neutral;
    const angle = pose.rotation[0];
    const shoulderY = pose.position[1] + .55 * Math.cos(angle), shoulderZ = .55 * Math.sin(angle);
    const y = supine ? shoulderY + mix(floor ? .29 : .24, .64, q) : shoulderY - .03;
    const z = supine ? shoulderZ + .06 : mix(.25, .65, q);
    const width = squeeze ? .12 : narrow ? .3 : exercise.animation.prop === 'barbell' || exercise.animation.prop === 'machine' ? .48 : mix(.5, .34, q);
    const arm = (side: number) => ({ ...worldReach(pose, side, [side * width, y, z], supine ? [side * -.8, 1, .5] : [side * -.7, 0, 1]), wrist });
    return { ...pose, leftArm: arm(-1), rightArm: arm(1) };
  }

  if (exercise.movement === 'vertical-push') {
    if (exercise.animation.posture === 'seated') pose = seated(pose);
    const arnold = id === 'arnold-press';
    const arm = (side: number): ArmPose => ({ ...reach([side * mix(arnold ? -.08 : .1, .02, q), mix(.13, .65, q), mix(.22, .025, q)], [side * -.8, 0, 1]), wrist: [0, arnold ? mix(PI, 0, q) : PI / 2, 0] });
    return { ...pose, leftArm: arm(-1), rightArm: single ? rest : arm(1) };
  }

  if (id === 'inverted-row') {
    const a = mix(-1.35, -1.05, q);
    pose = { ...pose, position: [0, .09 + .97 * Math.cos(a), .97 * Math.sin(a)], rotation: [a, 0, 0], leftLeg: { ...straight, ankle: -a }, rightLeg: { ...straight, ankle: -a } };
    return { ...pose, leftArm: worldReach(pose, -1, [-.34, 1.04, -1.45]), rightArm: worldReach(pose, 1, [.34, 1.04, -1.45]) };
  }

  if (id === 'cable-face-pull') {
    const arm = (side: number): ArmPose => ({ ...reach([side * mix(-.12, .13, q), mix(.03, .18, q), mix(.62, .14, q)], [side * -.5, 1, 0]), wrist: [0, side * PI / 2, 0] });
    return { ...pose, leftArm: arm(-1), rightArm: arm(1) };
  }

  if (exercise.movement === 'horizontal-pull') {
    const bent = id.includes('bent-over') || id === 'underhand-barbell-row' || id === 'kettlebell-row';
    if (bent) pose = standing(pose, 1.0);
    if (exercise.animation.posture === 'seated') pose = seated(pose);
    if (id === 'chest-supported-dumbbell-row') pose = feetOnFloor({ ...pose, position: [0, .82, 0], rotation: [PI / 3, 0, 0], spine: 0 }, -.5);
    if (id === 'single-arm-dumbbell-row') {
      pose = { ...pose, position: [0, .98, 0], rotation: [PI / 2, 0, 0], spine: 0, leftLeg: { hip: -PI / 2, knee: 0, ankle: 0 }, rightLeg: { hip: -.954, knee: .954, ankle: -PI / 2 } };
      pose = { ...pose, rightArm: worldReach(pose, 1, [.34, .585, .68]) };
    }
    const hinged = bent || id === 'chest-supported-dumbbell-row' || id === 'single-arm-dumbbell-row';
    const arm = (side: number): ArmPose => ({ shoulder: [mix(hinged ? -(pose.rotation[0] + pose.spine) : -1.48, .28, q), 0, side * .08], elbow: mix(.1, 1.55, q), wrist });
    return { ...pose, leftArm: arm(-1), rightArm: single ? id === 'single-arm-dumbbell-row' ? pose.rightArm : { shoulder: [-.45, 0, -.2], elbow: .65 } : arm(1) };
  }

  if (exercise.movement === 'vertical-pull') {
    if (id === 'straight-arm-cable-pulldown') {
      pose = standing(pose, .22);
      const arm: ArmPose = { shoulder: [mix(-2.4, -.12, q), 0, 0], elbow: .12, wrist };
      return { ...pose, leftArm: arm, rightArm: arm };
    }
    if (id.includes('pull-up') || id === 'chin-up') {
      pose = { ...pose, position: [0, mix(1.46, 1.95, q), 0], leftLeg: { hip: -.1, knee: .5, ankle: -.2 }, rightLeg: { hip: -.1, knee: .5, ankle: -.2 } };
      const width = id === 'chin-up' ? .27 : .4;
      const arm = (side: number): ArmPose => ({ ...worldReach(pose, side, [side * width, 2.65, 0], [side * -.6, 0, 1]), wrist });
      return { ...pose, leftArm: arm(-1), rightArm: arm(1) };
    }
    const kneel = id === 'kneeling-band-pulldown' || id === 'single-arm-cable-pulldown';
    pose = kneel ? { ...pose, position: [0, .63, 0], leftLeg: { hip: 0, knee: PI / 2, ankle: -PI / 2 }, rightLeg: { hip: 0, knee: PI / 2, ankle: -PI / 2 } } : seated(pose);
    const arm = (side: number): ArmPose => ({ ...reach([side * (neutral ? -.04 : .12), mix(.63, -.12, q), mix(.08, .3, q)], [side * -.7, 0, 1]), wrist });
    return { ...pose, leftArm: arm(-1), rightArm: single ? rest : arm(1) };
  }

  if (exercise.movement === 'shoulder-isolation') {
    if (exercise.animation.posture === 'seated') pose = seated(pose);
    const rear = id === 'bent-over-reverse-fly' || id === 'reverse-pec-deck' || id === 'band-pull-apart';
    if (id === 'bent-over-reverse-fly') pose = standing(pose, 1.15);
    const front = id === 'dumbbell-front-raise';
    const arm = (side: number): ArmPose => ({ shoulder: [front ? mix(-.1, -1.5, q) : rear ? id === 'bent-over-reverse-fly' ? -1.15 : -PI / 2 : -.12, 0, side * (front ? .03 : rear ? mix(-.35, 1.35, q) : mix(.08, 1.45, q))], elbow: .15, wrist: [0, side * PI / 2, 0] });
    return { ...pose, leftArm: arm(-1), rightArm: single ? rest : arm(1) };
  }

  if (exercise.movement === 'elbow-flexion') {
    if (exercise.animation.posture === 'seated') pose = seated(pose, id === 'incline-dumbbell-curl' ? -.5 : 0);
    const concentration = id === 'concentration-curl', preacher = id === 'dumbbell-preacher-curl';
    if (concentration) pose = { ...pose, spine: .9, stance: .23 };
    if (preacher) pose = standing(pose, .18);
    const alternating = id === 'alternating-dumbbell-curl';
    const leftQ = alternating ? cycle < .5 ? (1 - Math.cos(4 * PI * cycle)) / 2 : 0 : q;
    const rightQ = alternating ? cycle >= .5 ? (1 - Math.cos(4 * PI * cycle)) / 2 : 0 : q;
    const arm = (amount: number, side: number): ArmPose => ({ shoulder: [concentration ? -.65 : preacher ? -.8 : id === 'incline-dumbbell-curl' ? .5 : -.04, 0, concentration ? -side * .28 : 0], elbow: mix(.08, 2.2, amount), wrist });
    return { ...pose, leftArm: arm(leftQ, -1), rightArm: single && !alternating ? { shoulder: [-.55, 0, .1], elbow: .3 } : arm(rightQ, 1) };
  }

  // The remaining owned movement is elbow extension, with three distinct axes.
  const overhead = id.includes('overhead') || id === 'seated-dumbbell-triceps-extension';
  const skull = id.includes('skull-crusher');
  const kickback = id === 'dumbbell-kickback';
  if (exercise.animation.posture === 'seated') pose = seated(pose);
  if (skull) pose = bench(pose, false, false);
  if (kickback) pose = standing(pose, 1.05);
  const arm = (side: number): ArmPose => ({ shoulder: [skull ? -1.75 : overhead ? -PI + .12 : kickback ? .25 : -.08, 0, overhead && exercise.animation.prop === 'dumbbells' ? -side * .28 : id === 'rope-triceps-pushdown' ? side * .08 * q : 0], elbow: mix(overhead || skull ? 1.65 : 1.4, .08, q), wrist: [0, neutral || skull || overhead ? side * PI / 2 : 0, 0] });
  return { ...pose, leftArm: arm(-1), rightArm: single ? rest : arm(1) };
}
