# Independent production acceptance verification

Task `st_01a0944d`, 2026-09-12. **PASS: the exact requested command exited 0 on its single execution; all five acceptance tests passed (28.4s), with zero skips, retries, flaky tests, or failures.** All 19 screenshots from this execution were opened and visually inspected. Port 4173 is free and no matching owned browser/preview processes remain.

No application, test, configuration, or dependency files were edited; no commit was created. No unit suite or separate build was run. The required acceptance command itself builds/typechecks production through Playwright's webServer configuration. Its configured reporter regenerated `.omo/evidence/release/` artifacts; this verification's log and independent copies of the current JSON/actions/screenshots are under [release-verification/](release-verification/).

## Actual execution

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome bun run test:e2e
```

[Complete captured stdout/stderr and exit status](release-verification/run.log):

```text
$ playwright test
[WebServer] $ bun run typecheck && vite build
[WebServer] $ tsc -b
[WebServer] [plugin builtin:vite-reporter]
[WebServer] (!) Some chunks are larger than 500 kB after minification. Consider:
[WebServer] - Using dynamic import() to code-split the application
[WebServer] - Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
[WebServer] - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
[WebServer] $ vite preview --host 0.0.0.0 --host "127.0.0.1" --port "4173" --strictPort

Running 5 tests using 2 workers

  ✓  1 tests/e2e/release.spec.js:6:1 › mobile plan edit swap and persistence (6.5s)
  ✓  2 tests/e2e/providers.spec.js:16:3 › gemini real adapter discovery preview errors and secret boundary (12.2s)
  ✓  3 tests/e2e/release.spec.js:41:1 › offline cold lazy graphics and imported null active plan (6.4s)
  ✓  5 tests/e2e/release.spec.js:104:1 › desktop surfaces and same canvas responsive camera (7.5s)
  ✓  4 tests/e2e/providers.spec.js:16:3 › openai-compatible real adapter discovery preview errors and secret boundary (11.5s)

  5 passed (28.4s)

ACCEPTANCE_COMMAND_EXIT=0
```

[Independent JSON report](release-verification/results.json) statistics:

```json
{"duration":28427.082000000002,"expected":5,"flaky":0,"skipped":0,"startTime":"2026-09-12T06:29:26.871Z","unexpected":0}
```

The existing large-chunk build warning remains visible, not suppressed.

## Test inspection and executed coverage

Read all of `tests/e2e/release.spec.js`, `tests/e2e/providers.spec.js`, `tests/e2e/support.js`, `playwright.config.ts`, and `src/ui/canvas-proof.mjs`; also inspected `package.json`, `vite.config.ts`, and the Gemini/OpenAI/transport implementations.

- **Mobile:** 390x844 filtering by chest/dumbbells/My gym; actual bench-press framebuffer; add, rename, four sets, compatible floor-press swap, reload; exact plan/item IDs and saved state retained; page/dialog overflow assertions pass.
- **Offline:** fresh context imports the null-active backup and adds into that same imported plan. Online setup has zero canvases and no page-requested lazy viewer chunk. Activated controlling service worker is awaited before switching transport offline. Offline reload retains the 158-card catalog and saved plan. First-ever detail loads `ExerciseViewer-DXa5X1EK.js` with HTTP 200 from the service worker and renders highlighted anatomy. Offline add/edit/reload retains two items in the same plan. AI generation and model discovery are disabled; all three navigation surfaces and dialog pass overflow checks.
- **Desktop/responsive:** desktop Exercises/Plan/Settings render. The actual mounted curl canvas survives resizing from 1440 to 375 pixels. Side camera changes the framebuffer fingerprint without replacing the canvas.
- **Gemini HTTP fixture:** real adapter requests the fixed v1beta endpoint, follows the second models page, excludes embedding-only models, explicitly selects/saves the discovered second-page model, sends the expected key header, and requests one day/three exercises.
- **OpenAI-compatible HTTP fixture:** real adapter preserves `/api/v1` for both model discovery and chat completions, sends Bearer credentials and the selected model, and requests one day/three exercises. Remote HTTP cannot save; localhost HTTP preferences survive reload.
- **Both providers:** independent fixed catalog IDs produce an unsaved three-item preview; accept materializes an AI plan while preserving the original manual plan. Malformed JSON and HTTP 401 expose `invalid-response:` / `authentication:` errors, remove acceptance, and preserve exact saved state. Real backup download bytes equal the export field and parsed saved state while the API key remains in memory. Export/localStorage/sessionStorage exclude the sentinel. Reload clears the key, and both downloads are deleted.

The source inspection found no sleeps, fixed pacing delays, explicit polling helpers, skips, or retries. `retries: 0` is configured. The only test/helper `setTimeout` calls bound failure for subscribed service-worker, native offline, and framebuffer events. Download, lazy-response, offline, and framebuffer listeners are installed before their triggering actions. Fixtures replace external HTTP responses, not application adapters, UI, validation, persistence, or the graphics renderer. Assertions use machine values rather than pinning prose; error checks use machine-coded prefixes.

**Qualification:** provider calls are fixtures, not live-service verification. The offline harness conditionally reasserts native offline status after reload through CDP `Network.overrideNetworkState`; it does not override navigator properties or synthesize application events. Each offline reload also requires an uncached `/api/release-uncached-probe` fetch to reject with `TypeError`. The inspected Workbox configuration excludes `/api` navigation fallback and has no provider runtime cache.

## Screenshots actually inspected

All links below refer to this run's independent copies. Vertical clipping of scrollable dialogs is normal viewport capture; the screenshot alone is not used to prove offscreen controls or persistence.

| Capture group | Visual observations |
| --- | --- |
| [Mobile bench](release-verification/mobile-plan-edit-swap-and-persistence/mobile-real-3d.png), [saved mobile plan](release-verification/mobile-plan-edit-swap-and-persistence/mobile-saved-plan.png) | Complete visible bench/figure with chest highlights and camera controls inside the narrow dialog; saved screen shows Release strength, Dumbbell floor press, four sets, and mobile navigation without horizontal clipping. |
| [Cold offline canvas](release-verification/offline-cold-lazy-graphics-and-imported-null-active-plan/offline-cold-real-3d.png), [offline AI](release-verification/offline-cold-lazy-graphics-and-imported-null-active-plan/offline-ai-disabled.png) | Visible squat figure with highlighted quads/glutes; offline explanation and saved fixture model appear in the AI dialog. Generate is below the main captured area; its disabled state is proven by the executed DOM assertion, not inferred from the image. |
| [Desktop catalog](release-verification/desktop-surfaces-and-same-canvas-responsive-camera/desktop-exercises.png), [desktop curl](release-verification/desktop-surfaces-and-same-canvas-responsive-camera/desktop-real-3d.png), [retained 375 canvas](release-verification/desktop-surfaces-and-same-canvas-responsive-camera/retained-canvas-375.png), [side camera](release-verification/desktop-surfaces-and-same-canvas-responsive-camera/retained-canvas-side.png) | Desktop catalog/search layout and two-column detail are visible. Narrow canvas retains a complete curl figure and highlighted biceps; side image visibly rotates the figure and marks Side selected. |
| [Gemini discovery](release-verification/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/discovered-selected-saved.png), [preview](release-verification/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/valid-preview-not-saved.png), [accepted](release-verification/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/accepted-real-plan.png), [malformed](release-verification/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/malformed-error-existing-plan-preserved.png), [401](release-verification/gemini-real-adapter-discovery-preview-errors-and-secret-boundary/401-error-existing-plan-preserved.png) | Gemini and Release second page are explicitly selected; key is masked. Unsaved preview visibly lists bench press/squat/curl with Accept plan. Accepted screen has the three editable movements. Both distinct errors are readable, with no Accept control. |
| [OpenAI discovery](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/discovered-selected-saved.png), [preview](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/valid-preview-not-saved.png), [accepted](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/accepted-real-plan.png), [malformed](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/malformed-error-existing-plan-preserved.png), [401](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/401-error-existing-plan-preserved.png), [remote HTTP rejection](release-verification/openai-compatible-real-adapter-discovery-preview-errors-and-secret-boundary/remote-http-rejected.png) | OpenAI-compatible, fixture `/api/v1` root, and model selection are visible. Preview, accepted movements, and distinct errors match the Gemini flow. Remote HTTP settings show an explicit URL validation alert and empty post-reload key field. |

Framebuffer receipts independently corroborate the images:

| Frame | Lit pixels | Highlight pixels | Fingerprint |
| --- | ---: | ---: | ---: |
| Mobile bench | 3370 | 124 | 110767349 |
| Cold offline squat | 5040 | 728 | 1749937971 |
| Desktop curl | 10228 | 733 | 1740266261 |
| Retained canvas at 375 | 5606 | 378 | 3259816584 |
| Retained canvas side view | 2188 | 140 | 1348184942 |

The five copied `actions.json` receipts contain 138 completed actions/measurements with no incomplete entries. Every test has `pageErrors: []`. Console errors are retained: one deliberate 401 for each provider, and two deliberate offline probe failures; other tests have none.

## Cleanup and boundaries

All five receipts say `contextClosed: true`; both provider receipts say `downloadDeleted: true`. The acceptance runner exited normally and its immediate `ss -ltnp 'sport = :4173'` result contained only the header.

An additional plain socket bind check briefly returned `OSError: [Errno 98] Address already in use`; it was an auxiliary cleanup probe, not a test failure. Immediate listener/process inspection still showed no listener. Final verification used an actual reusable TCP listener bind and closed that socket; all TCP states were empty as well. [Cleanup output](release-verification/cleanup.log):

```text
PORT_4173_AFTER_COMMAND
State Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
FINAL_LISTENERS_4173
State Recv-Q Send-Q Local Address:Port Peer Address:PortProcess

TCP_STATES_4173
State Recv-Q Send-Q Local Address:Port Peer Address:Port
PORT_4173_REUSABLE_LISTENER_BIND=PASS
REMAINING_MATCHING_BROWSER_PREVIEW_PROCESSES=[]
```

No missing or failing scenario was found within the requested acceptance scope. Live provider connectivity and the lead's final unit/build gate remain outside this verification. No additional requirements or app changes are proposed.
