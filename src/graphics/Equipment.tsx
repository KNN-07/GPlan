import type { Exercise } from '../contracts';
import type { Triple } from './motions';
import { Bar, Box, Ellipsoid } from './Primitives';
import { palette } from './palette';

export function Dumbbell() {
  return <group><Bar length={.34} />{[-.14, .14].map(x => <group key={x} position={[x, 0, 0]}><Bar length={.09} radius={.1} color={palette.weight} /><Bar length={.095} radius={.045} color={palette.primary} /></group>)}</group>;
}

export function Barbell() {
  return <group><Bar length={1.65} />{[-.67, .67].map(x => <group key={x} position={[x, 0, 0]}><Bar length={.13} radius={.23} color={palette.weight} /><Bar length={.145} radius={.07} color={palette.primary} /></group>)}</group>;
}

export function Kettlebell() {
  return <group><mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.085, .022, 8, 20]} /><meshStandardMaterial color={palette.metal} /></mesh><Ellipsoid position={[0, -.16, 0]} scale={[.13, .14, .13]} color={palette.weight} /></group>;
}

export function Bench({ position = [0, 0, 0], incline = 0, upright = false, backrest = true }: { readonly position?: Triple; readonly incline?: number; readonly upright?: boolean; readonly backrest?: boolean }) {
  return <group position={position}>
    <Box position={[0, .45, .12]} scale={[.5, .14, upright ? .6 : 1.65]} />
    {[-.5, .5].map(z => <group key={z} position={[0, 0, upright ? z * .4 : z]}><Box position={[0, .21, 0]} scale={[.1, .42, .1]} color={palette.metal} /><Box position={[0, .04, 0]} scale={[.7, .08, .15]} /></group>)}
    {upright && backrest && <Box position={[0, .97, -.23]} scale={[.46, .95, .12]} />}
    {incline !== 0 && <group position={[0, .52, 0]} rotation={[incline, 0, 0]}><Box position={[0, 0, -.52]} scale={[.48, .12, 1.12]} /></group>}
  </group>;
}

export function cableAnchors(exercise: Exercise): readonly [Triple, Triple] | undefined {
  const id = exercise.id;
  const band = exercise.equipmentOptions[0]?.includes('bands');
  if (exercise.animation.prop === 'machine' && ['horizontal-push', 'vertical-push', 'horizontal-pull', 'shoulder-isolation'].includes(exercise.movement) && !id.includes('assisted') && !id.includes('smith')) return [[-.55, 1.35, .7], [.55, 1.35, .7]];
  if (exercise.animation.prop !== 'cable' && !band && !id.includes('pulldown')) return undefined;
  if (id === 'pallof-press') return [[1.2, 1.43, 0], [1.2, 1.43, 0]];
  if (id === 'band-pull-apart' || id === 'standing-band-hip-abduction') return undefined;
  if (id === 'band-assisted-pull-up') return [[0, 2.65, 0], [0, 2.65, 0]];
  if (id.includes('hip-adduction') || id.includes('hip-abduction')) return [[-.95, .1, 0], [-.95, .1, 0]];
  if (id.includes('knee-extension')) return [[-.145, .08, -.7], [.145, .08, -.7]];
  if (id === 'prone-band-leg-curl') return [[-.145, .05, -1.4], [.145, .05, -1.4]];
  if (id === 'cable-pull-through') return [[0, .1, -.95], [0, .1, -.95]];
  if (id === 'band-good-morning' || id === 'band-curl' || id === 'band-overhead-press' || id === 'band-lateral-raise') return [[-.145, .02, 0], [.145, .02, 0]];
  if (id.includes('fly')) {
    const y = id.includes('low-to-high') ? .12 : id.includes('high-to-low') ? 2.1 : 1.35;
    return [[-1.05, y, -.55], [1.05, y, -.55]];
  }
  if (id.includes('overhead-cable')) return [[0, 2.25, -.8], [0, 2.25, -.8]];
  const y = id.includes('curl') || id === 'seated-cable-row' || id.includes('lateral-raise') ? .12 : id.includes('face-pull') ? 1.8 : id.includes('row') ? 1.25 : 2.35;
  return [[-.2, y, .95], [.2, y, .95]];
}

export function Equipment({ exercise }: { readonly exercise: Exercise }) {
  const id = exercise.id;
  const equipment = exercise.equipmentOptions[0] ?? [];
  const anchors = cableAnchors(exercise);
  const hanging = id === 'pull-up' || id === 'chin-up' || id === 'assisted-pull-up' || id === 'band-assisted-pull-up';
  const dip = id === 'parallel-bar-dip' || id === 'assisted-dip';
  const legPress = equipment.includes('leg-press');
  const machineSeat = exercise.animation.prop === 'machine' && exercise.animation.posture === 'seated';
  let support = null;
  if (id === 'wall-push-up') {
    support = <mesh position={[0, 1.05, .8]}><boxGeometry args={[1.35, 2.1, .1]} /><meshStandardMaterial color={palette.metal} transparent opacity={.2} depthWrite={false} /></mesh>;
  } else if (id === 'wall-sit' || id === 'standing-calf-raise' || id === 'single-leg-calf-raise' || id === 'standing-band-hip-abduction') {
    support = <Box position={id === 'wall-sit' ? [0, 1, -.24] : [-.65, .85, .1]} scale={id === 'wall-sit' ? [1.35, 2.1, .1] : [.1, 1.7, .65]} color={palette.metal} />;
  } else if (id === 'stability-ball-crunch') {
    support = <Ellipsoid position={[0, .36, 0]} scale={[.36, .36, .36]} color={palette.secondary} />;
  } else if (id.includes('bulgarian')) {
    support = <Bench position={[0, -.09, -.74]} upright backrest={false} />;
  } else if (id === 'barbell-hip-thrust') {
    support = <group rotation={[0, Math.PI / 2, 0]}><Bench position={[.63, 0, 0]} /></group>;
  } else if (id === 'incline-push-up') {
    support = <Bench position={[0, 0, 1.65]} upright backrest={false} />;
  } else if (id === 'decline-push-up') {
    support = <Bench position={[0, 0, -.12]} upright backrest={false} />;
  } else if (id === 'box-squat') {
    support = <Bench position={[0, .08, -.5]} upright backrest={false} />;
  } else if (id === 'single-arm-dumbbell-row') {
    support = <Bench position={[.27, 0, .2]} />;
  } else if (id === 'chest-supported-dumbbell-row') {
    support = <group><group position={[0, .84, .3]} rotation={[-.52, 0, 0]}><Box position={[0, 0, 0]} scale={[.48, .12, .7]} /></group>{[.04, .5].map(z => <Box key={z} position={[0, .34, z]} scale={[.12, .68, .12]} color={palette.metal} />)}<Box position={[0, .04, .27]} scale={[.75, .08, .85]} /></group>;
  } else if (id === 'dumbbell-preacher-curl') {
    support = <group><Box position={[-.34, .65, .19]} scale={[.08, 1.3, .08]} color={palette.metal} /><group position={[-.34, 1.38, .19]} rotation={[-.95, 0, 0]}><Box position={[0, 0, 0]} scale={[.35, .1, .48]} /></group></group>;
  } else if (equipment.includes('bench') || machineSeat || equipment.includes('leg-curl') || id === 'seated-cable-row') {
    const incline = id === 'incline-dumbbell-curl' ? 1.07 : id.includes('incline') ? .52 : 0;
    const lowerSeated = ['knee-extension', 'knee-flexion', 'hip-isolation', 'plantar-flexion'].includes(exercise.movement) && exercise.animation.posture === 'seated';
    support = <Bench position={[0, lowerSeated ? -.09 : equipment.includes('leg-curl') ? -.03 : 0, 0]} incline={incline} upright={exercise.animation.posture === 'seated' && !incline} backrest={id !== 'seated-dumbbell-calf-raise' && id !== 'seated-band-knee-extension'} />;
  } else if (['supine', 'prone', 'quadruped'].includes(exercise.animation.posture) || id === 'cable-crunch' || id === 'kneeling-band-pulldown' || id === 'single-arm-cable-pulldown') {
    support = <Box position={[0, -.005, .1]} scale={[2.6, .02, 3.15]} color={palette.joint} />;
  }
  return <group>{support}
    {(hanging || id === 'inverted-row') && <group position={[0, 0, hanging ? 0 : -1.45]}>{[-.85, .85].map(x => <Box key={x} position={[x, hanging ? 1.34 : .55, 0]} scale={[.065, hanging ? 2.68 : 1.1, .065]} color={palette.metal} />)}<group position={[0, hanging ? 2.65 : 1.04, 0]}><Bar length={1.8} radius={.035} /></group></group>}
    {dip && [-.34, .34].map(x => <group key={x} position={[x, 1.15, .03]} rotation={[0, Math.PI / 2, 0]}><Bar length={.9} radius={.035} /><Box position={[0, -.575, 0]} scale={[.07, 1.15, .07]} color={palette.metal} /></group>)}
    {(equipment.includes('smith-machine') || equipment.includes('rack')) && id !== 'inverted-row' && <group>{[-.9, .9].map(x => <group key={x}><Box position={[x, 1.2, -.18]} scale={[.06, 2.4, .06]} color={palette.metal} /><Box position={[x, .55, .08]} scale={[.08, .08, .8]} /><Box position={[x, .035, 0]} scale={[.35, .07, 1.2]} /></group>)}</group>}
    {legPress && <group position={[0, .4, .8]} rotation={[-.7, 0, 0]}>{[-.46, .46].map(x => <Box key={x} position={[x, .4, 0]} scale={[.08, 1.75, .09]} color={palette.metal} />)}</group>}
    {equipment.includes('calf-machine') && <group>{[-.5, .5].map(x => <Box key={x} position={[x, .95, -.2]} scale={[.07, 1.9, .07]} color={palette.metal} />)}</group>}
    {machineSeat && !legPress && <Box position={[.65, .62, -.3]} scale={[.24, 1.24, .38]} color={palette.metal} />}
    {id === 'machine-seated-row' && <Box position={[0, 1.02, .26]} scale={[.35, .45, .12]} />}
    {id === 'reverse-pec-deck' && <Box position={[0, 1.01, .23]} scale={[.42, .65, .12]} />}
    {equipment.includes('lat-pulldown') && <><Box position={[0, 1.25, .95]} scale={[.12, 2.5, .12]} color={palette.metal} /><Box position={[0, 2.47, .55]} scale={[.1, .08, .9]} color={palette.metal} /><Box position={[0, .65, .35]} scale={[.65, .12, .2]} /></>}
    {machineSeat && !legPress && !equipment.includes('lat-pulldown') && <Box position={[0, 1.35, .7]} scale={[1.2, .08, .08]} color={palette.metal} />}
    {anchors && exercise.animation.prop === 'cable' && anchors.map((anchor, index) => <group key={index} position={[anchor[0], 0, anchor[2]]}><Box position={[0, 1.2, 0]} scale={[.07, 2.4, .09]} color={palette.metal} /><Box position={[0, .035, 0]} scale={[.3, .07, .4]} /><Ellipsoid position={[0, anchor[1], 0]} scale={[.065, .065, .045]} color={palette.primary} /></group>)}
  </group>;
}
