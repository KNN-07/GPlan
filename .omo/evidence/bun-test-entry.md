# Complete test entry points

Before configuration, literal `bun test` tried to execute Vitest tests directly
without Vite's virtual-module resolution or jsdom. It failed on
`virtual:pwa-register`, `HTMLDialogElement`, and unsupported `vi` APIs.
The failed process tree was killed (`mon_80QAWGCN6AZBER3B`), closing its sockets.

`bunfig.toml` now points to `.bun-test/suite.test.js`, whose sole assertion
executes the complete Vitest suite and preserves its exit status.
Vitest excludes this launcher to avoid recursion; no product tests are removed.
`bun run test` invokes the same configured Vitest suite directly.

Failure propagation was observed with a real in-progress UI regression:
199 tests passed, 1 failed; the launcher correctly failed and exited 1.

Final literal `bun test`:

```text
Test Files  11 passed (11)
     Tests  211 passed (211)
(pass) the complete Vitest suite passes
1 pass
0 fail
```

Exit 0, monitor `mon_W45AX8R2FXK97F47`.
The outer single assertion represents all 211 inner assertions/tests, not a
replacement smoke test. No skipped tests or retries were added.

The package script uses `vitest run`; worker and exclusion settings have one
source of truth in `vitest.config.ts`.
