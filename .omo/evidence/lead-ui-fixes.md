# Lead UI edge corrections

RED: `bun run test src/ui/App.test.tsx` failed 3 cases, with 10 passing.
Loading/importing a valid null-active backup created 2 plans instead of 1 after
adding to the displayed plan. Saving a remote HTTP provider root succeeded.

Fixes:
- Normalize active selection at the UI state load/update boundary.
- Reuse the actual OpenAI-compatible adapter URL validator before saving.

GREEN: `bun run test src/ui && bun run build` exited 0. All 20 UI tests passed.
LSP remains unavailable in the harness; TypeScript compilation passed.

## Actual production browser

Lead drove Playwright Chromium at `http://localhost:4189`, viewport 390x844.
The built app was used, without mocking application modules.

1. Settings: paste valid backup with plan ID `imported-plan`, one empty day,
   and `activePlanId: null`; click Import backup.
2. Plan displays Imported routine. Click Add a movement, then
   Add Dumbbell bench press to plan, then View plan.
3. Reload and open Plan. Actual persisted result:
   `plans=1`, `activePlanId=imported-plan`,
   `exerciseId=dumbbell-bench-press`.
4. Settings: select OpenAI-compatible, root `http://provider.example/v1`,
   model `example-model`; Save AI preferences. Visible alert; persisted
   `aiPreferences` remains null.
5. Change root to `http://localhost:1234/v1`; Save AI preferences.
   Actual persisted root matches localhost.

Screenshots opened by lead:
- `lead-import-plan.png`
- `lead-provider-rejected.png`

No browser page errors.

Cleanup: isolated context and browser closed; preview
`mon_Y8BNXCQJKYQMNMF6` killed; `ss -ltn "( sport = :4189 )"` has no listeners.
