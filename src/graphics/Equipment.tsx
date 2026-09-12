import type { AnimationSpec } from '../contracts';
import { Bar, Box } from './Primitives';
import { palette } from './palette';

export function HandWeight({ prop, left }: { readonly prop: AnimationSpec['prop']; readonly left: boolean }) {
  switch (prop) {
    case 'none': return null;
    case 'dumbbells': return <group><Bar length={.34} />{[-.14, .14].map(x => <group key={x} position={[x, 0, 0]}><Bar length={.09} radius={.1} color={palette.weight} /><Bar length={.095} radius={.045} color={palette.primary} /></group>)}</group>;
    case 'barbell': return left ? <group position={[.36, 0, 0]}><Bar length={1.65} />{[-.67, .67].map(x => <group key={x} position={[x, 0, 0]}><Bar length={.13} radius={.23} color={palette.weight} /><Bar length={.145} radius={.07} color={palette.primary} /></group>)}</group> : null;
    case 'cable':
    case 'machine': return <Bar length={.22} radius={.035} color={palette.joint} />;
    default: return unreachable(prop);
  }
}

function unreachable(value: never): never { throw new Error(`Unsupported prop: ${value}`); }

function Bench({ upright }: { readonly upright: boolean }) {
  return <group>
    <Box position={[0, .45, upright ? .08 : 0]} scale={[.5, .14, upright ? .6 : 1.9]} />
    {[-.52, .52].map(z => <group key={z} position={[0, 0, upright ? z * .4 : z]}>
      <Box position={[0, .21, 0]} scale={[.1, .42, .1]} color={palette.metal} />
      <Box position={[0, .04, 0]} scale={[.7, .08, .15]} />
    </group>)}
    {upright && <Box position={[0, .96, -.25]} scale={[.46, .95, .12]} />}
  </group>;
}

export function Equipment({ animation }: { readonly animation: AnimationSpec }) {
  let support;
  switch (animation.posture) {
    case 'standing': support = null; break;
    case 'seated': support = <Bench upright />; break;
    case 'supine':
    case 'prone': support = <Bench upright={false} />; break;
    case 'quadruped': support = <Box position={[0, .015, 0]} scale={[1.15, .03, 2.1]} color={palette.joint} />; break;
    default: return unreachable(animation.posture);
  }
  let apparatus;
  switch (animation.prop) {
    case 'none':
    case 'dumbbells':
    case 'barbell': apparatus = null; break;
    case 'cable':
    case 'machine': apparatus = <group position={[0, 0, -.7]}>
      {[-.75, .75].map(x => <group key={x} position={[x, 0, 0]}>
        <Box position={[0, 1.15, 0]} scale={[.08, 2.3, .1]} color={palette.metal} />
        <Box position={[0, .04, .25]} scale={[.32, .08, 1.1]} />
      </group>)}
      <Box position={[0, 2.28, 0]} scale={[1.6, .1, .1]} color={palette.metal} />
      <Box position={[.75, 1.2, 0]} scale={[.02, 2.1, .025]} color={palette.primary} />
      {Array.from({ length: 7 }, (_, index) => <Box key={index} position={[.75, .2 + index * .09, 0]} scale={[.35, .065, .3]} />)}
      <group position={[0, 2.2, .08]}><Bar length={1.15} radius={.035} color={palette.joint} /></group>
    </group>; break;
    default: return unreachable(animation.prop);
  }
  return <group>{support}{apparatus}</group>;
}
