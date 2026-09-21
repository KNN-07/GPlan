import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import type { Exercise, Muscle } from '../contracts';
import { advancePhase, sampleExerciseMotion } from './motions';
import type { MotionPose, Triple } from './motions';
import { Bar, Box, Ellipsoid, Segment } from './Primitives';
import { Barbell, Dumbbell, Kettlebell, cableAnchors } from './Equipment';
import { palette } from './palette';

const neutralWrist: Triple = [0, 0, 0];

function createRig() {
  return { root: new Group(), spine: new Group(), head: new Group(), leftShoulder: new Group(), rightShoulder: new Group(), leftElbow: new Group(), rightElbow: new Group(), leftHand: new Group(), rightHand: new Group(), leftHip: new Group(), rightHip: new Group(), leftKnee: new Group(), rightKnee: new Group(), leftAnkle: new Group(), rightAnkle: new Group(), load: new Group(), leftCable: new Group(), rightCable: new Group(), leftPoint: new Vector3(), rightPoint: new Vector3(), direction: new Vector3(), axis: new Vector3(1, 0, 0) };
}
type Rig = ReturnType<typeof createRig>;

function applyPose(rig: Rig, pose: MotionPose) {
  rig.root.position.set(...pose.position); rig.root.rotation.set(...pose.rotation);
  rig.spine.rotation.set(pose.spine, pose.spineTwist ?? 0, 0);
  rig.head.rotation.set(...(pose.neck ?? neutralWrist));
  rig.leftShoulder.rotation.set(...pose.leftArm.shoulder); rig.rightShoulder.rotation.set(...pose.rightArm.shoulder);
  rig.leftElbow.rotation.x = -pose.leftArm.elbow; rig.rightElbow.rotation.x = -pose.rightArm.elbow;
  rig.leftHand.rotation.set(...(pose.leftArm.wrist ?? neutralWrist)); rig.rightHand.rotation.set(...(pose.rightArm.wrist ?? neutralWrist));
  rig.leftHip.position.x = -(pose.stance ?? .145); rig.rightHip.position.x = pose.stance ?? .145;
  rig.leftHip.rotation.set(pose.leftLeg.hip, pose.leftLeg.yaw ?? 0, pose.leftLeg.abduction ?? 0);
  rig.rightHip.rotation.set(pose.rightLeg.hip, pose.rightLeg.yaw ?? 0, pose.rightLeg.abduction ?? 0);
  rig.leftKnee.rotation.x = pose.leftLeg.knee; rig.rightKnee.rotation.x = pose.rightLeg.knee;
  rig.leftAnkle.rotation.x = pose.leftLeg.ankle; rig.rightAnkle.rotation.x = pose.rightLeg.ankle;
}

export function Figure({ exercise, active }: { readonly exercise: Exercise; readonly active: boolean }) {
  const rig = useMemo(createRig, []);
  const phase = useRef(0);
  const id = exercise.id;
  const equipment = exercise.equipmentOptions[0] ?? [];
  const anchors = useMemo(() => cableAnchors(exercise), [exercise]);
  const hipLoad = id === 'barbell-hip-thrust' || id === 'dumbbell-glute-bridge';
  const backLoad = id === 'barbell-back-squat' || id === 'barbell-good-morning' || id === 'smith-machine-squat' || id === 'smith-machine-calf-raise';
  const frontLoad = id === 'barbell-front-squat';
  const calfLoad = id === 'seated-dumbbell-calf-raise';
  const fixedBar = id === 'inverted-row';
  const smith = equipment.includes('smith-machine');
  const central = id === 'goblet-squat' || id === 'sumo-dumbbell-squat' || id === 'kettlebell-romanian-deadlift' || id === 'kettlebell-deadlift' || id === 'dumbbell-overhead-triceps-extension' || id === 'seated-dumbbell-triceps-extension' || id === 'dumbbell-crunch';
  const wheel = id === 'ab-wheel-rollout';
  const ball = id === 'stability-ball-leg-curl';
  const sled = equipment.includes('leg-press');
  const latBar = equipment.includes('lat-pulldown') && id !== 'neutral-grip-lat-pulldown';
  const bandBetween = id === 'band-pull-apart' || id === 'standing-band-hip-abduction';
  const bar = (exercise.animation.prop === 'barbell' || smith) && !hipLoad && !fixedBar;
  const legCable = exercise.movement === 'hip-isolation' || exercise.movement === 'knee-extension' || exercise.movement === 'knee-flexion';
  const rightLegCable = id === 'cable-hip-abduction' || id === 'cable-hip-adduction';
  const noHandProp = hipLoad || backLoad || frontLoad || calfLoad || fixedBar || central || wheel || exercise.animation.prop === 'machine';
  const singleWeight = exercise.animation.unilateral && exercise.movement !== 'lunge' && id !== 'alternating-dumbbell-curl';
  const kettlebell = equipment.includes('kettlebell');
  function updateEquipment() {
    rig.root.updateMatrixWorld(true);
    if (bar || central || wheel || ball || sled || latBar) {
      (ball || sled ? rig.leftAnkle : rig.leftHand).getWorldPosition(rig.leftPoint);
      (ball || sled ? rig.rightAnkle : rig.rightHand).getWorldPosition(rig.rightPoint);
      rig.load.position.copy(rig.leftPoint).add(rig.rightPoint).multiplyScalar(.5);
      if (sled && exercise.animation.unilateral) {
        rig.load.position.copy(rig.leftPoint);
        rig.load.position.x = 0;
      }
      if (ball) rig.load.position.y = .2;
      if (sled) { rig.load.position.z += .13; rig.load.rotation.x = -.72; }
      if (wheel) rig.load.position.y = .12;
      if (bar || latBar) {
        rig.direction.subVectors(rig.rightPoint, rig.leftPoint).normalize();
        rig.load.quaternion.setFromUnitVectors(rig.axis, rig.direction);
      }
    }
    if (anchors) {
      const left = rightLegCable ? rig.rightAnkle : legCable || id === 'band-assisted-pull-up' ? rig.leftAnkle : id === 'band-good-morning' ? rig.leftShoulder : rig.leftHand;
      const right = legCable || id === 'band-assisted-pull-up' ? rig.rightAnkle : id === 'band-good-morning' ? rig.rightShoulder : rig.rightHand;
      left.getWorldPosition(rig.leftPoint); right.getWorldPosition(rig.rightPoint);
      for (let side = 0; side < 2; side++) {
        const cable = side === 0 ? rig.leftCable : rig.rightCable;
        const point = side === 0 ? rig.leftPoint : rig.rightPoint;
        const anchor = anchors[side];
        rig.direction.set(...anchor).sub(point);
        cable.position.copy(point).addScaledVector(rig.direction, .5);
        cable.scale.x = rig.direction.length();
        if (cable.scale.x > .0001) cable.quaternion.setFromUnitVectors(rig.axis, rig.direction.normalize());
      }
    }
    if (bandBetween) {
      (legCable ? rig.leftAnkle : rig.leftHand).getWorldPosition(rig.leftPoint);
      (legCable ? rig.rightAnkle : rig.rightHand).getWorldPosition(rig.rightPoint);
      rig.direction.subVectors(rig.rightPoint, rig.leftPoint);
      rig.leftCable.position.copy(rig.leftPoint).addScaledVector(rig.direction, .5);
      rig.leftCable.scale.x = rig.direction.length();
      if (rig.leftCable.scale.x > .0001) rig.leftCable.quaternion.setFromUnitVectors(rig.axis, rig.direction.normalize());
    }
  }
  useLayoutEffect(() => { phase.current = 0; applyPose(rig, sampleExerciseMotion(exercise, 0)); updateEquipment(); }, [exercise, rig]);
  useFrame((_, delta) => {
    phase.current = advancePhase(phase.current, delta, active);
    applyPose(rig, sampleExerciseMotion(exercise, phase.current));
    updateEquipment();
  });
  function muscleColor(muscle: Muscle) {
    return exercise.primary.includes(muscle) ? palette.primary : exercise.secondary.includes(muscle) ? palette.secondary : palette.body;
  }
  function patch(muscle: Muscle, position: Triple, scale: Triple) {
    return <Ellipsoid position={position} scale={scale} color={muscleColor(muscle)} />;
  }
  return <><primitive object={rig.root}>
    {hipLoad && <group position={[0, 0, .2]}>{exercise.animation.prop === 'barbell' ? <Barbell /> : <Dumbbell />}</group>}
    <Ellipsoid scale={[.25, .18, .17]} color={palette.joint} />
    {[-1, 1].map(side => <group key={`glute-${side}`}>
      {patch('glutes', [side * .12, -.025, -.12], [.14, .16, .09])}
    </group>)}
    <primitive object={rig.spine} position={[0, .09, 0]}>
      {id === 'machine-calf-raise' && <Box position={[0, .56, 0]} scale={[.72, .12, .3]} />}
      <Ellipsoid position={[0, .29, 0]} scale={[.27, .34, .15]} />
      {patch('core', [0, .12, .115], [.16, .18, .055])}
      {[-1, 1].map(side => <group key={`torso-${side}`}>
        {patch('chest', [side * .135, .42, .12], [.145, .145, .065])}
        {patch('back', [side * .12, .34, -.12], [.13, .23, .06])}
      </group>)}
      <primitive object={rig.head} position={[0, .46, 0]}>
        <Ellipsoid position={[0, .19, 0]} scale={[.075, .09, .07]} color={palette.joint} />
        <Ellipsoid position={[0, .38, 0]} scale={[.15, .19, .145]} />
        <Ellipsoid position={[0, .38, .124]} scale={[.108, .047, .035]} color={palette.joint} />
      </primitive>
      {([-1, 1] as const).map(side => {
        const left = side === -1;
        return <primitive key={`arm-${side}`} object={left ? rig.leftShoulder : rig.rightShoulder} position={[side * .34, .46, 0]}>
          {patch('shoulders', [0, -.015, 0], [.125, .13, .125])}
          <Segment length={.34} radius={.085} />
          {patch('biceps', [0, -.18, .066], [.064, .12, .045])}
          {patch('triceps', [0, -.18, -.065], [.062, .125, .045])}
          <primitive object={left ? rig.leftElbow : rig.rightElbow} position={[0, -.34, 0]}>
            <Ellipsoid scale={[.07, .07, .07]} color={palette.joint} />
            <Segment length={.31} radius={.068} />
            <primitive object={left ? rig.leftHand : rig.rightHand} position={[0, -.34, 0]}>
              <Ellipsoid scale={[.067, .082, .048]} />
              {!noHandProp && (!singleWeight || left) && exercise.animation.prop === 'dumbbells' && (kettlebell ? <Kettlebell /> : <Dumbbell />)}
              {exercise.animation.prop === 'cable' && !legCable && (!singleWeight || left) && <Bar length={.18} radius={.03} />}
              {exercise.animation.prop === 'machine' && ['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'shoulder-isolation'].includes(exercise.movement) && id !== 'assisted-pull-up' && id !== 'assisted-dip' && !smith && !latBar && <Bar length={.2} radius={.035} />}
            </primitive>
          </primitive>
        </primitive>;
      })}
    </primitive>
    {([-1, 1] as const).map(side => {
      const left = side === -1;
      return <primitive key={`leg-${side}`} object={left ? rig.leftHip : rig.rightHip} position={[side * .145, -.08, 0]}>
        <Segment length={.46} radius={.115} />
        {patch('quads', [0, -.22, .084], [.09, .19, .054])}
        {patch('adductors', [-side * .083, -.22, .075], [.055, .165, .052])}
        {patch('hamstrings', [0, -.22, -.085], [.085, .18, .05])}
        <primitive object={left ? rig.leftKnee : rig.rightKnee} position={[0, -.46, 0]}>
          <Ellipsoid scale={[.084, .084, .084]} color={palette.joint} />
          {(id === 'assisted-pull-up' || id === 'assisted-dip') && <Box position={[0, -.1, 0]} scale={[.25, .1, .35]} />}
          {calfLoad && <group position={[0, .09, .08]}><Dumbbell /></group>}
          {(id === 'seated-hip-adduction' || id === 'seated-hip-abduction') && <Box position={[side * (id === 'seated-hip-adduction' ? -.09 : .09), .09, 0]} scale={[.1, .28, .25]} />}
          <Segment length={.43} radius={.082} />
          {patch('calves', [0, -.18, -.059], [.074, .15, .055])}
          <primitive object={left ? rig.leftAnkle : rig.rightAnkle} position={[0, -.43, 0]}>
            {(equipment.includes('leg-extension') || equipment.includes('leg-curl')) && (!exercise.animation.unilateral || left) && <group position={[0, .08, exercise.movement === 'knee-extension' ? .12 : -.12]}><Bar length={.24} radius={.09} color={palette.weight} /></group>}
            {legCable && anchors && (!exercise.animation.unilateral || left !== rightLegCable) && <Ellipsoid scale={[.1, .045, .1]} color={palette.primary} />}
            <Ellipsoid position={[0, -.025, .065]} scale={[.094, .065, .17]} color={palette.joint} />
          </primitive>
        </primitive>
      </primitive>;
    })}
  </primitive>
    {(bar || central || wheel || ball || sled || latBar) && <primitive object={rig.load}>
      {bar && <Barbell />}
      {latBar && <Bar length={1.15} radius={.03} />}
      {central && (kettlebell ? <Kettlebell /> : <group rotation={id === 'sumo-dumbbell-squat' || id.includes('triceps-extension') || id === 'goblet-squat' ? [0, 0, Math.PI / 2] : [0, 0, 0]}><Dumbbell /></group>)}
      {wheel && <><Bar length={.6} /><Bar length={.09} radius={.12} color={palette.weight} /></>}
      {ball && <Ellipsoid scale={[.23, .2, .23]} color={palette.secondary} />}
      {sled && <Box position={[0, 0, 0]} scale={[.85, .62, .08]} />}
    </primitive>}
    {anchors && <><primitive object={rig.leftCable}><Bar length={1} radius={exercise.animation.prop === 'machine' && !latBar ? .025 : .012} color={exercise.animation.prop === 'machine' && !latBar ? palette.metal : palette.primary} /></primitive>{!exercise.animation.unilateral && <primitive object={rig.rightCable}><Bar length={1} radius={exercise.animation.prop === 'machine' && !latBar ? .025 : .012} color={exercise.animation.prop === 'machine' && !latBar ? palette.metal : palette.primary} /></primitive>}</>}
    {bandBetween && <primitive object={rig.leftCable}><Bar length={1} radius={.015} color={palette.primary} /></primitive>}
  </>;
}
