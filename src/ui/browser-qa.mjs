import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { installCanvasProof, armCanvasProof, renderedCanvasProof } from "./canvas-proof.mjs";

const browser = await chromium.launch({
  executablePath: "/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const receipts = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
      serviceWorkers: "allow",
    });
    const page = await context.newPage();
    await installCanvasProof(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const click = (label) => page.getByRole("button", { name: label, exact: true }).click();
    const shot = async (label) => {
      const path = `.omo/evidence/ui-${name}-${label}.png`;
      await page.screenshot({ path });
      receipts.push({ viewport: name, screenshot: path });
    };
    await page.goto("http://127.0.0.1:4176");
    await expect(page.getByLabel("Search exercises")).toBeVisible();
    await shot("home");
    await click("Chest");
    await page.getByLabel("Filter equipment").selectOption("dumbbells");
    await page.getByLabel("Search exercises").fill("bench press");
    await page.getByLabel("My gym only").check();
    await page.locator(".library").scrollIntoViewIfNeeded();
    await shot("filtered");
    const detailTrigger = page.getByRole("button", { name: "View Dumbbell bench press", exact: true });
    await armCanvasProof(page);
    await detailTrigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const firstFrame = await renderedCanvasProof(page);
    receipts.push({ viewport: name, coldReducedMotionCanvas: firstFrame });
    await shot("detail");
    await page.getByRole("button", { name: "Close dialog", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => document.querySelector("dialog")?.contains(document.activeElement))).toBe(true);
    await shot("detail-instructions");
    await page.keyboard.press("Escape");
    await expect(detailTrigger).toBeFocused();
    await detailTrigger.click();
    await click("Add to plan");
    await click("View plan");
    await page.getByLabel("Plan name", { exact: true }).fill("Intentional strength");
    await page.getByLabel("Day name", { exact: true }).fill("Upper body");
    await page.getByLabel("Sets", { exact: true }).fill("4");
    await page.getByLabel("Min reps", { exact: true }).fill("6");
    await page.getByLabel("Max reps", { exact: true }).fill("10");
    await page.getByLabel("Rest (sec)", { exact: true }).fill("75");
    await page
      .locator(".plan-item")
      .first()
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await shot("plan");
    await click("Swap exercise");
    await shot("swap");
    const replacement = await page.locator(".swap-option strong").first().textContent();
    await page.locator(".swap-option").first().click();
    await expect(page.getByRole("button", { name: replacement, exact: true })).toBeVisible();
    await page.reload();
    await click("Plan");
    await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Intentional strength");
    await expect(page.getByLabel("Sets", { exact: true })).toHaveValue("4");
    await expect(page.getByRole("button", { name: replacement, exact: true })).toBeVisible();
    await page
      .locator(".plan-item")
      .first()
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await shot("reloaded");
    await click("Settings");
    await page.getByLabel("Search equipment").fill("dumb");
    await page.getByLabel("Dumbbells", { exact: true }).uncheck();
    await page.getByLabel("Search equipment").fill("");
    await shot("settings");
    await click("Select all");
    await page.getByLabel("Provider", { exact: true }).selectOption("openai-compatible");
    await page.getByLabel("Provider root URL").fill("https://gplan-fixture.invalid/v1");
    await page.getByLabel("API key", { exact: true }).fill("browser-fixture-secret");
    const modelRequests = [];
    await page.route("https://gplan-fixture.invalid/v1/models", async (route) => {
      modelRequests.push(route.request().url());
      await route.fulfill({ json: { data: [{ id: "fixture-strength-1" }] } });
    });
    await click("Discover models");
    await expect(page.getByLabel("Discovered models")).toBeVisible();
    await page.getByLabel("Discovered models").selectOption("fixture-strength-1");
    await click("Save AI preferences");
    await page.getByLabel("Manual model ID").scrollIntoViewIfNeeded();
    await shot("models");
    expect(modelRequests).toHaveLength(1);
    const persisted = await page.evaluate(() => localStorage.getItem("gplan.state.v1"));
    expect(persisted).not.toContain("browser-fixture-secret");
    await click("Plan");
    await click("Plan with AI");
    await page.getByLabel("Days per week").selectOption("1");
    await page.getByLabel("Exercises per day").selectOption("3");
    const requestReceived = page.waitForRequest("https://gplan-fixture.invalid/v1/chat/completions");
    await page.route("https://gplan-fixture.invalid/v1/chat/completions", async (route) => {
      const body = route.request().postDataJSON();
      const payload = JSON.parse(body.messages[1].content);
      const items = payload.catalog
        .slice(0, 3)
        .map((exercise) => ({
          exerciseId: exercise.id,
          sets: 3,
          restSeconds: 60,
          prescription:
            exercise.prescription === "time" ? { kind: "time", seconds: 30 } : { kind: "reps", min: 8, max: 12 },
        }));
      await route.fulfill({
        json: {
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ name: "Fixture strength", days: [{ name: "Full body", items }] }) },
            },
          ],
        },
      });
    });
    await click("Generate preview");
    await requestReceived;
    await expect(page.getByRole("button", { name: "Accept plan", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Accept plan", exact: true }).scrollIntoViewIfNeeded();
    await shot("ai-preview");
    await click("Accept plan");
    await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Fixture strength");
    await click("Dismiss notification");
    await shot("ai-accepted");
    await page.reload();
    await click("Settings");
    await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
    await page.getByLabel("Backup JSON").fill("{broken");
    await click("Import backup");
    await expect(page.getByRole("alert")).toBeVisible();
    await shot("import-error");
    const downloadReady = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON backup", exact: true }).click();
    const download = await downloadReady;
    expect(download.suggestedFilename()).toBe("gplan-backup.json");
    const exported = await page.getByLabel("Backup JSON").inputValue();
    expect(JSON.parse(exported).plans).toHaveLength(2);
    expect(exported).not.toContain("browser-fixture-secret");
    await click("Import backup");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await click("Plan");
    await click("New plan");
    await page.getByRole("dialog").getByLabel("Plan name").fill("Local foundation");
    await page.getByLabel("Days per week").selectOption("2");
    await page.getByLabel("Exercises per day").selectOption("3");
    await shot("local-request");
    await click("Create local plan");
    await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Local foundation");
    await expect(page.locator(".plan-item")).toHaveCount(3);
    await click("Dismiss notification");
    await page.locator(".plan-item").first().evaluate(element => element.scrollIntoView({ block: "start" }));
    await shot("local-plan");
    await context.setOffline(true);
    await click("Plan with AI");
    await expect(page.getByRole("button", { name: "Generate preview", exact: true })).toBeDisabled();
    await shot("offline-ai");
    await click("Close dialog");
    await click("New plan");
    await page.getByRole("dialog").getByLabel("Plan name").fill("Offline manual journal");
    await page.getByLabel("Days per week").selectOption("1");
    await click("Start manual plan");
    await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Offline manual journal");
    await click("Dismiss notification");
    await shot("offline-manual");
    await context.setOffline(false);
    for (const target of ["Exercises", "Plan", "Settings"]) {
      await click(target);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    if (name === "mobile") {
      await page.setViewportSize({ width: 360, height: 844 });
      for (const target of ["Exercises", "Plan", "Settings"]) {
        await click(target);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await shot("360-settings");
    }
    expect(errors).toEqual([]);
    receipts.push({
      viewport: name,
      workflow:
        "filter -> detail/focus/Escape -> add -> rename/prescription -> swap -> reload -> equipment -> explicit discovery fixture -> generation preview -> accept -> reload key cleared -> invalid import -> export download -> valid import -> local generation -> offline AI disabled -> offline manual creation",
      pageErrors: errors,
      overflow: false,
      liveProvider: false,
    });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(".omo/evidence/ui-browser-receipts.json", JSON.stringify({ receipts, browserClosed: true }, null, 2));
}
console.log(JSON.stringify(receipts, null, 2));
