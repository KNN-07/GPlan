import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Exercise } from '../contracts';
import type { Triple } from './motions';
import { Figure } from './Figure';
import { Equipment } from './Equipment';
import { palette } from './palette';

export type View = 'three-quarter' | 'front' | 'side' | 'back';
export type CameraCommand = { readonly view: View; readonly sequence: number };
const positions: Record<View, Triple> = { 'three-quarter': [3.1, 2.2, 4.5], front: [0, 1.75, 5.5], side: [5.5, 1.75, 0], back: [0, 1.75, -5.5] };

function CameraControls({ command, onContextLost }: { readonly command: CameraCommand; readonly onContextLost: () => void }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = false; controls.enablePan = false;
    controls.minDistance = 3.5; controls.maxDistance = 8;
    controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI / 2 + .12;
    controls.target.set(0, 1.1, 0);
    function changed() { invalidate(); }
    controls.addEventListener('change', changed);
    camera.position.set(...positions[command.view]);
    controls.update(); invalidate();
    function contextLost(event: Event) { event.preventDefault(); onContextLost(); }
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    return () => {
      controls.removeEventListener('change', changed); controls.dispose();
      gl.domElement.removeEventListener('webglcontextlost', contextLost);
    };
  }, [camera, command, gl, invalidate, onContextLost]);
  return null;
}

export function Scene({ exercise, active, command, onContextLost }: {
  readonly exercise: Exercise; readonly active: boolean; readonly command: CameraCommand; readonly onContextLost: () => void;
}) {
  return <>
    <color attach="background" args={[palette.scene]} />
    <fog attach="fog" args={[palette.scene, 8, 16]} />
    <ambientLight intensity={.7} />
    <hemisphereLight args={['#e6efdf', '#323e33', 1.2]} />
    <directionalLight position={[3, 6, 4]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={4} shadow-camera-bottom={-3} shadow-normalBias={.04} />
    <directionalLight position={[-4, 3, -3]} intensity={2.2} color="#bfd0de" />
    <mesh position={[0, -.085, 0]} receiveShadow>
      <cylinderGeometry args={[1.7, 1.76, .12, 64]} />
      <meshStandardMaterial color={palette.stage} roughness={.8} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]}>
      <ringGeometry args={[1.65, 1.66, 80]} /><meshBasicMaterial color={palette.line} />
    </mesh>
    <gridHelper args={[20, 40, palette.line, palette.stage]} position={[0, -.16, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.165, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} /><meshStandardMaterial color={palette.scene} roughness={1} />
    </mesh>
    <Equipment animation={exercise.animation} />
    <Figure key={exercise.id} exercise={exercise} active={active} />
    <CameraControls command={command} onContextLost={onContextLost} />
  </>;
}
