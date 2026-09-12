# Graphics implementation and visual proof

Canonical DAG-node completion report: [../graphics.md](../graphics.md).

## Latest additive mapping: adductors

The new `adductors` contract literal is mapped to two inner-thigh patches in `Figure.tsx`. Real seated hip-adduction scene inspection failed first with 0 primary muscle meshes, then passed with exactly 2. No motion family or shared catalog/contract was changed by this worker.

Final focused captures: [front](adductors-front.png) and [angled](adductors-angled.png), both 1000x1000 PNG. The static seated pose, muscle legend, and schematic-not-technique label are retained. The scoped 52-test suite and focused Figure TypeScript diagnostic check pass. The temporary follow-up harness is removed and port 5197 is closed. Earlier complete motion/control captures below are the pre-additive baseline; no unrelated QA was expanded for this follow-up.

## Export and rendering

`import { ExerciseViewer } from './graphics/ExerciseViewer'` exports the exact frozen component contract. It supports controlled and uncontrolled playback, optional className composition, native keyboard controls, front/side/back presets, orbit drag, wheel zoom, and reset. One canvas is mounted per viewer; the host owns detail-only mounting.

Everything is generated offline: articulated capsule/ellipsoid mannequin, muscle patches, weights, bench, mat and generic machine/cable frame. Primary muscle patches are lime and secondary patches warm peach, with visible text legends. A lit charcoal stage and floor grid give spatial orientation against the ivory host surface. See [DESIGN.md](DESIGN.md) for the component-level visual contract.

## Motion contract

Latest correction: unsupported `raise` + `hip-isolation` is a static schematic, not approximate arm/hip animation. Seated squat preserves hip angles `-1.5` and pelvis height `.65`; the knees articulate in the seated configuration. Targeted RED was 5 failed / 52 passed; final GREEN is **57 passed**. Real-browser checks sampled 20 frames per case with zero page errors. [Output](pose-correction-green.txt), [hip front](correction-hip-front.png), [hip angled](correction-hip-angled.png), [seated front](correction-seated-front.png), [seated angled](correction-seated-angled.png).

Earlier dynamic hip-abduction variant screenshots below are historical and superseded by this static fallback. The correction harness/build were removed and its server was closed; no additional LSP or reviewer tooling was used.

- Four-second, cosine-eased closed loops for squat, hinge, lunge, horizontal/vertical press, horizontal/vertical pull, curl, extension, raise, calf raise, crunch, leg curl, and static hold.
- Pure sampling returns finite bounded root/joint transforms for 700 family/posture/prop/unilateral combinations across eight representative phases, including negative and large phases. Separate assertions cover loop seams, periodicity, determinism, active articulation and static holds.
- Metadata distinguishes seated leg press, unilateral lower-body support, knee versus elbow extension, and static hip-isolation fallback versus shoulder raises. No frozen type was altered by this worker.
- The animation clock stops on pause, document visibility change, real offscreen IntersectionObserver transition, and unmount; suspension deltas are capped. Reduced motion starts paused and allows an explicit Play opt-in. Orbit remains available while paused.
- WebGL-disabled browsers and actual `WEBGL_lose_context` produce accessible DOM fallbacks with exercise information and retained legends instead of a blank canvas.

## Browser evidence

Real installed Chromium, Linux, local isolated port 5197. DOM controls were clicked; geometry was actually rendered by WebGL. The harness was not an image mock. Browser synchronization subscribed to actual GL frame signals or exact state changes, with bounded failure timeouts; no fixed sleeps or polling delays.

28 main checks passed, including pixel-identical pause, identical reset restoration, changed orbit/zoom/play pixels, 1.5 measured DPR on a DPR-2 context, all 14 families, 375/768/1280 responsive widths, network-offline interaction, real offscreen rendering stop, document visibility handling, unmount, uncontrolled props/className, reduced motion and actual context loss. WebGL-disabled startup and three catalog variants also passed. Exact outputs are in [browser.txt](browser.txt), [browser-results.json](browser-results.json) and [browser-variants.txt](browser-variants.txt).

### Complete capture set

- `family-*.png`: every one of the 14 frozen motion families; five postures and all five prop categories appear. [Contact sheet](families-contact.png).
- `angle-front.png`, `angle-side.png`, `angle-back.png`, `angle-orbit.png`, `angle-zoom.png`: real camera interaction from distinct angles.
- `desktop-paused.png`, `desktop-motion.png`, `reduced-motion.png`: playback and motion preference states. [Control contact sheet](controls-contact.png).
- `responsive-375.png`, `responsive-768.png`: no horizontal overflow, wrapping controls/legend, readable labels.
- `fallback-context-loss.png`, `fallback-unsupported.png`: retained accessible information at tablet/mobile widths.
- `variant-single-leg-leg-press.png`, `variant-single-leg-romanian-deadlift.png`, `variant-cable-hip-abduction.png`: actual catalog metadata for lower-body edge cases.

29 direct PNG captures plus two contact sheets. [screenshots.txt](screenshots.txt) records validated PNG signatures and dimensions. DPR-2 screenshots are twice the CSS viewport width; fallback/variant contexts use DPR 1. [motion-diff.json](motion-diff.json) is an objective paused-versus-motion comparison, not an independent design verdict.

## Verification and limitations

The scoped Vitest command passes all 57 tests, the final focused Figure/motion/test compiler diagnostic check passes, and the latest isolated production entry builds. The TypeScript LSP harness remains unavailable; historical direct native TS7 logs are not a claim that the wrapper works. Full command outputs, failing-first receipts, integration warnings and cleanup receipts are linked from [the execution history](../st_01a093ef.md).

Source and captures were inspected locally and self-review is complete. The user contract requires self-review rather than a reviewer panel, so no independent panel is required or pending. No Lighthouse score is claimed for this isolated component. The host should lazy-load the viewer in detail only; the full verification harness has a large Three/R3F bundle warning.

These are muscle/movement schematics, not anatomy-accurate technique demonstrations. Generic equipment is a visual context cue, not per-exercise mechanical rigging. The same limitation is visible to users in the component caption.

## Cleanup

The server was explicitly closed with `await server.close()`. The temporary harness HTML/TSX, server launcher/PID and compiled output were removed. [cleanup.txt](cleanup.txt) contains the exact completion receipts. No app, dependency, configuration or contract changes were made by this node.
