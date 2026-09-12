# Vitest setup correction

Command: `bun run test src/ai`

Before: exit 1; all 3 suites failed before collection with
`ReferenceError: expect is not defined`.

Correction: import `@testing-library/jest-dom/vitest` in `tests/setup.ts`,
instead of the global-Jest entry point.

After: exit 0; 3 test files passed, 89 tests passed.
Monitor: `mon_T1D8QMV43BTMQZ8M`.

The adapter tests exercise HTTP fixtures and close their servers after each test.
No persistent QA resource was created by the lead.

LSP diagnostics were attempted but the harness reports the installed language
server as unavailable. TypeScript compiler verification is used separately.
