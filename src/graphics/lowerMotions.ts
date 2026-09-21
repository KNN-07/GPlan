import type { Exercise } from '../contracts';
import type { ArmPose, LegPose, MotionPose, Triple } from './motions';

const PI = Math.PI;
const relaxed: ArmPose = { shoulder: [0, 0, 0], elbow: .08 };
const straight: LegPose = { hip: 0, knee: 0, ankle: 0 };

/** Two-link sagittal IK; targets are ankle centres, not the bottoms of feet. */
function legTo(position: Triple, rotation: number, y: number, z: number, foot = 0): LegPose {
  const dy = y - position[1] + .08 * Math.cos(rotation);
  const dz = z - position[2] + .08 * Math.sin(rotation);
  const knee = Math.acos(Math.max(-1, Math.min(1, (dy * dy + dz * dz - .46 ** 2 - .43 ** 2) / (2 * .46 * .43))));
  const globalHip = Math.atan2(-dz, -dy) - Math.atan2(.43 * Math.sin(knee), .46 + .43 * Math.cos(knee));
  return { hip: globalHip - rotation, knee, ankle: foot - globalHip - knee };
}

/** Aim the bent arm's endpoint at a load handle in spine-local coordinates. */
function grip(side: number, x: number, y: number, z: number, pole?: Triple): ArmPose {
  const dx = x - side * .34;
  const dy = y - .46;
  const length = Math.hypot(dx, dy, z);
  const elbow = 2 * Math.acos(Math.min(1, length / .68));
  const vy = -Math.cos(elbow / 2);
  const vz = Math.sin(elbow / 2);
  const ux = dx / length, uy = dy / length, uz = z / length;
  if (pole) {
    // Select the elbow plane explicitly for a forearm supported on the floor.
    const projection = pole[0] * ux + pole[1] * uy + pole[2] * uz;
    const px = pole[0] - projection * ux, py = pole[1] - projection * uy, pz = pole[2] - projection * uz;
    const norm = Math.hypot(px, py, pz);
    const vx = px / norm, vy = py / norm, vz = pz / norm;
    const c = Math.cos(elbow / 2), s = Math.sin(elbow / 2);
    return { elbow, shoulder: [
      Math.atan2(-(uy * s - vy * c), uz * s - vz * c),
      Math.asin(Math.max(-1, Math.min(1, ux * s - vx * c))),
      Math.atan2(ux * c + vx * s, uy * vz - uz * vy),
    ] };
  }
  const cx = vy * uz - vz * uy, cy = vz * ux, cz = -vy * ux;
  const cw = 1 + vy * uy + vz * uz;
  const norm = Math.hypot(cx, cy, cz, cw);
  const qx = cx / norm, qy = cy / norm, qz = cz / norm, qw = cw / norm;
  return { elbow, shoulder: [
    Math.atan2(2 * (qx * qw - qy * qz), 1 - 2 * (qx * qx + qy * qy)),
    Math.asin(Math.max(-1, Math.min(1, 2 * (qx * qz + qy * qw)))),
    Math.atan2(2 * (qz * qw - qx * qy), 1 - 2 * (qy * qy + qz * qz)),
  ] };
}

function planted(base: MotionPose, hip: number, knee: number, spine: number, z = .04): MotionPose {
  const leg = { hip, knee, ankle: -hip - knee };
  return { ...base, position: [0, .17 + .46 * Math.cos(hip) + .43 * Math.cos(hip + knee), z + .46 * Math.sin(hip) + .43 * Math.sin(hip + knee)], rotation: [0, 0, 0], spine, leftLeg: leg, rightLeg: leg };
}

function backRack(p: MotionPose): MotionPose {
  return { ...p, leftArm: grip(-1, -.39, .48, -.14), rightArm: grip(1, .39, .48, -.14) };
}

/** Catalog-specific mechanics, keeping contacts in world space through each repetition. */
export function sampleLowerMotion(exercise: Exercise, phase: number, base: MotionPose): MotionPose | undefined {
  const cycle = ((phase % 1) + 1) % 1;
  const q = (1 - Math.cos(2 * PI * cycle)) / 2;
  const id = exercise.id;
  const standing: MotionPose = { ...base, position: [0, 1.06, 0], rotation: [0, 0, 0], spine: 0, leftArm: relaxed, rightArm: relaxed, leftLeg: straight, rightLeg: straight };
  switch (id) {
    case 'bodyweight-squat': case 'goblet-squat': case 'barbell-back-squat':
    case 'barbell-front-squat': case 'dumbbell-squat': case 'smith-machine-squat':
    case 'box-squat': case 'sumo-dumbbell-squat': case 'paused-bodyweight-squat': {
      const depth = id === 'paused-bodyweight-squat' ? Math.sin(q * PI / 2) : q;
      const front = id === 'barbell-front-squat' || id === 'goblet-squat';
      let p = planted(standing, -(front ? .78 : 1.0) * depth, (front ? 1.5 : 1.65) * depth, (front ? .12 : .34) * depth);
      if (id === 'sumo-dumbbell-squat') p = { ...p, stance: .29, leftArm: grip(-1, -.08, -.14, .08), rightArm: grip(1, .08, -.14, .08) };
      if (id === 'barbell-back-squat' || id === 'smith-machine-squat') return backRack(p);
      if (id === 'barbell-front-squat') return { ...p, leftArm: grip(-1, -.34, .48, .16), rightArm: grip(1, .34, .48, .16) };
      if (id === 'goblet-squat') return { ...p, leftArm: grip(-1, -.10, .31, .34), rightArm: grip(1, .10, .31, .34) };
      if (id.includes('bodyweight') || id === 'box-squat') return { ...p, leftArm: { shoulder: [-1.1 * depth, 0, 0], elbow: .15 }, rightArm: { shoulder: [-1.1 * depth, 0, 0], elbow: .15 } };
      return p;
    }
    case 'barbell-romanian-deadlift': case 'dumbbell-romanian-deadlift': case 'kettlebell-romanian-deadlift':
    case 'single-leg-romanian-deadlift': case 'bodyweight-good-morning': case 'barbell-good-morning':
    case 'cable-pull-through': case 'band-good-morning': case 'barbell-deadlift': case 'sumo-deadlift': case 'kettlebell-deadlift': {
      const deadlift = id.endsWith('deadlift') && !id.includes('romanian');
      const lean = 1.05 * q;
      let p = planted(standing, -(deadlift ? 1.5 : .27) * q, (deadlift ? 1.9 : .4) * q, lean);
      const arm: ArmPose = { shoulder: [-lean, 0, 0], elbow: .04 };
      p = { ...p, leftArm: arm, rightArm: arm };
      if (id === 'single-leg-romanian-deadlift') p = { ...p, position: [.145, p.position[1], p.position[2]], rightLeg: { hip: lean, knee: .12, ankle: -.1 } };
      if (id === 'sumo-deadlift') p = { ...p, stance: .31 };
      if (id === 'kettlebell-deadlift' || id === 'kettlebell-romanian-deadlift') {
        const y = .46 - .61 * Math.cos(lean) + .10 * Math.sin(lean);
        const z = .61 * Math.sin(lean) + .10 * Math.cos(lean);
        p = { ...p, leftArm: grip(-1, -.08, y, z), rightArm: grip(1, .08, y, z) };
      }
      if (id === 'barbell-good-morning' || id === 'band-good-morning') return backRack(p);
      if (id === 'bodyweight-good-morning') return { ...p, leftArm: { shoulder: [-.2, 0, .4], elbow: 2.0 }, rightArm: { shoulder: [-.2, 0, -.4], elbow: 2.0 } };
      if (id === 'cable-pull-through') return { ...p, leftArm: { shoulder: [-lean + .15, 0, .2], elbow: .1 }, rightArm: { shoulder: [-lean + .15, 0, -.2], elbow: .1 } };
      return p;
    }
    case 'walking-lunge': {
      // A short forward/backward walking shuttle keeps the demonstration loop closed.
      // Unlike a forward lunge, the trailing foot steps through to meet the lead foot.
      const segment = Math.floor(cycle * 4);
      const t = cycle * 4 - segment;
      const s = t * t * t * (10 + t * (-15 + 6 * t));
      const leftZ = segment === 0 ? .7 * s : segment === 3 ? .7 * (1 - s) : .7;
      const rightZ = segment === 1 ? .7 * s : segment === 2 ? .7 * (1 - s) : 0;
      const depth = Math.sin(2 * PI * cycle) ** 2;
      const position: Triple = [0, 1.06 - .34 * depth, (leftZ + rightZ) / 2];
      const clearance = .13 * Math.sin(PI * s) ** 2;
      const leftMoving = segment === 0 || segment === 3;
      return { ...standing, position, spine: .12 * depth, leftLeg: legTo(position, 0, .09 + (leftMoving ? clearance : 0), leftZ), rightLeg: legTo(position, 0, .09 + (leftMoving ? 0 : clearance), rightZ) };
    }
    case 'reverse-lunge': case 'forward-lunge': case 'split-squat': case 'dumbbell-reverse-lunge':
    case 'dumbbell-split-squat': case 'bulgarian-split-squat': case 'dumbbell-bulgarian-split-squat': {
      const bulgarian = id.includes('bulgarian');
      const split = id.includes('split-squat');
      // The step occupies the first/last quarter; lowering only starts after contact.
      const step = split ? 1 : Math.sin(Math.min(1, q * 2) * PI / 2);
      const depth = split ? q : Math.max(0, 2 * q - 1) ** 2;
      const forward = id === 'forward-lunge';
      const frontZ = split ? .42 : forward ? .04 + .64 * step : .04;
      const rearZ = bulgarian ? -.62 : split ? -.4 : forward ? .04 : .04 - .76 * step;
      const rearFoot = bulgarian ? -.65 : .65 * step;
      const rearY = bulgarian ? .52 : .09 * Math.cos(rearFoot) + .235 * Math.sin(rearFoot);
      const position: Triple = [0, (bulgarian ? .94 : 1.06 - .14 * step) - .25 * depth, (frontZ + rearZ) / 2 + .1 * step];
      // Lift only the travelling foot while it is between its two ground contacts.
      const clearance = split || q >= .5 ? 0 : .12 * Math.sin(2 * PI * q) ** 2;
      return { ...standing, position, spine: .12 * depth, leftLeg: legTo(position, 0, .09 + (forward ? clearance : 0), frontZ), rightLeg: legTo(position, 0, rearY + (forward ? 0 : clearance), rearZ, rearFoot) };
    }
    case 'leg-extension': case 'single-leg-extension': case 'seated-band-knee-extension':
    case 'seated-leg-curl': case 'seated-hip-adduction': case 'seated-hip-abduction': case 'seated-dumbbell-calf-raise': {
      const seated: LegPose = { hip: -PI / 2, knee: PI / 2, ankle: 0 };
      let leftLeg: LegPose = seated;
      let rightLeg: LegPose = seated;
      const position: Triple = [0, .60, 0];
      if (id.includes('extension')) {
        leftLeg = { hip: -PI / 2, knee: PI / 2 * (1 - .94 * q), ankle: -PI / 2 * (1 - .94 * q) + PI / 2 };
        rightLeg = id === 'leg-extension' ? leftLeg : seated;
      } else if (id === 'seated-leg-curl') {
        leftLeg = { hip: -PI / 2, knee: .12 + 1.45 * q, ankle: PI / 2 - (.12 + 1.45 * q) };
        rightLeg = leftLeg;
      } else if (id === 'seated-hip-adduction' || id === 'seated-hip-abduction') {
        const spread = .08 + .52 * (id === 'seated-hip-adduction' ? 1 - q : q);
        leftLeg = { ...seated, abduction: -spread };
        rightLeg = { ...seated, abduction: spread };
      } else {
        const foot = .48 * q;
        const y = .09 * Math.cos(foot) + .235 * Math.sin(foot);
        const z = .695 - .235 * Math.cos(foot) + .09 * Math.sin(foot);
        leftLeg = legTo(position, 0, y, z, foot); rightLeg = leftLeg;
        const a = -.07 - .46 * Math.cos(leftLeg.hip);
        const b = -.46 * Math.sin(leftLeg.hip);
        const handY = a * Math.cos(.22) + b * Math.sin(.22);
        const handZ = -a * Math.sin(.22) + b * Math.cos(.22);
        return { ...standing, position, spine: .22, leftLeg, rightLeg, leftArm: grip(-1, -.145, handY, handZ), rightArm: grip(1, .145, handY, handZ) };
      }
      return { ...standing, position, leftLeg, rightLeg };
    }
    case 'lying-leg-curl': case 'single-leg-lying-curl': case 'prone-band-leg-curl': {
      const band = id === 'prone-band-leg-curl';
      const knee = .08 + 1.85 * q;
      const leg = { hip: 0, knee, ankle: band ? PI / 2 - knee : 0 };
      return { ...standing, position: [0, band ? .18 : .66, 0], rotation: [PI / 2, 0, 0], leftLeg: leg, rightLeg: id === 'lying-leg-curl' ? leg : { ...straight, ankle: band ? PI / 2 : 0 }, leftArm: { shoulder: [band ? -PI : -2.6, 0, -.25], elbow: band ? .05 : .3 }, rightArm: { shoulder: [band ? -PI : -2.6, 0, .25], elbow: band ? .05 : .3 } };
    }
    case 'glute-bridge': case 'single-leg-glute-bridge': case 'dumbbell-glute-bridge': case 'barbell-hip-thrust': case 'stability-ball-leg-curl': {
      const thrust = id === 'barbell-hip-thrust';
      const ball = id === 'stability-ball-leg-curl';
      const rotation = ball ? -1.9 - .2 * q : thrust ? -.8 - .77 * q : -PI / 2 - .58 * q;
      const position: Triple = [0, (thrust ? .67 : .20) - .55 * Math.cos(rotation), -.5 - .55 * Math.sin(rotation)];
      const leg = legTo(position, rotation, ball ? .43 : .09, ball ? .82 - .25 * q : thrust ? .65 : .55);
      const arm: ArmPose = { shoulder: [-PI / 2 - rotation, 0, 0], elbow: .1 };
      const loaded = thrust || id === 'dumbbell-glute-bridge';
      return { ...standing, position, rotation: [rotation, 0, 0], neck: [thrust ? 0 : -(rotation + PI / 2), 0, 0], leftArm: loaded ? grip(-1, -.20, -.09, .20) : arm, rightArm: loaded ? grip(1, .20, -.09, .20) : arm, leftLeg: leg, rightLeg: id === 'single-leg-glute-bridge' ? { hip: -1.65, knee: 1.6, ankle: 0 } : leg };
    }
    case 'standing-band-hip-abduction': case 'cable-hip-abduction': case 'cable-hip-adduction': {
      const adduct = id === 'cable-hip-adduction';
      return { ...standing, position: [.145, 1.06, 0], rightLeg: { hip: adduct ? -.1 : 0, knee: .06, ankle: 0, abduction: adduct ? .48 - .68 * q : .08 + .52 * q }, leftArm: grip(-1, -.745, -.05, .1) };
    }
    case 'side-lying-hip-abduction': {
      const angle = 1.2;
      // The pelvis and lower leg rest on the floor while the lower forearm props
      // the broad shoulder; the upper palm braces beside the torso.
      const lowerX = -.58 * Math.cos(angle) - .15 * Math.sin(angle);
      const lowerY = .58 * Math.sin(angle) - .15 * Math.cos(angle) - .09;
      const upperX = -.39 * Math.cos(angle) - .15 * Math.sin(angle);
      const upperY = .39 * Math.sin(angle) - .15 * Math.cos(angle) - .09;
      return { ...standing, position: [-.45, .25, 0], rotation: [0, 0, angle], leftLeg: { ...straight, abduction: .4 }, rightLeg: { ...straight, abduction: .08 + .75 * q }, leftArm: grip(-1, lowerX, lowerY, .25, [Math.cos(angle), -Math.sin(angle), 0]), rightArm: grip(1, upperX, upperY, .05) };
    }
    case 'standing-calf-raise': case 'single-leg-calf-raise': case 'dumbbell-calf-raise': case 'machine-calf-raise': case 'smith-machine-calf-raise': {
      const foot = .5 * q;
      const leg = { hip: 0, knee: 0, ankle: foot };
      const position: Triple = [id === 'single-leg-calf-raise' ? .145 : 0, .97 + .09 * Math.cos(foot) + .235 * Math.sin(foot), .235 - .235 * Math.cos(foot) + .09 * Math.sin(foot)];
      const p = { ...standing, position, leftLeg: leg, rightLeg: id === 'single-leg-calf-raise' ? { hip: .15, knee: .8, ankle: 0 } : leg };
      if (id === 'standing-calf-raise' || id === 'single-leg-calf-raise') {
        return { ...p, leftArm: grip(-1, -.60 - position[0], 1.1 - position[1] - .09, .1 - position[2]) };
      }
      return id === 'smith-machine-calf-raise' ? backRack(p) : p;
    }
    case 'leg-press': case 'single-leg-leg-press': case 'leg-press-calf-raise': {
      const position: Triple = [0, .64, 0];
      const calf = id === 'leg-press-calf-raise';
      const extension = calf ? 1 : q;
      const foot = calf ? -.72 + .38 * q : -.72;
      const y = .82 + .19 * extension;
      const z = .39 + .28 * extension;
      // Calf motion holds the toe against the sled while the heel leaves it.
      const leg = legTo(position, -.35, calf ? y + .09 * (Math.cos(foot) - Math.cos(-.72)) + .235 * (Math.sin(foot) - Math.sin(-.72)) : y, calf ? z - .235 * (Math.cos(foot) - Math.cos(-.72)) + .09 * (Math.sin(foot) - Math.sin(-.72)) : z, foot);
      return { ...standing, position, rotation: [-.35, 0, 0], leftLeg: leg, rightLeg: id === 'single-leg-leg-press' ? legTo(position, -.35, .09, .18) : leg };
    }
    default: return undefined;
  }
}
