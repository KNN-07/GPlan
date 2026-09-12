import type { Triple } from './motions';
import { palette } from './palette';

export function Ellipsoid({ position = [0, 0, 0], scale, color = palette.body }: {
  readonly position?: Triple; readonly scale: Triple; readonly color?: string;
}) {
  return <mesh position={position} scale={scale} castShadow receiveShadow>
    <sphereGeometry args={[1, 20, 14]} />
    <meshStandardMaterial color={color} roughness={.62} metalness={.15} />
  </mesh>;
}

export function Segment({ length, radius }: { readonly length: number; readonly radius: number }) {
  return <mesh position={[0, -length / 2, 0]} castShadow receiveShadow>
    <capsuleGeometry args={[radius, length - radius * 2, 5, 14]} />
    <meshStandardMaterial color={palette.body} roughness={.62} metalness={.15} />
  </mesh>;
}

export function Box({ position, scale, color = palette.weight }: {
  readonly position: Triple; readonly scale: Triple; readonly color?: string;
}) {
  return <mesh position={position} scale={scale} castShadow receiveShadow>
    <boxGeometry /><meshStandardMaterial color={color} roughness={.6} metalness={.3} />
  </mesh>;
}

export function Bar({ length, radius = .025, color = palette.metal }: {
  readonly length: number; readonly radius?: number; readonly color?: string;
}) {
  return <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
    <cylinderGeometry args={[radius, radius, length, 16]} />
    <meshStandardMaterial color={color} roughness={.4} metalness={.65} />
  </mesh>;
}
