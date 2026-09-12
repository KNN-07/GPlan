# Production release acceptance

Task `st_01a09440`, 2026-09-12. **PASS: 5 tests, 0 failures, 0 skips, 0 retries**, final single full run in 26.2 seconds. No app, source, dependency, or package changes were made by this task. No commit was created.

## Reproduce

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome bun run test:e2e
```

Exit **0**. [Full command/build output](release/run.log), [Playwright JSON report](release/results.json).

The shipped config reads an optional executable environment variable; it does not hardcode that workstation path. Normal Playwright webServer ownership builds production, then starts preview at `127.0.0.1:4173` with strict port ownership, two workers, and retries zero. Tests use fresh isolated contexts, service workers allowed, reduced motion, and real Chromium WebGL/SwiftShader. No persistent user profile is opened or modified.

## Scenarios proved

| Test | Executed assertions |
| --- | --- |
| Mobile 390x844 | Chest, dumbbells, My gym only; real Dumbbell bench press canvas; add; rename; four sets; compatible Dumbbell floor press swap; reload retains the exact plan/item IDs, replacement, and prescription. No horizontal overflow. |
| Offline 390x844 / null-active import | Import a valid backup with one empty day and null activePlanId. The displayed imported plan gains an item without creating a second plan. Await activated controlling SW online. No exercise detail or graphics chunk was requested by the page online. Go offline, reload shell/catalog/saved plan, then open Bodyweight squat for the first time. Its lazy graphics JS returns HTTP 200 **from the service worker**, with actual nonempty 3D. Add/edit/save/reload offline preserves one plan and both items. AI generation and model discovery are disabled; Exercises/Plan/Settings/dialog have no horizontal overflow. |
| Desktop 1440x900 -> 375 | Exercises, Plan, Settings render. Open Dumbbell curl, resize the same mounted canvas to 375, retain DOM identity and visible anatomy, no page/dialog overflow. Side camera changes framebuffer fingerprint on that same canvas. |
| Gemini | Actual fixed Google v1beta models endpoint, two-page discovery, embedding-only model excluded, explicit second-page selection/save, key passed via real adapter. Requested one day/three exercises, valid preview does not save until accepted. Malformed JSON and HTTP 401 show visible machine-coded errors, no acceptance control, and do not change either saved plan. |
| OpenAI-compatible | Actual adapter requests preserve `https://gplan-fixture.invalid/api/v1/models` and `/api/v1/chat/completions`. Explicit discover/select/save, valid preview/accept, malformed and 401 preservation checks as above. Remote `http://provider.example/v1` cannot save; `http://localhost:11434/v1` saves and survives reload. |

Both providers return independently fixed real IDs: `dumbbell-bench-press`, `bodyweight-squat`, `dumbbell-curl`; fixture answers are not derived from the outgoing catalog. Each exports a real download while the sentinel key is still in memory. Download bytes equal the UI export, parsed export equals saved state, local/session storage and export exclude the sentinel, and reloading leaves the key input empty. Both downloads were deleted after validation.

**Live provider calls remain unverified:** no live credentials were available; all provider HTTP responses are explicit fixtures. UI, adapters, catalog validation, persistence, and plan materialization are real, not mocked.

## Framebuffer and screenshot receipts

The reused `src/ui/canvas-proof.mjs` instruments real WebGL draw completion, reads the framebuffer before discard, and dispatches the exact draw event. Tests subscribe before detail/camera/resize actions and require both lit anatomy and highlighted muscle pixels before screenshots. `data-state=ready` is not used as visual proof. There are no sleeps, polling timers, test retries, or skips; timers only bound exact event failures.

Final measurements:

- Mobile bench: 3,370 lit pixels, 124 muscle-highlight pixels.
- Cold offline squat: 5,040 lit pixels, 728 highlight pixels; `ExerciseViewer-DXa5X1EK.js`, status 200, `fromServiceWorker: true`.
- Retained desktop -> 375 canvas: 5,606 lit / 378 highlight pixels; side view 2,188 / 140. Fingerprint changes **3259816584 -> 1348184942**.
- Every test records `pageErrors: []`. Console errors are retained: the two expected fixture 401s and two deliberately blocked uncached offline probes. No unexpected console errors were observed.

Nineteen final screenshots and 138 completed action/framebuffer/measurement receipts are stored in these per-test directories. Principal images were opened and visually inspected: real visible figures, responsive dialogs, edited four-set plan, explicit provider selections/previews/errors, and offline explanation.

- [Mobile actions](release/mobile-plan-edit-swap-and-persistence/actions.json), [real 3D](release/mobile-plan-edit-swap-and-persistence/mobile-real-3d.png), [saved plan](release/mobile-plan-edit-swap-and-persistence/mobile-saved-plan.png).
- [Offline actions](release/offline-cold-lazy-graphics-and-imported-null-active-plan/actions.json), [cold offline 3D](release/offline-cold-lazy-graphics-and-imported-null-active-plan/offline-cold-real-3d.png), [offline AI](release/offline-cold-lazy-graphics-and-imported-null-active-plan/offline-ai-disabled.png).
- [Desktop/resize actions](release/desktop-surfaces-and-same-canvas-responsive-camera/actions.json), [desktop 3D](release/desktop-surfaces-and-same-canvas-responsive-camera/desktop-real-3d.png), [retained 375 side camera](release/desktop-surfaces-and-same-canvas-responsive-camera/retained-canvas-side.png).
- [Gemini actions and endpoint receipts](release/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/actions.json), [selected model](release/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/discovered-selected-saved.png), [preview](release/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/valid-preview-not-saved.png).
- [OpenAI actions and endpoint receipts](release/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/actions.json), [401 error](release/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/401-error-existing-plan-preserved.png), [remote HTTP rejected](release/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/remote-http-rejected.png).

## Sensitivity and provenance

A targeted temporary **HTTP fixture-only** mutation replaced `dumbbell-bench-press` with `release-unknown-exercise` in the otherwise valid generated response. No assertion or production file changed. The OpenAI acceptance test failed at its required visible Accept plan assertion; the real adapter displayed `invalid-response` for the unknown exercise. [Failure output](release/sensitivity/unknown-catalog-id.log), [visible rejection screenshot](release/sensitivity/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/failure.png). Mutation restored before the final five-test pass. This proves assertion sensitivity, **not** a new failing-first app implementation cycle.

Original implementation RED evidence remains untouched in [UI implementation evidence](ui.md) (initial missing app controls and component failures). The two previously reproduced production edges remain documented in [UI verification](ui-verification.md); this suite proves the lead's subsequent null-active-plan and URL-save fixes through the real UI. No new product defect was found.

## Browser emulation qualification

The first full run passed four tests but failed the offline navigator assertion after reload: expected false, received true. [Original run and artifacts](release/initial-emulation-failure/run.log) are retained, not rewritten as an app RED.

Installed Chromium **151.0.7922.34** resets `navigator.onLine` to true on reload even on a data-only page with no app or SW; [independent native-browser reproduction](release/chromium-offline-diagnostic.log). Playwright's transport remains offline. The harness now reasserts the native browser status after navigation using CDP `Network.overrideNetworkState`, subscribes to the real offline event before doing so, and keeps that emulation session attached until context cleanup. It does not override navigator properties or inject application events. After each offline reload an uncached `/api/release-uncached-probe` fetch fails with TypeError despite preview remaining live, independently proving actual network denial. The lazy chunk still must come from the SW and render real pixels.

## Validation and cleanup

- Production build/typecheck succeeds under normal webServer startup. Existing >500 kB graphics-chunk warning remains visible and unsuppressed.
- [Direct TypeScript 7 LSP](release/lsp.log): four changed code files, zero diagnostics. The generic LSP tool could not locate its executable; the installed compiler's `--lsp --stdio` endpoint supplied real diagnostics instead. [Reusable LSP receipt client](release/lsp-check.mjs).
- [Node syntax / config compiler checks](release/diagnostics.log) pass; scoped `git diff --check` passes.
- [Cleanup receipt](release/cleanup.json): all five contexts closed, both downloads deleted, port 4173 unbound, no owned preview/Chromium/LSP processes, no patch .orig/.rej files. Browser-generated temporary profiles close with the runner; intentional screenshots/logs remain.
- Requested skill files and an apply_patch executable were unavailable in this child environment. All code/document edits used an `apply_patch` shell entry point backed by standard unified patches. No dependency installation or scope expansion was used.
