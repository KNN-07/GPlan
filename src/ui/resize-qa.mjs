import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { installCanvasProof, armCanvasProof, renderedCanvasProof } from "./canvas-proof.mjs";

const phase = process.argv[2] ?? "after";
const browser = await chromium.launch({
  executablePath: "/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const receipts = { phase, measurements: [], pageErrors: [], browserClosed: false };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
  page.on("pageerror", error => receipts.pageErrors.push(error.message));
  await installCanvasProof(page);
  await page.goto("http://127.0.0.1:4176");
  await armCanvasProof(page);
  await page.getByRole("button", { name: "View Dumbbell curl", exact: true }).click();
  receipts.coldCanvas = await renderedCanvasProof(page);
  const canvas = await page.locator(".exercise-viewer canvas").elementHandle();
  expect(canvas).not.toBeNull();
  await armCanvasProof(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  receipts.desktopCanvas = await renderedCanvasProof(page);
  await page.screenshot({ path: `.omo/evidence/ui-resize-${phase}-desktop.png` });
  // Resize the existing page: no navigation, remount, or replacement canvas.
  await armCanvasProof(page);
  await page.setViewportSize({ width: 375, height: 900 });
  receipts.resizedCanvas = await renderedCanvasProof(page);
  await page.screenshot({ path: `.omo/evidence/ui-resize-${phase}-mobile.png` });
  const mobile = await page.evaluate(() => {
    const dialog = document.querySelector("dialog");
    const grid = document.querySelector(".detail-grid");
    const viewer = document.querySelector(".exercise-viewer");
    return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, dialogClient: dialog.clientWidth, dialogScroll: dialog.scrollWidth, gridWidth: grid.getBoundingClientRect().width, gridTrack: getComputedStyle(grid).gridTemplateColumns, viewerWidth: viewer.getBoundingClientRect().width, canvasWidth: viewer.querySelector("canvas").getBoundingClientRect().width };
  });
  receipts.measurements.push(mobile);
  expect(await canvas.evaluate(element => element === document.querySelector(".exercise-viewer canvas"))).toBe(true);
  expect(mobile.dialogScroll).toBeLessThanOrEqual(mobile.dialogClient);
  expect(mobile.viewerWidth).toBeLessThanOrEqual(mobile.gridWidth);
  expect(mobile.canvasWidth).toBeLessThanOrEqual(mobile.gridWidth);
  expect(mobile.pageWidth).toBeLessThanOrEqual(mobile.viewport);
  // Camera control remains functional in the resized, retained scene.
  await armCanvasProof(page);
  await page.getByRole("button", { name: "side view", exact: true }).click();
  receipts.sideCanvas = await renderedCanvasProof(page);
  expect(receipts.sideCanvas.fingerprint).not.toBe(receipts.resizedCanvas.fingerprint);
  await page.screenshot({ path: `.omo/evidence/ui-resize-${phase}-side.png` });
  expect(await canvas.evaluate(element => element === document.querySelector(".exercise-viewer canvas"))).toBe(true);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  for (const width of [375, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Exercises", exact: true }).click();
    await page.screenshot({ path: `.omo/evidence/ui-resize-${phase}-catalog-${width}.png` });
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, chipRight: document.querySelector(".focus-chips").getBoundingClientRect().right }));
    receipts.measurements.push(sizes);
    expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.chipRight).toBeLessThanOrEqual(sizes.viewport);
  }
  expect(receipts.pageErrors).toEqual([]);
} finally {
  await browser.close();
  receipts.browserClosed = true;
  await writeFile(`.omo/evidence/ui-resize-${phase}.json`, JSON.stringify(receipts, null, 2));
}
console.log(JSON.stringify(receipts, null, 2));
