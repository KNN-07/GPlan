# Core / AI / graphics integrated verification

Task: `st_01a09420` | Date: 2026-09-12 | Repository: `/home/norman/Repos/GPlan`

## Outcome

**Required module gates PASS; integrated browser surface has precise defects below, so this is not an unconditional overall PASS.** No production files were edited and no commit was created. Only this report and `core-verification/` evidence were authored. The requested build regenerated normal ignored build outputs.

- `bun run test src/core src/ai src/graphics`: **exit 0**, **7 files / 191 tests passed**, first and only run, 1.88s.
- `bun run build`: **exit 0**, TypeScript build succeeded, Vite transformed 165 modules, PWA precached 18 entries (1359.75 KiB).
- Catalog: **158 exercises / 158 unique IDs / 158 unique names**, 11 primary muscle groups, 24 equipment types, 14 motion families. All exercises have three instruction entries. **948 actual catalog pose samples** were finite and bounded.
- Public API inspection: **matches the frozen contract**.
- Additional actual-catalog cross-module smoke: **exit 0**. Real local HTTP model discovery and generation -> validated AI draft -> materialized plan -> available ranked swap -> strict state export/import -> graphics sampling of all 16 resulting workout items. Provider payload contained exactly 52 equipment-eligible bundled exercises; transient credential was not persisted or included in the request body.

## Captured commands and outputs

All commands ran on this Linux x64 workstation, not a remote machine. Test workers were the configured pool of four.

| Command | Exit | Capture |
| --- | ---: | --- |
| `bun run test src/core src/ai src/graphics` | 0 | [tests.log](core-verification/tests.log) |
| `node .omo/evidence/st_01a093ef/lsp-check.mjs` | 0 | [lsp.log](core-verification/lsp.log), 9 graphics TS/TSX files, empty diagnostics for every file |
| `bun run build` | 0 | [build.log](core-verification/build.log) |
| `bun .omo/evidence/core-verification/integration.ts` | 0 | [integration.log](core-verification/integration.log); [executable](core-verification/integration.ts) |
| `node .omo/evidence/core-verification/browser.mjs` | **1** | [browser.log](core-verification/browser.log); [executable](core-verification/browser.mjs) |
| `node .omo/evidence/core-verification/layout-probe.mjs` | 0 | [layout-probe.log](core-verification/layout-probe.log), [measurements](core-verification/layout-probe.json); diagnostic probe, not a passing assertion suite |

Shell commands captured combined stdout/stderr through `tee`, preserved the actual process status via `PIPESTATUS[0]`, appended `COMMAND_EXIT`, and exited with that status. The browser scripts start Vite's production preview on `127.0.0.1:5198`, launch installed Chromium with SwiftShader, and close both processes in `finally`. Service workers are blocked for these surface checks to avoid stale-cache ambiguity; this is not a PWA certification.

The catalog command was:

```sh
bun -e 'import {exercises,exerciseById} from "./src/catalog"; import {sampleMotion} from "./src/graphics/motions"; import assert from "node:assert/strict"; assert.ok(exercises.length>=120); assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length); assert.equal(new Set(exercises.map(e=>e.name)).size,exercises.length); assert.equal(exerciseById.size,exercises.length); let samples=0; for(const e of exercises){assert.equal(e.instructions.length,3); for(const phase of [0,.125,.25,.5,.75,1]){const pose=sampleMotion(e.animation,phase,e.movement); const numbers=(v)=>typeof v==="number"?[v]:typeof v==="object"&&v!==null?Object.values(v).flatMap(numbers):[]; assert.ok(numbers(pose).every(n=>Number.isFinite(n)&&Math.abs(n)<=Math.PI+1)); samples++}} console.log(JSON.stringify({exercises:exercises.length,uniqueIds:exerciseById.size,uniqueNames:new Set(exercises.map(e=>e.name)).size,primaryMuscles:new Set(exercises.flatMap(e=>e.primary)).size,equipment:new Set(exercises.flatMap(e=>e.equipmentOptions.flat())).size,motionFamilies:new Set(exercises.map(e=>e.animation.family)).size,catalogPoseSamples:samples},null,2));'
```

Output: [catalog.log](core-verification/catalog.log), exit 0.

## Defects and exact reproduction

### D1: Open graphics detail does not shrink correctly after desktop-to-mobile resize

**Confirmed graphics/UI integration defect; medium severity.**

1. Serve the successfully built production output.
2. At 1280x1000, open `View Dumbbell curl` and allow its actual WebGL canvas to render.
3. Resize the same page, keeping the dialog mounted, to 375x900.
4. The `.detail-grid` content box is **303px**, but its computed single track and `.exercise-viewer` remain **450px**. The dialog has **335px clientWidth / 466px scrollWidth**. Side/back controls and right-hand text are clipped or require horizontal scrolling.

Reproduced by `layout-probe.mjs`; visually inspected [resized mobile screenshot](core-verification/probe-resized-mobile-detail.png). Compare [fresh mobile detail](core-verification/probe-fresh-mobile-detail.png), where the grid and viewer are both **303px**, and [desktop detail](core-verification/probe-desktop-detail.png), which fits normally.

Trace: `src/ui/ExerciseDetail.tsx` mounts the viewer inside an otherwise unstyled grid-item div; `src/styles.css:5` uses `.detail-grid{grid-template-columns:1fr}` and `.detail-grid>div:first-child{max-width:450px;margin:auto;width:100%}`. The mounted canvas contributes to the grid item's automatic minimum sizing after resize. `src/graphics/viewer.css:2-5` sets `min-width:0` on the nested viewer, not that parent grid item. These relevant source rules still match the built rules. A zero-minimum grid track/grid-item sizing correction is the recommended repair; no repair was applied here.

### D2: Built mobile catalog has 4px of horizontal page overflow

**Confirmed in this turn's built snapshot; low severity; newer source differs.**

At a fresh 375x900 viewport, even with no dialog/canvas, `document.documentElement.scrollWidth` is **379**, not 375. `.focus-chips` extends from x=16 to x=379. The <=375px main padding is 16px while this build retains the wider-breakpoint -20px right margin on the chips row.

This is the exact assertion that failed at `core-verification/browser.mjs:73`:

```text
AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
COMMAND_EXIT=1
```

The probe confirms the same 379px width on fresh mobile home, fresh mobile detail, and after closing the resized detail. This is independent of D1.

**Concurrent-work caveat:** build CSS `dist/assets/index-D5ezoilf.css` was written at 12:41:34 +0700. `src/styles.css` was subsequently changed by another worker (mtime observed 12:43:40 +0700) and now includes `.focus-chips,.day-tabs{margin-right:-16px;padding-right:16px}` in the <=375px rule; the built file does not. That newer source correction was not rebuilt or browser-verified by this child. Do not report D2 as proven unfixed in the latest source. Source/build hashes and mtimes are captured in [snapshot.json](core-verification/snapshot.json).

## Public API and actual-code inspection

Read `src/contracts.ts`, `.omo/contracts.md`, every production file and test in `src/core`, `src/ai`, and `src/graphics`, all seven catalog files, and the actual UI callers (`Catalog`, `ExerciseDetail`, `PlanDialogs`, `AiSettings`, `usePlanner`, `App`, and dialog primitives).

| Frozen module | Inspection result |
| --- | --- |
| `catalog` | `exercises: readonly Exercise[]` and `exerciseById: ReadonlyMap<string, Exercise>` exactly present. IDs and names verified unique at runtime. |
| `core/catalog` | `isAvailable`, `queryExercises`, `findSwaps` have the specified argument and return types, including optional limit and readonly results. Availability uses OR-of-AND equipment options; swaps exclude the original and unavailable exercises and rank shared primary muscles deterministically. |
| `core/planner` | All three specified exports and signatures match, including the five-argument `replaceExercise`. Injected identity/time are used. Local generation filters equipment, difficulty and focus; AI materialization clones prescriptions; cross-kind swaps reset prescription without changing item identity/sets/rest. |
| `core/storage` | `defaultState`, `loadState`, `saveState`, `exportState`, `importState` match. Strict nested schemas reject extra fields including keys, unknown exercise IDs, incompatible prescriptions and duplicate IDs; corrupt/newer saved data is not overwritten. |
| `ai/index` | Exports `AiError`, `discoverModels`, `generatePlan` exactly as specified, with transient key and optional AbortSignal. `AiError.code` uses `AiErrorCode`, and status is optional. Shared types are imported rather than recreated incompatibly. |
| `graphics/ExerciseViewer` | Named component matches required exercise and all three optional props; `ExerciseViewerProps` is additionally exported. Actual caller lazy-loads it only inside detail. Scene passes shared movement/animation metadata into procedural poses; all 11 muscles have figure patches. |

AI wire tests use real bound HTTP fixture servers, including event-driven in-flight aborts. Gemini redirection preserves the original URL validation and real HTTP request handling. Inspection found no sleeps or timing-luck patterns in the scoped tests; async fixture lifecycle/abort signals are subscribed before actions and bounded by timeouts. No test or assertion was deleted, skipped, or weakened.

## Graphics evidence and verification limits

This turn independently exercised the **built app**, not just the prior isolated harness. Before the browser script stopped at D2, assertions passed for:

- 158 real catalog cards and no canvas until opening detail;
- exactly one mounted canvas and capped DPR;
- Pause freezing actual canvas pixels and frame count;
- side camera changing actual canvas pixels;
- Play resuming actual WebGL frames.

The separate diagnostic probe ran with reduced-motion emulation and captured/visually verified the desktop, fresh-mobile and resized-mobile scenes. No claim is made that the interrupted script's later add/reload/context-loss checks ran in this turn.

Also read the existing executable `.omo/evidence/st_01a093ef/browser.mjs`, its actual JSON receipts, and visually inspected `families-contact.png` and `controls-contact.png`. Those prior receipts record all 14 family renders, orbit/zoom/reset, pause/play, offscreen and hidden-page suspension, unmount, reduced motion and context-loss fallback, with an empty page-error list. They are **prior-worker evidence**, not rerun results from this child. Hip-isolation raises intentionally use a static schematic; graphics are explicitly labeled schematic rather than technique demonstrations.

## Tooling limitations and non-failing warning

- The child tool inventory exposes no `monitor`, and `command -v monitor` found no executable. Required checks therefore used synchronous, captured shell execution instead; no monitor use is claimed.
- The LSP wrapper falsely reported that `typescript-language-server` was not installed/found. No installation was performed. An attempted legacy TypeScript compiler-API diagnostic command then exited 1 with `TypeError: Cannot read properties of undefined (reading 'readFile')` ([diagnostics.log](core-verification/diagnostics.log)); installed TypeScript is **7.0.2**, whose package root no longer exports that legacy API. This is a verifier-tool compatibility failure, not a source diagnostic. The existing native `tsc --lsp --stdio` script subsequently succeeded with **9 files / 0 errors / empty diagnostics**, before the successful full build. Its normal shutdown printed `context canceled` after the shutdown response and exited 0.
- Vite emitted the existing >500kB chunk warning. The lazy graphics JS chunk is **932.55kB**, **246.45kB gzip**. The build and PWA precache succeeded. The warning was not suppressed.
- No live paid provider credentials were supplied; provider verification uses deterministic real local HTTP fixtures, not claims of external Gemini/OpenAI availability.

Stop condition met: required executable gates verified and precise integration defects recorded, without production edits or commits.
