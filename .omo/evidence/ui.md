# GPlan UI implementation evidence

Task: st_01a0940e. Final verification: 2026-09-12, 12:52-12:54 UTC session clock.

## Delivered

`src/App.tsx`, `src/styles.css`, and `src/ui/**` implement the complete responsive training journal: actual catalog filtering, dynamic taxonomy chips, lightweight local SVG muscle maps, lazy-loaded 3D exercise details, persistent editable plans, ranked swaps, local/manual creation, gym equipment settings, JSON backup import/export, Gemini/OpenAI-compatible discovery/manual model settings, AI request preview/accept, offline status and PWA settings.

The current catalog count rendered during final QA was **158**, read dynamically from the engine (the original assignment said 157; the catalog owner added adductor coverage during implementation). No catalog/taxonomy assumptions are hardcoded into filters.

Keys exist only in React memory, scoped to the provider configuration. Switching provider/root URL clears keys; reload clears them; export and storage contain only non-secret preferences. Invalid Gemini model IDs are rejected before saving. Corrupt stored data is preserved; edits can remain in memory with a persistent warning and can be exported.

## Design and architecture decisions

The supplied warm-paper/forest/lime brief won over a generic dashboard treatment. Offline system typography, ruled sections, an oversized editorial headline, a dark training card, and small muscle diagrams keep the library distinctive without remote assets or fake charts. Desktop sidebar becomes a mobile bottom navigation. Native dialogs plus explicit focus wrapping beat a custom modal framework: Escape, focus restoration, and touch-friendly scrolling were browser-tested. Small screen components beat a monolithic App; the largest TSX source is PlanEditor at 234 lines. Shared request fields and item editing are separate components. No config/package/core/AI/graphics/PWA edits were made by this task. No commit was created.

Self-review was used as assigned, not reviewer panels. Screens are real React DOM and WebGL, not screenshot backgrounds. No live-provider or Lighthouse-score claim is made. The skill's extra tooling installations/research were not allowed by the fixed dependency/path scope. The lead reported the LSP harness unavailable despite installation; compiler diagnostics replaced LSP, without a tooling investigation. `apply_patch` was absent initially; available write/edit tools were used, and later mechanical extractions used an `apply_patch` shell wrapper over `git apply`.

## Tests and build

- Failing-first: initial 7 screen tests failed against the original h1-only shell because controls/workflows did not exist.
- Browser-discovered focus defect was reproduced by a failing Dialog unit test, then fixed.
- Invalid Gemini model persistence was reproduced by a failing test, then fixed.
- Final `bun run typecheck`: PASS.
- Final `bun run test src/ui`: **4 files, 15 tests passed**, single run, no warnings.
- Tests cover real catalog filtering; add-without-plan; corrupt-storage preservation; persisted equipment; invalid imports; local generation; valid/invalid AI preferences and key handling; modal focus wrapping; timed prescription/reorder/remove/delete cancellation; cancellation and replaced-request late-response guards through the actual AI adapter with a narrow deferred HTTP boundary.
- Final `bun run build`: PASS. Main JS 400.72 kB (120.12 kB gzip); separately lazy-loaded ExerciseViewer 932.55 kB (246.45 kB gzip). Vite reports its >500 kB chunk warning for graphics. The warning was not suppressed and graphics/config were outside this task.
- `git diff --check -- src/App.tsx src/styles.css src/ui`: PASS.
- No fixed sleeps or polling timers. Browser assertions await exact DOM states; request/download waits subscribe before triggering; cancellation tests explicitly release deferred responses.

## Real browser verification

Reproduction harness: `node src/ui/browser-qa.mjs` while a built preview is served at `http://127.0.0.1:4176`.

Executable: `/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, real Chromium via installed Playwright. Isolated contexts, real WebGL via SwiftShader, reduced-motion preference, service workers allowed for production surface parity. Fresh final captures came from the production build, not the dev server. Desktop **1440x900**, mobile **390x844**, plus **360x844** overflow checks across Exercises/Plan/Settings.

Both desktop and mobile passed this exact narrative:

1. `getByRole('button', {name:'Chest', exact:true})`; `getByLabel('Filter equipment').selectOption('dumbbells')`; `getByLabel('Search exercises').fill('bench press')`; `getByLabel('My gym only').check()`.
2. `getByRole('button', {name:'View Dumbbell bench press', exact:true})`; assert real viewer `data-state=ready`; capture detail. Focus `Close dialog`, Shift+Tab must remain inside `dialog`; Escape closes and restores focus to the originating exercise.
3. Reopen detail; `Add to plan`; `View plan`. A usable manual plan/day is created automatically.
4. `Plan name` = `Intentional strength`; `Day name` = `Upper body`; `Sets` = 4; `Min reps` = 6; `Max reps` = 10; `Rest (sec)` = 75.
5. `Swap exercise`; choose `.swap-option` first ranked candidate, with visible shared-primary-muscle and same-movement explanation.
6. Reload; `Plan`; assert renamed plan, sets=4, and replacement exercise persist.
7. `Settings`; search equipment `dumb`; uncheck `Dumbbells`; clear equipment search; `Select all` restores available equipment.
8. `Provider` = `openai-compatible`; `Provider root URL` = `https://gplan-fixture.invalid/v1`; transient fixture key; explicit `Discover models`; select `fixture-strength-1` from `Discovered models`; `Save AI preferences`.
9. Wire fixture intercepts only `https://gplan-fixture.invalid/v1/models` and `/chat/completions`. Exactly one explicit discovery request. Generation fixture reads the real outbound eligible catalog and returns valid real exercise IDs. **This is fixture success, NOT a live provider call.**
10. `Plan` -> `Plan with AI`; `Days per week`=1; `Exercises per day`=3; `Generate preview`; visible preview -> `Accept plan`; assert saved plan name `Fixture strength`.
11. Reload; `Settings`; API-key input is empty. Stored JSON and exported backup never contain the fixture key sentinel.
12. `Backup JSON` = `{broken`; `Import backup` -> visible validation error. Subscribe to `download`; `Export JSON backup`; filename `gplan-backup.json`, parsed backup contains two plans. `Import backup` with the valid export succeeds and clears validation error.
13. `Plan` -> `New plan`; request name `Local foundation`, 2 days, 3 exercises/day; `Create local plan`; assert three rendered exercise editors in the first day.
14. Browser context goes offline; `Plan with AI` -> `Generate preview` is disabled with connection explanation. Close; `New plan`; name `Offline manual journal`, 1 day; `Start manual plan` succeeds offline.
15. Restore connection. Exercises/Plan/Settings have document width <= viewport width at 1440 and 390. Repeat at 360 on mobile.

Final browser receipts: `.omo/evidence/ui-browser-receipts.json`. Both narratives: `pageErrors: []`, `overflow: false`, `liveProvider: false`.

## Screenshot index and visual inspection

Final PNGs have valid PNG signatures and exact dimensions: **33 captures**. For each suffix below there is a desktop and mobile image:

`.omo/evidence/ui-desktop-{suffix}.png` (1440x900)
`.omo/evidence/ui-mobile-{suffix}.png` (390x844)

| Suffix | Verified visible state |
|---|---|
| home | Editorial hierarchy, real metrics, dark lime-accent training card, responsive nav |
| filtered | Selected Chest/dumbbells/search/gym filters and actual matching exercise |
| detail | Real WebGL figure, local equipment, muscle legend and viewer controls |
| detail-instructions | Written cues, muscle/equipment details, add destination and action |
| plan | Renamed plan/day, edited sets/reps/rest, swap/reorder/remove controls |
| swap | Ranked real alternatives and shared-muscle explanations |
| reloaded | Persisted replacement and edited prescription after reload |
| settings | Real equipment selection, searchable and persisted |
| models | Explicit fixture discovery, model selection, masked key and saved non-secret preferences |
| ai-preview | Real-catalog fixture preview with acceptance action |
| ai-accepted | Accepted AI plan in the normal editor |
| import-error | Visible invalid-JSON validation while existing state stays intact |
| local-request | Local/manual request form with dynamic focus chips |
| local-plan | Generated editable exercises and prescription controls |
| offline-ai | Connection explanation and disabled AI generation |
| offline-manual | Manual plan successfully created while offline |

Extra: `.omo/evidence/ui-mobile-360-settings.png` is 360x844.

Self-review inspected screenshots directly throughout implementation. Corrected: hero SVG highlight specificity, malformed close icon path, select labeling, tab-focus escape, and four-pixel 360px chip-strip overflow. Final visual checks: coherent ivory/forest/lime system; no page overflow; readable hierarchy; touch targets >=44px; accessible labels; real 3D scene; responsive stacked dialogs; no clipped input controls. Long screens intentionally scroll, with separate captures of top and edited-content states.

Initial/pre-fix captures are retained as iteration evidence (`ui-initial-*`, `ui-before-fix-*`); they are NOT final approval images. An initial production harness run blocked service workers and caused PwaStatus to correctly expose a registration failure. The harness was corrected to allow service workers, matching real production behavior; no PWA product code was changed and final browser page errors are empty.

## Cleanup receipts

- Initial dev server PIDs 337922/337923 terminated before production QA.
- Production preview PIDs 390251/390252 terminated after final QA.
- Browser harness closes all contexts and Chromium in `finally`; receipt records `browserClosed: true`.
- Final TCP probe to 127.0.0.1:4176 returned `ECONNREFUSED`: owned port is closed.
- No owned Chromium process remained in the final process inspection. Harness process exited normally; reusable source stays under `src/ui` as reproducible QA evidence.
- Port 4173 was not used by this task.

## Follow-up: verifier D1/D2 correction (2026-09-12, 12:58)

D1 reproduced failing-first against a fresh production build with `node src/ui/resize-qa.mjs before`: dialog scrollWidth **466 > 335** clientWidth, grid box 303px but grid track/viewer/canvas 450px. Before evidence: `ui-resize-before.json`, `ui-resize-before-desktop.png`, `ui-resize-before-mobile.png`.

Minimal parent-layout correction in `src/styles.css`: desktop detail columns use `minmax(0, 1.1fr) minmax(0, 1fr)`; mobile detail column uses `minmax(0, 1fr)`; direct detail grid children use `min-width: 0`. No viewer remount workaround, graphics change, or runner/config modification.

Final verification: `bun run typecheck` PASS; `bun run test src/ui` **15/15 PASS**; `bun run build` PASS (same unsuppressed graphics chunk warning); `node src/ui/resize-qa.mjs after` PASS. The focused browser harness opens **Dumbbell curl at 1280x1000**, explicitly resets the camera, retains the exact canvas ElementHandle, and resizes the same mounted dialog to **375x900**. DOM identity checks prove the canvas is unchanged before/after resize and after operating the **Side** camera button.

After dimensions: document width **375/375**, dialog scroll/client **335/335**, grid box/track **303/303**, viewer/canvas **303/303**. The Side camera still works; screenshots show the full resized scene, camera buttons, legend, and wrapped caption. `pageErrors: []`. Screenshots inspected directly:

- `.omo/evidence/ui-resize-after-desktop.png` (1280x1000)
- `.omo/evidence/ui-resize-after-mobile.png` (375x900)
- `.omo/evidence/ui-resize-after-side.png` (375x900)

D2 independently proved fixed in the fresh build after closing the retained dialog: at **375x900**, pageWidth=375 and chipRight=375; at **360x900**, pageWidth=360 and chipRight=360. Evidence: `ui-resize-after-catalog-375.png`, `ui-resize-after-catalog-360.png`, and `.omo/evidence/ui-resize-after.json`. No additional chip CSS change was needed.

An initial desktop capture occurred before camera initialization completed; the capture harness now drives the real **Reset view** action before taking the desktop frame. This is an evidence synchronization correction, not a product workaround. Final before/after screenshots are separate from the earlier 33 workflow captures.

Cleanup: preview PIDs **412782/412783** terminated; final TCP probe confirmed **ECONNREFUSED on 4176**. Chromium closed in the harness `finally` and the receipt records `browserClosed: true`.

## Follow-up: actual rendered-pixel capture gate (2026-09-12, 13:05)

Lead correctly identified that an earlier regenerated `ui-mobile-detail.png` was blank: `data-state=ready` proves only the WebGL capability probe, not a finished render. This supersedes the earlier readiness-only capture claim. Reproduction identified a capture race, not persistent missing mobile rendering. No product or graphics source change was required.

New QA-only `src/ui/canvas-proof.mjs` instruments real WebGL draw calls before page navigation. A microtask after the renderer task reads the real default framebuffer before it is discarded. The exact draw event carries counts of lit anatomy pixels and green muscle-highlight pixels; the capture gate rejects a blank panel or stage-only frame. It subscribes before opening detail, resizing, or changing camera, with a bounded failure timeout and no sleeps/polling. The probe neither adds geometry nor changes rendering. It is imported only by QA harnesses, never by the app.

Both `node src/ui/browser-qa.mjs` and `node src/ui/resize-qa.mjs after` passed after adopting this gate. The full desktop/mobile workflow captures were regenerated. Cold mobile reduced-motion detail was opened without clicking Play or Reset first: first real 310x320 framebuffer contained **3,370 lit pixels / 124 muscle-highlight pixels**. Cold desktop contained **6,374 / 208**. Receipts: `ui-browser-receipts.json` entries `coldReducedMotionCanvas`.

D1 now proves visible retained rendering, not only DOM sizing: resized 303x320 framebuffer contained **5,606 lit pixels / 378 highlights**; Side camera contained **2,188 / 140**, with fingerprint changing from **3259816584** to **1348184942**. Exact canvas ElementHandle identity remains unchanged across resize and camera action. Dialog remains 335/335px; grid/viewer/canvas remain 303px. Receipts: `ui-resize-after.json` fields `resizedCanvas` and `sideCanvas`.

Directly opened and visually inspected the newly written files: **`ui-mobile-detail.png` visibly shows the bench-press figure**, `ui-desktop-detail.png` shows its desktop counterpart, **`ui-resize-after-mobile.png` visibly shows the standing curl figure**, and `ui-resize-after-side.png` shows its changed side view. These overwrite the faulty earlier final captures; the current files are the corrected proof.

`node --check` passed for all three QA modules; both real browser harnesses passed with empty page-error arrays. Only QA harness/evidence files changed in this follow-up. Preview PIDs **429603/429604** terminated; final TCP probe returned **ECONNREFUSED on 4176**. Both Chromium instances closed through `finally`.
