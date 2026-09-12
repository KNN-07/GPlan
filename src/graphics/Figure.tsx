import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { Exercise, Muscle } from '../contracts';
import { advancePhase, sampleMotion } from './motions';
import type { MotionPose, Triple } from './motions';
import { Ellipsoid, Segment } from './Primitives';
import { HandWeight } from './Equipment';
import { palette } from './palette';

function createRig() {
  return { root: new Group(), spine: new Group(), leftShoulder: new Group(), rightShoulder: new Group(), leftElbow: new Group(), rightElbow: new Group(), leftHip: new Group(), rightHip: new Group(), leftKnee: new Group(), rightKnee: new Group(), leftAnkle: new Group(), rightAnkle: new Group() };
}
type Rig = ReturnType<typeof createRig>;

function applyPose(rig: Rig, pose: MotionPose) {
  rig.root.position.set(...pose.position); rig.root.rotation.set(...pose.rotation);
  rig.spine.rotation.x = pose.spine;
  rig.leftShoulder.rotation.set(...pose.leftArm.shoulder); rig.rightShoulder.rotation.set(...pose.rightArm.shoulder);
  rig.leftElbow.rotation.x = -pose.leftArm.elbow; rig.rightElbow.rotation.x = -pose.rightArm.elbow;
  rig.leftHip.rotation.x = pose.leftLeg.hip; rig.rightHip.rotation.x = pose.rightLeg.hip;
  rig.leftKnee.rotation.x = pose.leftLeg.knee; rig.rightKnee.rotation.x = pose.rightLeg.knee;
  rig.leftAnkle.rotation.x = pose.leftLeg.ankle; rig.rightAnkle.rotation.x = pose.rightLeg.ankle;
}

export function Figure({ exercise, active }: { readonly exercise: Exercise; readonly active: boolean }) {
  const rig = useMemo(createRig, []);
  const phase = useRef(0);
  useLayoutEffect(() => { phase.current = 0; applyPose(rig, sampleMotion(exercise.animation, 0, exercise.movement)); }, [exercise, rig]);
  useFrame((_, delta) => {
    phase.current = advancePhase(phase.current, delta, active);
    applyPose(rig, sampleMotion(exercise.animation, phase.current, exercise.movement));
  });
  function muscleColor(muscle: Muscle) {
    return exercise.primary.includes(muscle) ? palette.primary : exercise.secondary.includes(muscle) ? palette.secondary : palette.body;
  }
  function patch(muscle: Muscle, position: Triple, scale: Triple) {
    return <Ellipsoid position={position} scale={scale} color={muscleColor(muscle)} />;
  }
  return <primitive object={rig.root}>
    <Ellipsoid scale={[.25, .18, .17]} color={palette.joint} />
    {[-1, 1].map(side => <group key={`glute-${side}`}>
      {patch('glutes', [side * .12, -.025, -.12], [.14, .16, .09])}
    </group>)}
    <primitive object={rig.spine} position={[0, .09, 0]}>
      <Ellipsoid position={[0, .29, 0]} scale={[.27, .34, .15]} />
      {patch('core', [0, .12, .115], [.16, .18, .055])}
      {[-1, 1].map(side => <group key={`torso-${side}`}>
        {patch('chest', [side * .135, .42, .12], [.145, .145, .065])}
        {patch('back', [side * .12, .34, -.12], [.13, .23, .06])}
      </group>)}
      <Ellipsoid position={[0, .65, 0]} scale={[.075, .09, .07]} color={palette.joint} />
      <Ellipsoid position={[0, .84, 0]} scale={[.15, .19, .145]} />
      <Ellipsoid position={[0, .84, .124]} scale={[.108, .047, .035]} color={palette.joint} />
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
            <group position={[0, -.34, 0]}>
              <Ellipsoid scale={[.067, .082, .048]} />
              <HandWeight prop={exercise.animation.prop} left={left} />
            </group>
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
          <Segment length={.43} radius={.082} />
          {patch('calves', [0, -.18, -.059], [.074, .15, .055])}
          <primitive object={left ? rig.leftAnkle : rig.rightAnkle} position={[0, -.43, 0]}>
            <Ellipsoid position={[0, -.025, .065]} scale={[.094, .065, .17]} color={palette.joint} />
          </primitive>
        </primitive>
      </primitive>;
    })}
  </primitive>;
}
