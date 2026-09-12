# Graphics DAG node: delivered

`src/graphics/ExerciseViewer.tsx` exports the stable named `ExerciseViewer` with `exercise`, optional `playing`, `onPlayingChange`, and `className`. Scope remained `src/graphics/**` plus owned evidence. No App, dependency, configuration, shared catalog or contract edits were made by this worker.

## Delivered behavior

- Offline procedural articulated figure, primary/secondary muscle highlights, weights, benches and generic machine/cable props.
- All 14 frozen motion families, five postures and five prop categories; deterministic bounded loops and metadata-specific seated/unilateral variants.
- Unsupported `raise` + `hip-isolation` returns the static base posture, never an arm raise or approximate hip motion. Seated squat retains seated hips and seat height while its knees articulate.
- Play/pause, orbit, zoom and keyboard-accessible camera presets/reset; one canvas per viewer, DPR capped at 1.5, reduced-motion opt-in, hidden/offscreen/unmounted rendering pause.
- Accessible unavailable/context-loss fallback, visible muscle legend, and explicit schematic-not-technique label.
- Additive `adductors` mapping on both inner thighs, using the lead's new muscle literal and static seated hip-adduction record. No motion family change.

## Verification

| Check | Result | Evidence |
|---|---|---|
| `bun run test src/graphics` | **57/57 pass, exit 0**, 12:34:45 run | [exact output](st_01a093ef/scoped-exact.txt) |
| Focused Figure/motion/test compiler diagnostics | exit 0 | [output](st_01a093ef/hip-static-compiler.txt) |
| Latest isolated production entry build | exit 0; retained bundle warning | [build/browser log](st_01a093ef/pose-correction-green.txt) |
| Targeted hip-static and seated-squat browser checks | both pass over 20 rendered frames each; four screenshots; zero page errors | [exact output](st_01a093ef/pose-correction-green.txt) |
| Earlier browser baseline | 28 main checks, WebGL-disabled fallback and three catalog variants passed; old dynamic hip variant is superseded below | [main](st_01a093ef/browser-results.json), [variants](st_01a093ef/browser-variants.txt) |
| Final adductor mesh mapping | failing-first 0/2 patches, then 2/2; two captures; zero page errors | [red](st_01a093ef/adductors-red.txt), [green](st_01a093ef/adductors-green.txt) |

The intended RED run at 12:34:08 had **5 FAIL / 52 PASS** ([receipt](st_01a093ef/hip-static-red.txt)). Replacing the hip-isolation branch with the static base pose produced the **57 PASS** GREEN run at 12:34:45. Seated-squat assertions now cover bilateral/unilateral metadata and six phases.

Compiler command: `bunx tsc --ignoreConfig --noEmit --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/graphics/Figure.tsx src/graphics/motions.test.ts`.

The TypeScript LSP harness reports the server unavailable despite installation. Compiler diagnostics are the authoritative final substitute; no harness repair, dependency install or further LSP cycle is required. Historical direct-protocol logs are retained only as execution history.

## Visual evidence and self-review

Latest focused captures: hip-isolation static [front](st_01a093ef/correction-hip-front.png) / [angled](st_01a093ef/correction-hip-angled.png), and seated squat [front](st_01a093ef/correction-seated-front.png) / [angled](st_01a093ef/correction-seated-angled.png). All four were opened and inspected. Actual rig transforms remained identical throughout 20 hip-isolation render frames; seated squat retained pelvis height `0.65` and hip angles `[-1.5,-1.5]` throughout 20 frames.

Earlier adductor captures: [front](st_01a093ef/adductors-front.png) / [angled](st_01a093ef/adductors-angled.png), showing the two inner-thigh highlights and Adductors legend; this mapping is unchanged.

Historical baseline: [14 families](st_01a093ef/families-contact.png), [controls/camera](st_01a093ef/controls-contact.png), [mobile](st_01a093ef/responsive-375.png), [unsupported fallback](st_01a093ef/fallback-unsupported.png). Current hip-isolation evidence is the new static capture set above, not the earlier dynamic hip variant. No unrelated QA was expanded.

Self-review is complete, as required by the user contract; no reviewer panel is required or pending. Reviewed module responsibilities, finite/continuous sampling, muscle mapping, observer/control cleanup, error fallback, keyboard controls, and rendered evidence. No type suppressions, remote assets or sleep-based tests were introduced. Detailed implementation and historical receipts remain in [graphics details](st_01a093ef/graphics.md) and [execution history](st_01a093ef.md).

## Cleanup and remaining gaps

Temporary harness HTML/TSX, server launchers/PIDs and compiled harness output were removed, including the latest posture-correction harness and build. Browser/server cleanup was awaited; latest receipt is `POSE_CORRECTION_SERVER_CLOSED port=5197`. [Cleanup receipts](st_01a093ef/cleanup.txt).

No outstanding graphics verification assertion remains. Whole-app integration is lead-owned, not re-audited here. Retained nonblocking limits: generic schematic equipment is not technique/anatomy-accurate; the isolated full harness emits a large-bundle warning and installed R3F emits an upstream `THREE.Clock` deprecation warning. Detail-only lazy mounting is recommended. No Lighthouse or reviewer-panel verdict is claimed or required for this assigned deliverable.
