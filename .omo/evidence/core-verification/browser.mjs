import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium } from 'playwright';
const directory = '.omo/evidence/core-verification';
const server = await preview({ preview: { host: '127.0.0.1', port: 5198, strictPort: true } });
let browser;
const errors = [];
const results = [];
async function compositor(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Compositor timeout')), 5000);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
  }));
}
async function armFrames(page, count = 1) {
  await page.evaluate(count => {
    const start = globalThis.graphicsFrames;
    globalThis.nextGraphics = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { window.removeEventListener('graphics-render', changed); reject(new Error('Graphics event timeout')); }, 10000);
      function changed() { if (globalThis.graphicsFrames >= start + count) { clearTimeout(timer); window.removeEventListener('graphics-render', changed); resolve(); } }
      window.addEventListener('graphics-render', changed);
    });
  }, count);
}
async function frameDone(page) { await page.evaluate(() => globalThis.nextGraphics); }
try {
  browser = await chromium.launch({ executablePath: '/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    globalThis.graphicsFrames = 0;
    const clear = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function(mask) {
      clear.call(this, mask);
      if (mask & this.COLOR_BUFFER_BIT) { globalThis.graphicsFrames++; window.dispatchEvent(new Event('graphics-render')); }
    };
  });
  await page.goto('http://127.0.0.1:5198/');
  await page.getByRole('button', { name: 'View Dumbbell curl', exact: true }).waitFor();
  assert.equal(await page.getByTestId('exercise-card').count(), 158);
  assert.equal(await page.locator('canvas').count(), 0);
  await armFrames(page);
  await page.getByRole('button', { name: 'View Dumbbell curl', exact: true }).click();
  await frameDone(page);
  assert.equal(await page.locator('canvas').count(), 1);
  const dpr = await page.locator('canvas').evaluate(canvas => canvas.width / canvas.clientWidth);
  assert.ok(dpr <= 1.51);
  results.push({ behavior: '158 catalog cards; lazy detail mounts one WebGL canvas', dpr });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await compositor(page);
  const paused = await page.locator('canvas').screenshot();
  const before = await page.evaluate(() => graphicsFrames);
  await compositor(page);
  assert.ok(paused.equals(await page.locator('canvas').screenshot()));
  assert.equal(await page.evaluate(() => graphicsFrames), before);
  results.push({ behavior: 'Pause freezes rendered pixels and frame count' });
  await page.screenshot({ path: `${directory}/desktop-detail.png`, fullPage: true });
  await armFrames(page);
  await page.getByRole('button', { name: 'side view', exact: true }).click();
  await frameDone(page);
  assert.ok(!paused.equals(await page.locator('canvas').screenshot()));
  results.push({ behavior: 'Side camera changes actual canvas pixels' });
  await armFrames(page, 20);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await frameDone(page);
  assert.equal(await page.locator('.exercise-viewer').getAttribute('data-playing'), 'true');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await compositor(page);
  results.push({ behavior: 'Play resumes actual WebGL frames' });
  await page.setViewportSize({ width: 375, height: 900 });
  await compositor(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${directory}/mobile-detail.png`, fullPage: true });
  results.push({ behavior: '375px detail has no page horizontal overflow' });
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click();
  assert.equal(await page.locator('canvas').count(), 0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gplan.state.v1')));
  assert.equal(saved.plans[0].days[0].items[0].exerciseId, 'dumbbell-curl');
  assert.equal(saved.plans[0].days[0].items[0].prescription.kind, 'reps');
  await page.reload();
  await page.getByRole('button', { name: 'Open your plan', exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('gplan.state.v1'))), saved);
  results.push({ behavior: 'Detail add materializes valid manual plan; canvas unmounts; reload preserves exact saved state' });
  await page.close();
  const reduced = await browser.newPage({ viewport: { width: 768, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  reduced.on('pageerror', error => errors.push(error.message));
  await reduced.goto('http://127.0.0.1:5198/');
  await reduced.getByRole('button', { name: 'View Dumbbell curl', exact: true }).click();
  await reduced.locator('canvas').screenshot();
  assert.equal(await reduced.locator('.exercise-viewer').getAttribute('data-playing'), 'false');
  await reduced.screenshot({ path: `${directory}/reduced-motion.png`, fullPage: true });
  await reduced.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await reduced.locator('[data-state="fallback"]').waitFor({ state: 'visible' });
  assert.equal(await reduced.locator('canvas').count(), 0);
  assert.ok(await reduced.getByRole('button', { name: 'Play', exact: true }).isDisabled());
  await reduced.screenshot({ path: `${directory}/context-loss.png`, fullPage: true });
  results.push({ behavior: 'Reduced motion defaults paused; real context loss unmounts WebGL and exposes text fallback' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors }, null, 2));
  await writeFile(`${directory}/browser.json`, JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
