# Integrated UI verification

Task: st_01a09437. Date: 2026-09-12. Scope: verification only; no application edits, fixes, commits, downloads, or reviewer panel.

## Verdict: DEFECTS FOUND

The requested UI test command, production build, desktop/mobile happy-path browser workflow, and retained-canvas resize checks all passed. Two UI-to-engine inconsistencies were independently reproduced through the production browser surface. This is not an unconditional PASS.

### UI-V1 - P2: adding to the displayed saved plan creates a different plan after a valid null-active import

Reproduction (automated in `ui-verification/edge-qa.mjs`):

1. Settings -> import a schema-v1 backup with one manual plan (`id: imported-plan`, name `Imported routine`), one empty day, and `activePlanId: null`. The exact complete backup is in the harness. Import succeeds without an alert.
2. Plan shows `Imported routine` in both the saved-plan selector and plan-name field, with `Imported session` selected.
3. Click `Add a movement`, then the first catalog `Add ... to plan`, then `View plan`.
4. Actual: a second plan named `My training plan` is created and activated. `Imported routine` remains empty. Expected: the exercise belongs to the plan the editor presented as selected.

Actual receipt excerpt:

```json
{
  "plans": [
    {"id":"imported-plan","name":"Imported routine","days":[{"id":"imported-day","items":[]}]},
    {"name":"My training plan","days":[{"name":"Day 1","items":[{"exerciseId":"barbell-bench-press"}]}]}
  ]
}
```

Root cause, traced through the state boundary and both consumers:

- `src/core/state-schema.ts:33-35` intentionally accepts `activePlanId: null` even when plans exist; import is therefore valid, not corrupt input.
- `src/ui/PlanEditor.tsx:26` displays `find(activePlanId) ?? plans[0]`, including in the saved-plan selector.
- `src/ui/usePlanner.ts:31,42` resolves only `find(activePlanId)` and creates a new manual plan when absent.
- `src/App.tsx:46` likewise lacks the editor's fallback when computing detail destination.

Recommendation: use a consistent selected-plan resolution across editor, add handler, and detail destination (or explicitly establish an active plan at the valid import boundary). No fix made.

Visual proof opened and inspected: `ui-verification/edge-null-active-before.png` shows the imported routine selected; `edge-null-active-after.png` shows the newly created routine with one movement. Full persisted state is in `edge-receipts.json`.

### UI-V2 - P3: AI preferences accept and report success for a URL the actual adapter rejects

Reproduction (same harness):

1. Settings -> Provider `OpenAI-compatible`.
2. Root URL `http://provider.example/v1`; manual model `example-model`.
3. `Save AI preferences` succeeds, persists that URL, and displays the saved confirmation.
4. `Discover models` immediately fails with the real adapter's error below; no request to `provider.example` occurs.

```text
provider: Use HTTPS (or localhost HTTP), without URL credentials, query parameters, or fragments.
requests: []
```

Root cause:

- `src/ui/AiSettings.tsx:195-201` uses storage `importState` as its preference validation before reporting saved success.
- `src/core/state-schema.ts:18-20` accepts HTTP on any host.
- `src/ai/openai.ts:12-21` allows HTTP only for loopback/localhost. Both discovery and generation use this root validator via `src/ai/index.ts`.

Recommendation: validate the provider configuration against the adapter's URL rules before showing saved success. Preserve the adapter rejection; this is a configuration UX mismatch, not evidence of a credential leak. No fix made.

Visual proof opened and inspected: `ui-verification/edge-http-saved.png` shows the unsupported HTTP URL plus saved confirmation; `edge-http-rejected.png` shows the adapter error. Full receipt is in `edge-receipts.json`.

## Requested commands and actual outputs

Executed once each in this verification session. Complete stdout/stderr: `ui-verification/test.log` and `ui-verification/build.log`.

### `bun run test src/ui` - PASS, exit 0

```text
$ vitest run --maxWorkers=4 --exclude=e2e/** src/ui

 RUN  v5.0.0 /home/norman/Repos/GPlan

 Test Files  4 passed (4)
      Tests  15 passed (15)
   Start at  13:04:39
   Duration  8.22s (tests 71%, environment 18%, transform 6%, setup 3%, import 3%)
```

Read all four test files: App, PlanEditor, AiCancellation, and Dialog. Tests exercise actual catalog/planner/storage and actual AI adapter cancellation with a deferred fetch response, not mocked engines. Graphics/PWA are mocked in screen unit tests, so their visual proof comes from Chromium below. No fixed sleeps were added; async generation tests release the precise deferred response. No test was changed, skipped, or retried.

### `bun run build` - PASS, exit 0, warning retained

```text
$ bun run typecheck && vite build
$ tsc -b
vite v8.3.0 building client environment for production...
transforming...
✓ 167 modules transformed.
rendering chunks...
computing gzip size...
dist/manifest.webmanifest                          0.51 kB
dist/index.html                                    0.58 kB │ gzip:   0.34 kB
dist/assets/ExerciseViewer-Cs_plEQo.css            3.36 kB │ gzip:   1.17 kB
dist/assets/index-BKlFhMUn.css                    26.41 kB │ gzip:   6.23 kB
dist/assets/workbox-window.prod.es5-Bd17z0YL.js    5.65 kB │ gzip:   2.20 kB
dist/assets/index-Tca2SGqj.js                    400.72 kB │ gzip: 120.12 kB
dist/assets/ExerciseViewer-Ba-UYHKh.js           932.55 kB │ gzip: 246.45 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 492ms

PWA v1.3.0
mode      generateSW
precache  18 entries (1360.10 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

The graphics chunk-size warning is pre-existing, visible, and unsuppressed. LSP diagnostics on `src/ui` were attempted before building but the tool reported `typescript-language-server` unavailable (`Command not found`). No dependency/config edits were authorized, so compiler diagnostics from the successful `tsc -b` are the available type-check evidence, not an LSP success claim.

## Production browser execution

Command, exit 0:

```sh
node .omo/evidence/ui-verification/run-browser.mjs
```

The runner starts the built Vite preview at `http://127.0.0.1:4187`, subscribes to its readiness output, runs each harness, and terminates its own preview in `finally`. Existing Chromium used:

```text
/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
```

The existing UI QA scripts were read, then copied into this task's evidence directory with only artifact paths and preview port changed. This avoids overwriting the UI owner's evidence. WebGL draw-event capture instrumentation is QA-only and not shipped in the app. No fixed sleeps: browser actions synchronize with exact DOM states, pre-armed draw events, request/download events, or child-process output, with bounded failure deadlines.

Actual command summary (`ui-verification/browser.log` contains all outputs):

```text
RUN browser-qa.mjs
... desktop and mobile receipts: pageErrors: [], overflow: false, liveProvider: false ...
PASS browser-qa.mjs
RUN resize-qa.mjs
... pageErrors: [], browserClosed: true ...
PASS resize-qa.mjs
RUN edge-qa.mjs
... reproduced UI-V1 and UI-V2; pageErrors: [], browserClosed: true ...
PASS edge-qa.mjs
Owned preview process terminated.
```

`PASS edge-qa.mjs` means its assertions successfully reproduced the defects; it does not mean those behaviors are correct.

### Happy-path integration exercised at 1440x900 and 390x844

- Chest + dumbbells + bench-press search + gym-only filtering produces the actual Dumbbell bench press result.
- Real lazy-loaded WebGL detail opens; Shift+Tab remains inside the dialog; Escape restores focus.
- Add from detail creates a usable manual plan/day. Rename plan/day; edit sets=4, reps=6-10, rest=75; choose the real first ranked swap. Reload preserves renamed plan, sets, and replacement.
- Equipment changes persist through real storage; explicit discovery calls the real OpenAI-compatible adapter against one intercepted `/models` response.
- Real `/chat/completions` request payload supplies the eligible catalog; the HTTP-only fixture returns actual catalog IDs. Real response parsing/validation builds a preview, then explicit acceptance saves an editable AI plan.
- Reload clears the key input. Local storage and exported backup exclude the key sentinel. Invalid import produces an alert; valid export/download and reimport work.
- Real local generation creates the requested two days and three items in the displayed first day. A basic offline-state check disables AI generation while manual creation continues.
- Exercises, Plan, Settings fit document width at desktop, 390px and 360px.

No live AI provider was called. The fixture intercepts only provider HTTP responses; it does not replace App, engines, adapter request generation, draft validation, or persistence. Gemini wiring was source-traced, not browser-live-tested. Full offline/adversarial release testing remains outside this assignment.

### Retained real canvas and resize proof

A single mounted Dumbbell curl canvas is retained from 1280x1000 to 375x900. Identity assertions pass before/after resize and after Side camera interaction.

```json
{
  "viewport":375,"pageWidth":375,
  "dialogClient":335,"dialogScroll":335,
  "gridWidth":303,"gridTrack":"303px","viewerWidth":303,"canvasWidth":303
}
```

Cold mobile bench-press framebuffer: 310x320, 3370 lit pixels, 124 muscle-highlight pixels. Resized curl: 303x320, 5606 lit pixels, 378 highlights. Side camera: 2188 lit pixels, 140 highlights; fingerprint changes from 3259816584 to 1348184942. These draw-event gates establish a nonempty rendered figure rather than relying on `data-state=ready` alone. Catalog width and chip right edge equal the 375px and 360px viewports. Full JSON: `ui-verification/ui-resize-after.json`.

## Source integration inspection

Read App and all UI TS/TSX components, all four UI test files, browser/resize/canvas QA modules, and the relevant core and AI implementation files. Actual wiring:

| Surface | Handler and real engine |
| --- | --- |
| Catalog filtering | `Catalog` passes text, selected muscles/equipment and available-only to `queryExercises`; taxonomy supplies dynamic controls; gym changes invalidate memoized results. Core filters intersect categories, match name/aliases, and check complete equipment-option availability. |
| Add and saved edits | `usePlanner.addExercise` creates prescription-compatible items and usable manual days; `putPlan` and `update` call schema-validated `saveState`. `PlanEditor` handles active-plan selection, names, day selection, reorder/remove/delete; `ItemEditor` handles reps/time, sets and rest. UI-V1 is the inconsistent null-active fallback. |
| Swaps | `PlanEditor` uses `findSwaps` (available equipment, shared primary muscles, scored overlap/movement, stable ordering) and `replaceExercise` (item identity retained; compatible prescription preserved, otherwise converted). |
| Local planning | `CreatePlanDialog` invokes `createLocalPlan`, displays Result errors, and App accepts/persists only successful plans. Manual creation is a separate no-network action. |
| Model discovery | `AiSettings` explicitly calls `discoverModels`; selected provider dispatches to Gemini or OpenAI-compatible. Abort controllers, identity guards, config/key changes, offline state and unmount prevent late updates. UI-V2 is inconsistent URL validation before save. |
| AI generation | `AiPlanDialog` invokes `generatePlan` with saved provider/model, scoped in-memory key, current request, full local catalog, and abort signal. Adapter filters the eligible catalog and validates draft shape, real IDs, equipment, count, prescription and duplicate IDs before display. Acceptance uses `materializeAiPlan` then App persistence. |
| Backup/key boundary | Settings uses `exportState`/`importState`; storage schema rejects extra secret fields. App keys are in React memory and configuration-scoped, never part of PlannerState. |

## Actual screenshot inspection

The requested `ui.md` is `.omo/evidence/ui.md` (there is no repository-root `ui.md`). Its final screenshots were inspected, not merely listed or checked for file existence.

All 38 current final images (33 workflow captures plus five `ui-resize-after-*` captures) were opened as five generated contact sheets: `ui-verification/original-contact-1.jpg` through `original-contact-5.jpg`. These sheets are labeled by original filename; pre-fix/initial images were not treated as approval evidence.

Full-resolution original images additionally opened directly:

- `ui-desktop-home.png`, `ui-mobile-home.png`: warm paper/forest/lime hierarchy, 158 catalog count, usable desktop sidebar/mobile bottom navigation.
- `ui-mobile-filtered.png`: selected Chest, dumbbells, gym-only and search visibly yield one matching exercise.
- `ui-mobile-detail.png`: real bench, dumbbells and lit figure visible, with readable muscle legend and Play/Reset/camera controls; not a blank dark canvas.
- `ui-mobile-plan.png`: plan/day names and four numeric controls fit; the focused rest field and swap/reorder/remove actions are visible.
- `ui-desktop-swap.png`: ranked actual chest alternatives, movement explanation, scrollable dialog.
- `ui-mobile-models.png`: provider URL, masked key, discovered/manual model, saved state.
- `ui-desktop-ai-preview.png`: three real named exercises, prescriptions, and explicit Accept action.
- `ui-desktop-import-error.png`: invalid JSON remains in input, error is visibly surfaced.
- `ui-mobile-360-settings.png`: equipment controls fit the narrow layout.
- `ui-resize-after-mobile.png` and `ui-resize-after-side.png`: figure visible at 375px; side camera visibly changes the view; panel/legend remain contained.

Fresh captures from this verification were also directly opened: `ui-verification/ui-mobile-detail.png`, `ui-resize-after-mobile.png`, `ui-mobile-ai-preview.png`, plus all four `edge-*.png` defect captures. Fresh detail/preview states match the original visual evidence; the defect images visibly substantiate the state transitions described above. Intentional vertical scrolling is not reported as clipping; no additional visual defect was identified in the inspected final captures.

## Artifact and cleanup checks

- Five evidence JS modules pass `node --check`.
- `git diff --check -- src/App.tsx src/styles.css src/ui`: exit 0.
- All three browser receipts record `browserClosed: true`.
- After runner exit, a TCP probe returned `Owned preview port 4187: ECONNREFUSED`.
- Only this task's evidence/report paths were authored. Requested build/test commands also generate their normal ignored tool outputs. Existing source modifications and other agents' evidence were not edited.
- No live credentials or endpoint access was assumed. AI success is explicitly HTTP-fixture-backed; null-active import is treated as supported because the real schema and browser import accept it.
