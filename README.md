# GPlan

A mobile-friendly, offline gym planner with 158 bundled exercises, muscle and
equipment filters, similar exercise substitutions, saved workout plans, and
optional AI planning.

## Run

Install [Bun](https://bun.sh), then:

```sh
bun install --frozen-lockfile
bun run dev
```

For the installable, offline-capable production app:

```sh
bun run build
bun run preview
```

Open `http://localhost:4173`. Deploy the generated `dist/` directory at the
root of an HTTPS origin. The service worker is enabled in production, not the
development server. A first successful online visit is required to cache the
application; wait for **Ready offline** before disconnecting.

## Training

- Browse exercises by muscle group, equipment, or name.
- Select equipment available at your gym to narrow choices.
- Inspect written instructions and a local 3D muscle schematic.
- Build and edit plans; swap movements for available exercises sharing their
  primary muscles. Alternatives are similar, not biomechanically identical.
- Plans and gym preferences stay in this browser. Export a JSON backup before
  clearing browser data or changing devices.

The procedural 3D viewer has reusable motion families, camera controls,
play/pause, and primary/secondary muscle highlights. Unsupported movements use
static schematics; these are not recorded exercise GIFs or technique-accurate
demonstrations. All visualization assets are bundled locally. WebGL failure
falls back to written exercise information.

## AI providers

AI is optional and requires network access. Local browsing, visualization and
planning do not depend on AI.

- **Gemini:** enter your API key and discover available generation models, or
  enter a model ID manually.
- **OpenAI-compatible:** enter the API root, such as
  `https://api.openai.com/v1` or `http://localhost:1234/v1`. GPlan appends
  `/models` and `/chat/completions`. Local servers without authentication can
  use an empty key.

The provider must permit browser requests through CORS. HTTPS is required for
remote provider roots; localhost HTTP is supported for local servers, subject
to browser network policy. Discovery is optional when the server requires a
manual model ID.

API keys are held in memory only and must be re-entered after reloading.
They are not included in saved plans, backups, or service-worker caches.
Generation sends the training request and eligible exercise metadata directly
to the selected provider. Generated plans are validated before acceptance.

## Install and update

Use **Install GPlan** when your browser offers it. On iPhone/iPad, open the app
in Safari and choose **Share > Add to Home Screen**. Other supported browsers
offer installation from their menu.

Updates wait for **Update and reload** rather than interrupting editing.
Save edits before accepting an update.

## Verify

```sh
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

`bun test` also runs the complete Vitest suite through a launcher that preserves
its exit status; it does not use Bun's partial Vitest API compatibility.

Unit and HTTP-fixture tests run with Vitest. End-to-end tests use Playwright
against a production preview; install its Chromium browser with
`bunx playwright install chromium` if needed. Evidence is stored under
`.omo/evidence/`.

Provider fixtures verify the integration without real credentials; they do
not prove a live provider's availability or generated-plan quality.
