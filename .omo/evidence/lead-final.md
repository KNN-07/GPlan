# GPlan final acceptance

## Result

GPlan is implemented: 158 bundled exercises across 11 muscle groups,
equipment filtering and similar alternatives, saved editable plans, offline
procedural 3D visualization, installable PWA packaging, and optional Gemini/
OpenAI-compatible AI with model discovery.

## Lead verification

- `bun test`: 211 Vitest tests passed, 11 files, launcher exit 0.
- `bun run test`: the same 211 tests passed, exit 0.
- `bun run build`: passed TypeScript and production asset/PWA generation.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome bun run test:e2e`:
  5 passed in 29.5 seconds, exit 0. Report has expected=5, unexpected=0,
  skipped=0, flaky=0, errors=[].

The lead read the three acceptance test files and configuration, inspected
provider success/error and offline screenshots, and ran the command directly.
See `release/results.json`, per-test `release/*/actions.json`, and
`release-verification.md` for the independent verification copy.

## Binding criteria

1. **Mobile planning PASS:** Chest/dumbbell/gym filtering, add, four sets,
   compatible floor-press swap, and reload preserve the same plan and item.
   Evidence: `release/mobile-plan-edit-swap-and-persistence/`.
2. **Offline PWA PASS:** an activated controlling service worker supplies the
   shell, 158-exercise catalog and never-opened lazy graphics chunk offline.
   Add/edit/save/reload remain functional; AI is disabled offline.
   Evidence: `release/offline-cold-lazy-graphics-and-imported-null-active-plan/`.
3. **AI PASS with HTTP fixtures:** real Gemini pagination and model selection,
   compatible `/api/v1` paths, preview/accept, malformed/401 errors, preserved
   prior plans, and key-free exports/storage. Reload clears keys.
   Evidence: both provider directories under `release/`.
4. **Build/responsive regression PASS:** clean compiler/build, 211 unit tests,
   desktop navigation and same-canvas desktop-to-mobile resize without overflow.
   Evidence: `release/desktop-surfaces-and-same-canvas-responsive-camera/`.
5. **Corrections PASS:** real adductor classification/highlights, consistent
   imported-plan selection and provider URL validation.
   Evidence: `lead-catalog.md`, `graphics.md`, `lead-ui-fixes.md`.

## Additional hands-on proof

The lead drove an isolated Chromium context from the JavaScript kernel at
`http://localhost:4173`, 390x844:

1. Select Chest, equipment dumbbells, My gym only.
2. Add Dumbbell bench press; View plan; name My offline gym plan; set four sets.
3. Swap to Dumbbell floor press.
4. Await service-worker control, set context offline, reload. Actual reload
   response came from the service worker; saved state was exactly unchanged.
5. An uncached `/api/lead-uncached` request failed. Native browser status was
   offline (the documented Chromium emulation quirk was handled via CDP).
6. Open Bodyweight squat, never opened online. Its lazy graphics response was
   HTTP 200 from the service worker. Real framebuffer: 5,040 lit pixels,
   728 muscle-highlight pixels. The viewer was in motion.
7. Page width 390/390; dialog width 350/350; page errors=[].

Lead opened `lead-final-offline-plan.png` and `lead-final-offline-3d.png`.
Both show the actual saved plan and visible highlighted 3D figure.

## Cleanup and self-review

All workflow nodes are terminal. Final isolated context/browser were closed;
preview `mon_MPEB1WRKKQJJVNDS` was killed. `ss` found no listeners at 4173,
4189, 4176, 5197, 5198 or 4187. Test contexts/downloads/servers have cleanup
receipts in their reports. Only intentional evidence and normal build outputs
remain. User browser profiles were not touched.

Self-review: source, tests, responsive CSS, screenshots, data boundaries,
credential handling and all criterion evidence inspected. Lead tier ratcheted
to HEAVY after shared-domain edits; no ulw-plan reviewer gate was triggered.
No failing tests were skipped or weakened.

## Explicit limits

- No live provider credentials were supplied; paid-provider connectivity and
  output quality are not claimed. HTTP fixture integration is verified.
- Graphics are procedural schematics, not technique-accurate recorded GIFs.
- The lazy Three.js chunk is about 933 kB (246 kB gzip), producing Vite's
  unsuppressed size advisory. Build and offline precache pass.
- The generic LSP harness could not locate its installed server. Compiler
  checks passed; child reports also contain native TypeScript LSP receipts.
- PWA requires HTTPS or localhost and one successful online load before use.
