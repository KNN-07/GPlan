import { Component, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { PCFShadowMap } from 'three';
import type { Exercise } from '../contracts';
import { Scene } from './Scene';
import type { CameraCommand, View } from './Scene';
import './viewer.css';

export type ExerciseViewerProps = {
  readonly exercise: Exercise; readonly playing?: boolean;
  readonly onPlayingChange?: (playing: boolean) => void; readonly className?: string;
};

class CanvasBoundary extends Component<{ readonly children: ReactNode; readonly fallback: ReactNode; readonly onFailure: () => void }, { readonly failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fallback({ exercise }: { readonly exercise: Exercise }) {
  return <div className="gv-fallback" role="status">
    <svg viewBox="0 0 80 100" width="64" height="80" aria-hidden="true">
      <circle cx="40" cy="14" r="10" /><path d="M40 30v34m-20-9 20-24 20 24M40 64 24 90m16-26 16 26" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
    <strong>3D preview unavailable</strong>
    <p>Your browser could not start or keep the 3D scene. The exercise details and muscle guide are still available.</p>
    <span>{exercise.name}</span>
    {exercise.instructions[0] && <p>{exercise.instructions[0]}</p>}
  </div>;
}

/** Mount in exercise detail only; all geometry and materials are generated locally. */
export function ExerciseViewer({ exercise, playing, onPlayingChange, className }: ExerciseViewerProps) {
  const root = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const [localPlaying, setLocalPlaying] = useState(true);
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [motionConsent, setMotionConsent] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [command, setCommand] = useState<CameraCommand>({ view: 'three-quarter', sequence: 0 });
  const requested = playing ?? localPlaying;
  const isPlaying = requested && (!reduced || motionConsent);
  const active = isPlaying && visible && pageVisible && ready && !failed;
  const onFailure = useCallback(() => setFailed(true), []);

  useEffect(() => {
    // R3F configures its renderer asynchronously, outside React error boundaries.
    // Probe the browser boundary first, then immediately release that temporary context.
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      if (context) { context.getExtension('WEBGL_lose_context')?.loseContext(); setReady(true); }
      else setFailed(true);
    } catch (error) {
      if (error instanceof Error) setFailed(true);
      else throw error;
    }
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    function preferenceChanged() { setReduced(media.matches); setMotionConsent(false); }
    function visibilityChanged() { setPageVisible(!document.hidden); }
    media.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    if (root.current) observer.observe(root.current);
    return () => {
      media.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', visibilityChanged); observer.disconnect();
    };
  }, []);

  function togglePlaying() {
    const next = !isPlaying;
    setMotionConsent(next); setLocalPlaying(next); onPlayingChange?.(next);
  }
  function changeView(view: View) { setCommand(current => ({ view, sequence: current.sequence + 1 })); }
  const fallback = <Fallback exercise={exercise} />;
  return <div ref={root} className={`exercise-viewer${className ? ` ${className}` : ''}`} data-playing={active} data-state={failed ? 'fallback' : ready ? 'ready' : 'loading'}>
    <div className="gv-scene" role="group" aria-label={`${exercise.name} interactive 3D muscle schematic`} aria-describedby={captionId}>
      <div className="gv-scene-label"><span>3D MUSCLE VIEW</span><span>{failed ? 'TEXT VIEW' : active ? 'IN MOTION' : 'PAUSED'}</span></div>
      {failed ? fallback : ready ? <CanvasBoundary fallback={fallback} onFailure={onFailure}>
        <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [3.1, 2.2, 4.5], fov: 36, near: .1, far: 50 }} frameloop={active ? 'always' : 'demand'} gl={{ antialias: true, powerPreference: 'low-power' }} fallback={fallback}>
          <Scene exercise={exercise} active={active} command={command} onContextLost={onFailure} />
        </Canvas>
      </CanvasBoundary> : <div className="gv-fallback" role="status">Preparing the 3D muscle view...</div>}
      {!failed && ready && <span className="gv-orbit-hint">Drag to rotate · Scroll to zoom</span>}
    </div>
    <div className="gv-controls" aria-label="3D preview controls">
      <button className="gv-play" type="button" onClick={togglePlaying} aria-pressed={isPlaying} disabled={failed}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">{isPlaying ? <path d="M5 3h4v14H5zm6 0h4v14h-4z" /> : <path d="m5 3 12 7-12 7z" />}</svg>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={() => changeView('three-quarter')} disabled={failed}>Reset view</button>
      <div className="gv-angles" aria-label="Camera angles">
        {(['front', 'side', 'back'] as const).map(view => <button key={view} type="button" onClick={() => changeView(view)} disabled={failed} aria-label={`${view} view`}>{view}</button>)}
      </div>
    </div>
    <div className="gv-legend" aria-label="Muscle highlight legend">
      <p><span className="gv-dot gv-primary" /><strong>Primary</strong><span>{exercise.primary.join(', ') || 'None listed'}</span></p>
      <p><span className="gv-dot gv-secondary" /><strong>Secondary</strong><span>{exercise.secondary.join(', ') || 'None listed'}</span></p>
    </div>
    <p id={captionId} className="gv-caption">Schematic motion, not a technique demonstration. {reduced && !motionConsent ? 'Reduced motion is on; press Play to animate.' : 'Use the written cues for exercise guidance.'}</p>
  </div>;
}
