import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("the complete Vitest suite passes", () => {
  const result = spawnSync("node", ["node_modules/vitest/vitest.mjs", "run"], {
    cwd: new URL("../", import.meta.url),
    stdio: "inherit",
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  expect(result.status).toBe(0);
}, 125_000);
