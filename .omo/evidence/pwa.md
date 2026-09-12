# GPlan PWA packaging - PASS

Task: st_01a093f9. Date: 2026-09-12.

## Delivered
- vite.config.ts generates the standalone GPlan manifest and prompt-mode Workbox service worker. It injects theme, SVG favicon and Apple touch-icon tags without changing index.html.
- src/main.tsx calls exported registerPwa(): void once, before React renders. Registration is independently idempotent.
- src/pwa/register.ts owns page-lifetime network/install/worker events and observable state. No React effect owns registration, so StrictMode cannot register twice or miss an early install event.
- src/pwa/PwaStatus.tsx exports named PwaStatus(): React.JSX.Element | null. Self-contained, scoped ivory/graphite/lime styling; native keyboard controls, status/alert semantics, install prompt and fallback instructions, explicit update button, and offline/AI-network messaging.
- public/icons contains an original GP monogram SVG plus decoded 192px, 512px, maskable 512px, and Apple 180px PNGs. The monogram stays inside the maskable safe area; its opaque lime background fills the whole image.
- The manifest is generated at /manifest.webmanifest from vite.config.ts, not duplicated in public.

## Integration contract
Import { PwaStatus } from './pwa/PwaStatus' and mount it in the host layout. App.tsx was deliberately untouched; the current production shell remains the scaffold GPlan heading. The component was verified in a separate, temporary production-built host.

Updates never reload without this tab's explicit consent. A native controllerchange listener also covers a worker update during the initial session, which Workbox does not classify as isUpdate. If another tab activates the worker, this tab retains its edits and can explicitly reload later.

Precache matches all built local files except sourcemaps; this includes lazy graphics, CSS, fonts, models and public assets. The per-file ceiling is a bounded 8 MiB, not an unlimited cache exemption. runtimeCaching is empty: no CDN resources, API provider responses, or AI runtime data are cached. /api navigation is excluded from the shell fallback.

## RED before implementation
See pwa-red.json and pwa-red.png. The original production manifest contained no icons. Chromium reported manifest-missing-suitable-icon and no-acceptable-icon. The isolated incognito context also reported its expected in-incognito install restriction; this was not counted as the product defect.

## GREEN verification
Final machine-readable proof: pwa-browser-verified.json (result PASS).

1. Actual production shell served on 127.0.0.1:4175, fresh temporary Chromium profile: Page.getInstallabilityErrors returned an empty array. Manifest and all icon responses were HTTP 200 with correct MIME types. Images decoded at 192x192, 512x512 and 512x512.
2. Awaited service-worker controller before switching offline. Stopped the preview server, then reloaded the actual shell: HTTP 200, fromServiceWorker true, GPlan heading rendered. Every shipped manifest/icon/JS asset fetched successfully offline. An uncached network probe failed with TypeError. This proves offline caching independently of navigator.onLine.
3. Production-built component harness used the real register module, component, Workbox worker and browser events. Install dismissal restored fallback; prompt rejection produced an alert and released busy state; accepted prompt did not mark installed until appinstalled. Calling registerPwa twice still yielded one prompt invocation.
4. Native online/offline events updated the component. The real lazy ExerciseViewer bundle (932,158 bytes) fetched offline before being imported. A generated 3,145,728-byte local fixture also fetched offline, verifying precaching above Workbox's default 2 MiB limit. The fixture and harness were never shipped.
5. Real generated-worker revision test in two tabs: both retained unsaved input while the worker waited. Clicking Update and reload refreshed only the accepting tab. The other tab retained its input and could explicitly reload afterward.
6. No page errors in the final component browser run. Screenshots inspected at 375, 768 and 1280px: no overflow/clipping; keyboard focus and native disclosure worked; visible offline, install and update states remained readable.

## Commands and results
- bun run build: PASS after final cleanup. TypeScript tsc -b passes; Vite build produces assets/index-CWP6UaI_.js (223.24 kB), local Workbox window chunk, manifest and worker. Workbox reports 15 precache entries / 246.95 KiB for the current scaffold.
- bun run test: PASS, 7 test files / 181 tests, one run.
- node src/pwa/.qa.mjs: final browser scenario PASS; the requested temporary harness was then deleted.
- git diff --check: PASS.
- LSP diagnostics attempted for vite.config.ts, src/main.tsx, register.ts, PwaStatus.tsx and env.d.ts; harness reports typescript-language-server command not found despite the repository dependency. Compiler verification was required and passed; LSP is not claimed as passed.
- The separate graphics-inclusive QA build emits Vite's existing >500 kB chunk-size warning. It is reported, not suppressed. Production scaffold build has no such warning.

## Browser evidence
- pwa-offline-shell.png: actual production shell after server shutdown and offline reload, 1280x800.
- pwa-component-375.png, pwa-component-768.png, pwa-component-1280.png: fallback instructions and keyboard focus.
- pwa-install.png: install affordance hover/focus.
- pwa-component-offline.png: offline availability and network requirement.
- pwa-update.png: waiting update with unsaved input intact.
- All screenshots are valid PNGs at their recorded dimensions; icons were also visually opened and inspected.

## Exact cleanup receipt
- RED isolated context and its own Chromium closed; RED preview :4175 closed.
- Each later context/browser and its own preview :4175 closed in finally blocks. Final listener inspection showed no process bound to :4175.
- Removed temporary profile /tmp/gplan-pwa-shell-K5TgpL.
- Removed temporary QA trees, including their profiles and generated builds: /tmp/gplan-pwa-qa-sBJYzp, /tmp/gplan-pwa-qa-THrarn, /tmp/gplan-pwa-qa-Xk26ze, /tmp/gplan-pwa-qa-Gk0q4h, /tmp/gplan-pwa-qa-TEGiQQ.
- Deleted via apply_patch: src/pwa/qa.html, src/pwa/.qa.tsx, src/pwa/.qa.mjs. Earlier src/pwa/.qa.html was renamed into qa.html, then deleted with it.
- No user browser profile, cookies, or site data were touched. Port 4174 and other agents' servers were untouched. No OS-level app installation or shortcuts were created. No commits.
- Only owned source/config/public files and PWA evidence were edited. package.json, App.tsx, contracts, core, AI and graphics were not changed by this task.

## Review and assumptions
- Deployment is at origin root over HTTPS (localhost for QA). A first successful online load is needed before offline use; AI generation still needs network. Root paths follow the existing scaffold.
- Installability was checked through real Chromium. The install-dialog response is the one intentionally simulated browser seam; no claim of an OS-level install or Safari device execution is made.
- Self-review only, as requested: registration state, component presentation and packaging each have separate ownership; all files are below 200 nonblank/noncomment lines; no type suppressions or silent error catches were introduced. Rejections become visible state. Native events and bounded subscriptions drive async QA; no sleeps or polling delays were used.
- No dependency installation, app-wide redesign, Lighthouse score claim, or reviewer panel: these were outside this child scope.
- Harness issues found and corrected: a Chromium navigator.onLine mismatch after reload (retained in pwa-initial-browser-attempt.json), a browser Response.status property typo, and a hidden QA HTML path excluded by Workbox's normal glob behavior. The real first-session update reload defect was fixed at the native controller event boundary. The final scenario passes all checks together.

## References read
Programming + TypeScript reference; frontend design/perfection references; existing exercise viewer design contract; visual-qa and ultimate-browsing skills. User scope takes precedence over dependency installs and independent reviewer requirements in skills.

Context7 docs read through https://context7.com/api/v1/vite-pwa/docs?type=txt&topic=prompt%20registerSW%20maximumFileSizeToCacheInBytes%20manifest&tokens=5500, including upstream vite-pwa/docs guide/faq.md, guide/pwa-minimal-requirements.md, guide/service-worker-precache.md, frameworks/index.md and frameworks/react.md. Installed vite-plugin-pwa register implementation and Workbox lifecycle source were also inspected to confirm actual callback behavior.
