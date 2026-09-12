# Catalog verification and adductor correction

The lead read all catalog rows, planner/query/storage implementations and boundary
schema. Initial independent core run: 44 tests passed.

Classification regression added before correction:
`bun run test src/core/catalog.test.ts` exited 1, with 1 failed and 15 passed.
The hip-adductor machine's primary group was incorrectly core rather than
adductors. The new assertion failed with `expected false to be true`.

The correction adds the adductors taxonomy and replaces the artificial core
entry with real seated hip adduction and cable hip adduction. Both use explicitly
static schematics. The library contains 158 exercises across 11 muscle groups.

After correction, `bun run test src/core` passed 45 tests across 3 files.
Scoped compiler command passed with exit 0:

```sh
bunx tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 \
  --module ESNext --moduleResolution Bundler --lib ES2022,DOM \
  src/contracts.ts src/catalog/*.ts src/core/*.ts
```

Public API smoke imported the real catalog/query modules using Bun, queried
available adductors and selected a cable substitute for the seated machine:

```json
{"count":158,"filtered":["seated-hip-adduction","cable-hip-adduction"],"swap":"cable-hip-adduction"}
```

No QA resources were created. Graphics highlight and full browser UI checks
belong to final integration evidence. Whole-project typecheck at this point
reported an in-progress UI test error at `src/ui/App.test.tsx:15`, sent to its
owner; scoped catalog checks passed. LSP harness remains unavailable.
