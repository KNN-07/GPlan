# AI provider integration - ai

DAG node: `ai`. Task trace: `st_01a093ee`.

## Delivered

`src/ai/index.ts` exports exactly `AiError`, `discoverModels`, and `generatePlan` under the frozen `src/contracts.ts` / `.omo/contracts.md` signatures. No shared contracts, core/catalog, dependencies, or configuration were edited; no commits were created.

- Gemini REST discovery pages `GET https://generativelanguage.googleapis.com/v1beta/models`, follows `nextPageToken`, rejects repeated tokens, filters `supportedGenerationMethods` for `generateContent`, and authenticates with `x-goog-api-key`.
- Gemini generation posts to `models/{model}:generateContent`, supports manually entered IDs with or without `models/`, requests JSON output, rejects incomplete responses, and excludes thought parts from returned JSON.
- OpenAI-compatible roots preserve arbitrary API paths (including `/api/v1`) and normalize trailing slashes before appending `/models` or `/chat/completions`. HTTPS and localhost/loopback HTTP are accepted. URL credentials, query parameters, fragments, and other transport schemes are rejected.
- OpenAI-compatible servers may use an empty API key (no Authorization header); otherwise authentication is `Authorization: Bearer ...`. Manual model generation does not require discovery and does not force unsupported OpenAI JSON-mode extensions.
- Keys occur only in transient request headers: no URL insertion, logging, browser persistence, cookie credentials, cache storage, or upstream error-message/cause propagation. Redirects are forbidden to prevent header forwarding. Each HTTP exchange has a 60-second deadline and no automatic retry (generation can be billed).
- Compact eligible catalog metadata includes ID, name, primary/secondary muscles, movement, difficulty, and prescription kind; instructions and animation payloads are omitted. Eligibility uses OR across equipment options and AND within an option, including bodyweight `[[]]`.
- Zod parses provider envelopes and strictly parses plan objects. JSON or a whole enclosing JSON/plain fence is accepted; arbitrary repair, extra fields, unknown/unavailable IDs, duplicate exercises within a day, count mismatches, prescription-kind mismatches, nonfinite/fractional/out-of-range numbers, and blank names are rejected.
- Typed error codes cover authentication, rate-limit, provider, invalid-response, network/CORS, and caller abort, with HTTP `status` where applicable.

## Explicit assumptions

The frozen contracts do not specify numeric maxima. This adapter uses integer sets 1-20, repetitions 1-100 with min <= max, time 1-3600 seconds, and rest 0-1800 seconds. These bounds are included in the generation instruction and covered at their accepted/rejected boundaries. The supplied catalog and typed PlanRequest are trusted application inputs; generated values remain untrusted. Focus/experience are model guidance, not an invented hard exclusion rule. Browser CORS failure cannot be emulated by Node's HTTP implementation, so that one test injects the browser's rejected-fetch TypeError at the fetch boundary.

## Context7 / skills

Read programming skill plus TypeScript README, error-handling, data-modeling, and boundary logging references before implementation. Consulted current Context7 via its public API (no Context7 tool was exposed):

- `/websites/ai_google_dev_api` (Context7 indexed 2026-09-04): https://ai.google.dev/api/models and https://ai.google.dev/api confirm model pagination, generateContent filtering/path, and x-goog-api-key header.
- `/websites/developers_openai_api` (Context7 indexed 2026-08-25): https://developers.openai.com/api/reference/resources/models/methods/list and https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create confirm models list, chat messages, Bearer authentication, and choices/message/content response shape.

API queries used `/api/v2/libs/search?libraryName=...&query=...` followed by `/api/v2/context?libraryId=...&query=...&type=txt` on https://context7.com.

## Behavioral RED before implementation

Initial shared-setup failure was `ReferenceError: expect is not defined` before collection. A temporary skeleton-export patch also initially omitted a closing brace; that syntax error was fixed before accepting RED. Neither infrastructure/syntax failure is claimed as behavioral evidence.

Actual behavioral command: `bun run test src/ai --globals`. Before provider implementation, both public functions threw `AiError('provider', 'Not implemented')`. Abort assertions observe both promises immediately, so this RED has no unhandled rejections.

Exact final behavioral RED output excerpt (`red-behavior.log` contains the full output):

```text
 Test Files  3 failed (3)
      Tests  61 failed | 7 passed (68)
   Start at  11:48:57
   Duration  882ms (setup 39%, import 20%, tests 19%, transform 19%, worker 3%)

error: script "test" exited with code 1
```

## GREEN / static / runnable verification

All tests use isolated ephemeral-port HTTP servers; Gemini tests rewrite only its fixed origin to the real local server while asserting original URLs. Cancellation subscribes to the exact HTTP request event before calling the adapter, with bounded event timeouts and no fixed sleeps/polling. All fixtures close sockets and servers in afterEach.

Final required command `bun run test src/ai` passes after the lead changed shared setup to `@testing-library/jest-dom/vitest`. No AI module workaround or shared-file edit was made by this node. `discoverModels` retains its frozen readonly return contract; the UI adapts at its boundary.

Exact final command output (exit 0):

```text
$ vitest run --maxWorkers=4 --exclude=e2e/** src/ai

 RUN  v5.0.0 /home/norman/Repos/GPlan


 Test Files  3 passed (3)
      Tests  89 passed (89)
   Start at  12:02:09
   Duration  619ms (tests 39%, setup 26%, import 19%, transform 15%, worker 1%)
```

Earlier `bun run test src/ai --globals` verification (exit 0):

```text
 Test Files  3 passed (3)
      Tests  89 passed (89)
   Start at  11:53:42
   Duration  823ms (tests 35%, setup 29%, import 18%, transform 17%, worker 2%)
```

Scoped installed compiler command (exit 0, no output):

```sh
bunx tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --lib ES2022,DOM,DOM.Iterable --types node src/contracts.ts src/ai/*.ts
```

TypeScript 6 requires `--ignoreConfig` when checking explicit file inputs in a repository with tsconfig; the initial invocation without it produced TS5112, then the corrected command above passed. No compiler diagnostics were suppressed.

Programming audit command (exit 0):

```sh
bun run /home/norman/Repos/oh-my-openagent/packages/shared-skills/skills/programming/scripts/typescript/check-no-excuse-rules.ts src/ai
```

```text
No violations in 10 file(s).
```

Public runnable exercise: `bun -e` imported the public AI exports, started the real HTTP fixture, asserted exact discovery and generation results, then asserted a 401 produces AiError(authentication, status=401). Exit 0:

```text
PUBLIC_API_SMOKE: discovery, generation, authentication mapping passed; HTTP requests=3
CLEANUP: fixture server and sockets closed
```

## Integration history and remaining verification limitations

At the recorded verification, required exact command `bun run test src/ai` exited 1 before test collection because `tests/setup.ts:1` imported `@testing-library/jest-dom` while Vitest globals are disabled:

```text
ReferenceError: expect is not defined
 ❯ node_modules/@testing-library/jest-dom/dist/index.mjs:10:1
 ❯ tests/setup.ts:1:1
      1| import '@testing-library/jest-dom';
       | ^
```

Resolved by the lead: shared setup now imports `@testing-library/jest-dom/vitest`. The exact required command passes without any CLI override, as recorded above. Historical failure output is retained in `st_01a093ee/exact.log`; it is not the final verification result.

LSP diagnostics were requested for the entire `src/ai` directory before build. The tool returned:

```text
LSP server 'typescript' for .ts, .tsx, .js, .jsx, .mjs, .cjs, .mts, .cts is NOT INSTALLED.
Command not found: typescript-language-server
```

All ten AI TypeScript files were checked by the installed compiler. LSP verification remains unavailable, not claimed as passed. Integration guidance confirms that the harness can report a missing server even after installation; no harness repair or additional installation was attempted.

The earlier `bun run build` attempt exited 1 in concurrent graphics work, with no AI errors:

```text
src/graphics/ExerciseViewer.tsx(7,8): error TS2882: Cannot find module or type declarations for side-effect import of './viewer.css'.
src/graphics/Scene.tsx(22,41): error TS2345: Argument of type '(frames?: number | undefined) => void' is not assignable to parameter of type 'EventListener<{}, "change", OrbitControls<Camera>>'.
src/graphics/Scene.tsx(26,46): error TS2345: Argument of type '(frames?: number | undefined) => void' is not assignable to parameter of type 'EventListener<{}, "change", OrbitControls<Camera>>'.
```

These other-worker errors were not changed by this node. Full historical output is `st_01a093ee/build.log`. A current integrated root build remains the lead's verification responsibility; this follow-up reran only the assigned AI tests.

No monitor tool/command is exposed in this child. Checks were bounded bash calls (20-30 seconds); actual Vitest runs completed under one second, except an early pre-fix RED abort test run. No long-running background verification was launched.

## Self-review / cleanup receipts

Self-review was performed directly; no reviewer panel was used, as required by the integration guidance.

Files have single responsibilities: error type, HTTP boundary, provider-specific wire formats, draft validation/payload, public routing, HTTP fixture, and scoped test concerns. Untrusted values are parsed with Zod. Provider routing uses exhaustive `never` handling; no unsafe assertions/type suppressions or uninvited logging. Public options preserve frozen contract signatures. Ten files are 7-143 nonblank/noncomment lines each (all below 200).

- HTTP fixture teardown explicitly closes all connections and awaits server close; the standalone runnable smoke printed its cleanup receipt.
- `git diff --check -- src/ai .omo/evidence/st_01a093ee.md`: exit 0, no output.
- Production-source search for `Not implemented`, console calls, localStorage/sessionStorage, and core/catalog imports returned no matches.
- No test skips, sleeps, polling delays, new dependencies, config edits, or commits.
- System apply_patch was absent. All source/evidence edits used a temporary `apply_patch` command wrapping system `patch -p0 --forward`; no source files were overwritten outside patch application.
- Raw test/build/audit/smoke outputs are retained under `.omo/evidence/st_01a093ee/`. Temporary patch wrapper and transient logs under `/tmp/gplan-ai-st_01a093ee` are removed at handoff.
