# GPlan PWA packaging verification

Date: 2026-09-12  
Result: **PASS** (with fresh-browser execution limitation noted below)

## Source inspection

- `vite.config.ts` uses `vite-plugin-pwa` in `generateSW` mode.
- Manifest is configured as a root-scoped standalone app with `start_url: "/"`, theme/background colors, and three PNG icons: 192x192, 512x512, and maskable 512x512.
- Workbox precaches all built local files (excluding sourcemaps), uses `navigateFallback: 'index.html'`, excludes `/api` navigation, and has no runtime caches.
- `src/main.tsx` calls `registerPwa()` before rendering React.
- `src/pwa/register.ts` registers the service worker in production, handles offline/online state, and exposes offline-ready state.
- `src/pwa/PwaStatus.tsx` presents online/offline status and install/update affordances.
- `public/icons/` contains the configured icons plus SVG favicon and Apple touch icon.

## Executed build

Command: `bun run build`

Result: **PASS**. TypeScript passed, Vite built successfully, and Workbox reported 15 precache entries (246.95 KiB).

## Generated artifact checks

`dist/` contains:

- `manifest.webmanifest` (516 bytes)
- `sw.js` (1,968 bytes)
- `workbox-9c191d2f.js`
- `icons/gplan-192.png` (192x192)
- `icons/gplan-512.png` (512x512)
- `icons/gplan-maskable-512.png` (512x512)
- `icons/apple-touch-icon.png` (180x180)
- `icons/gplan.svg`

`dist/index.html` references the manifest, favicon, Apple touch icon, and production entry script. The generated manifest contains all three configured icons with the advertised sizes and MIME types.

## Captured browser offline evidence

The checked-in `.omo/evidence/pwa-browser-verified.json` records a final real-Chromium production verification:

- Chromium installability errors: none.
- Manifest and icon responses: HTTP 200; icons decoded at 192x192, 512x512, and 512x512.
- After stopping the preview server, the production shell reloaded with HTTP 200 from the service worker.
- Manifest, icons, and JS assets were fetched offline; an uncached request failed with `TypeError`.
- Recorded result: `PASS`; screenshots include `pwa-offline-shell.png`.

A new local Playwright invocation could not run because the workstation lacks the Playwright Chromium executable (`/home/norman/.cache/ms-playwright/.../chrome-headless-shell`). This is an environment limitation, not a packaging defect; the captured browser proof above remains the available browser evidence.
