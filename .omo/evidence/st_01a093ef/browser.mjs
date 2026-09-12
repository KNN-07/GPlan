import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const directory = '.omo/evidence/st_01a093ef';
const executablePath = '/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const url = 'http://127.0.0.1:5197/.omo/evidence/st_01a093ef/harness.html';
async function instrument(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    globalThis.graphicsProbe = { frames: 0 };
    const original = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function(mask) {
      original.call(this, mask);
      if (mask & this.COLOR_BUFFER_BIT) {
        globalThis.graphicsProbe.frames += 1;
        window.dispatchEvent(new Event('graphics-render'));
      }
    };
  });
}
async function armFrames(page, count = 1) {
  await page.evaluate(count => {
    const start = globalThis.graphicsProbe.frames;
    globalThis.graphicsSignal = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { window.removeEventListener('graphics-render', changed); reject(new Error('No real graphics frame')); }, 10000);
      function changed() { if (globalThis.graphicsProbe.frames >= start + count) { clearTimeout(timeout); window.removeEventListener('graphics-render', changed); resolve(); } }
      window.addEventListener('graphics-render', changed);
    });
  }, count);
}
async function framesDone(page) { await page.evaluate(() => globalThis.graphicsSignal); }
async function compositor(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Compositor timeout')), 5000);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timeout); resolve(); }));
  }));
}
async function capture(page, name) { await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true }); }
async function clickView(page, name) {
  await armFrames(page); await page.getByRole('button', { name, exact: true }).click(); await framesDone(page);
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await instrument(page);
  await page.goto(url);
  await armFrames(page); await framesDone(page);
  assert.equal(await page.locator('canvas').count(), 1);
  const dpr = await page.locator('canvas').evaluate(canvas => canvas.width / canvas.clientWidth);
  assert.ok(dpr <= 1.5 + .01); results.push({ behavior: 'one canvas, capped DPR', dpr });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await compositor(page);
  const pausedBefore = await page.locator('canvas').screenshot();
  const frameBefore = await page.evaluate(() => graphicsProbe.frames);
  await compositor(page);
  const pausedAfter = await page.locator('canvas').screenshot();
  assert.ok(pausedBefore.equals(pausedAfter));
  assert.equal(await page.evaluate(() => graphicsProbe.frames), frameBefore);
  await capture(page, 'desktop-paused'); results.push({ behavior: 'pause freezes pixels and render count', frameBefore });
  for (const angle of ['front', 'side', 'back']) {
    await clickView(page, `${angle} view`); await capture(page, `angle-${angle}`);
  }
  await clickView(page, 'Reset view');
  const reset = await page.locator('canvas').screenshot();
  const box = await page.locator('canvas').boundingBox();
  assert.ok(box);
  await armFrames(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2 + 30, { steps: 12 }); await page.mouse.up();
  await framesDone(page); await compositor(page);
  const orbited = await page.locator('canvas').screenshot(); assert.ok(!orbited.equals(reset));
  await capture(page, 'angle-orbit');
  await armFrames(page); await page.mouse.wheel(0, -160); await framesDone(page);
  assert.ok(!(await page.locator('canvas').screenshot()).equals(orbited));
  await capture(page, 'angle-zoom'); results.push({ behavior: 'wheel zoom changes the actual canvas' });
  await armFrames(page); await page.getByRole('button', { name: 'Reset view', exact: true }).focus(); await page.keyboard.press('Enter'); await framesDone(page);
  assert.ok((await page.locator('canvas').screenshot()).equals(reset)); results.push({ behavior: 'orbit and keyboard reset restore exact pixels' });
  await armFrames(page, 25); await page.getByRole('button', { name: 'Play', exact: true }).click(); await framesDone(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await compositor(page);
  assert.ok(!(await page.locator('canvas').screenshot()).equals(pausedBefore)); await capture(page, 'desktop-motion'); results.push({ behavior: 'play changes articulated pixels' });
  const cases = [
    ['squat', 'standing', 'barbell'], ['hinge', 'standing', 'dumbbells'], ['lunge', 'standing', 'none'],
    ['horizontal-press', 'supine', 'barbell'], ['vertical-press', 'seated', 'dumbbells'],
    ['horizontal-pull', 'seated', 'cable'], ['vertical-pull', 'seated', 'machine'],
    ['curl', 'standing', 'dumbbells'], ['extension', 'seated', 'machine'], ['raise', 'standing', 'dumbbells'],
    ['calf-raise', 'standing', 'machine'], ['crunch', 'supine', 'none'], ['leg-curl', 'prone', 'machine'], ['static', 'quadruped', 'none'],
  ];
  for (const [family, posture, prop] of cases) {
    await page.getByLabel('Family', { exact: true }).selectOption(family);
    await page.getByLabel('Posture', { exact: true }).selectOption(posture);
    await page.getByLabel('Prop', { exact: true }).selectOption(prop);
    await armFrames(page, 20); await page.getByRole('button', { name: 'Play', exact: true }).click(); await framesDone(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).click(); await compositor(page);
    assert.equal(await page.locator('canvas').count(), 1);
    await capture(page, `family-${family}`);
    results.push({ behavior: 'family rendered', family, posture, prop });
  }
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 1000 }); await compositor(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await capture(page, `responsive-${width}`); results.push({ behavior: 'responsive without overflow', width });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.getByLabel('Family', { exact: true }).selectOption('curl');
  await page.getByLabel('Posture', { exact: true }).selectOption('standing');
  await armFrames(page); await page.getByRole('button', { name: 'Play', exact: true }).click(); await framesDone(page);
  await page.context().setOffline(true);
  await clickView(page, 'side view'); results.push({ behavior: 'camera and playback work with network offline' });
  await page.evaluate(() => new Promise((resolve, reject) => {
    const viewer = document.querySelector('.exercise-viewer');
    const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Offscreen visibility timeout')); }, 5000);
    const observer = new MutationObserver(() => { if (viewer.dataset.playing === 'false') { clearTimeout(timer); observer.disconnect(); resolve(); } });
    observer.observe(viewer, { attributes: true, attributeFilter: ['data-playing'] });
    const spacer = document.createElement('div'); spacer.id = 'offscreen-proof'; spacer.style.height = '2000px'; document.body.append(spacer); window.scrollTo(0, document.body.scrollHeight);
  }));
  await compositor(page);
  const offscreenFrames = await page.evaluate(() => graphicsProbe.frames); await compositor(page);
  assert.equal(await page.evaluate(() => graphicsProbe.frames), offscreenFrames); results.push({ behavior: 'real IntersectionObserver stops offscreen rendering' });
  await armFrames(page);
  await page.evaluate(() => { document.getElementById('offscreen-proof').remove(); window.scrollTo(0, 0); }); await framesDone(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await compositor(page);
  assert.equal(await page.locator('.exercise-viewer').getAttribute('data-playing'), 'false');
  const hiddenFrames = await page.evaluate(() => graphicsProbe.frames); await compositor(page);
  assert.equal(await page.evaluate(() => graphicsProbe.frames), hiddenFrames); results.push({ behavior: 'visibility event stops rendering', hiddenFrames });
  await armFrames(page);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await framesDone(page);
  await page.getByRole('button', { name: 'Toggle mount', exact: true }).click(); await compositor(page);
  assert.equal(await page.locator('canvas').count(), 0);
  const unmountedFrames = await page.evaluate(() => graphicsProbe.frames); await compositor(page);
  assert.equal(await page.evaluate(() => graphicsProbe.frames), unmountedFrames); results.push({ behavior: 'unmount removes canvas and stops rendering' });
  await page.close();
  const uncontrolled = await browser.newPage({ viewport: { width: 768, height: 1000 } });
  await instrument(uncontrolled); await uncontrolled.goto(`${url}?uncontrolled`);
  await armFrames(uncontrolled); await framesDone(uncontrolled);
  await uncontrolled.getByRole('button', { name: 'Pause', exact: true }).click(); await compositor(uncontrolled);
  assert.equal(await uncontrolled.locator('.graphics-isolated').getAttribute('data-playing'), 'false');
  await armFrames(uncontrolled); await uncontrolled.getByRole('button', { name: 'Play', exact: true }).click(); await framesDone(uncontrolled);
  assert.equal(await uncontrolled.locator('.graphics-isolated').getAttribute('data-playing'), 'true'); results.push({ behavior: 'uncontrolled optional props and className work' });
  await uncontrolled.close();
  const reduced = await browser.newPage({ viewport: { width: 768, height: 1000 }, reducedMotion: 'reduce' });
  await instrument(reduced); await reduced.goto(url); await reduced.locator('canvas').screenshot();
  assert.equal(await reduced.locator('.exercise-viewer').getAttribute('data-playing'), 'false');
  await capture(reduced, 'reduced-motion');
  await armFrames(reduced, 5); await reduced.getByRole('button', { name: 'Play', exact: true }).click(); await framesDone(reduced);
  assert.equal(await reduced.locator('.exercise-viewer').getAttribute('data-playing'), 'true'); results.push({ behavior: 'reduced motion defaults paused, explicit play works' });
  await reduced.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await reduced.getByRole('status').waitFor({ state: 'visible' });
  assert.equal(await reduced.locator('canvas').count(), 0);
  assert.equal(await reduced.getByRole('button', { name: 'Pause', exact: true }).isDisabled(), true);
  await capture(reduced, 'fallback-context-loss'); results.push({ behavior: 'real context loss gives accessible fallback' });
  await reduced.close();
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/browser-results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ browserChecks: results.length, errors, results }, null, 2));
} finally { await browser.close(); }
const unsupportedBrowser = await chromium.launch({ executablePath, headless: true, args: ['--disable-webgl'] });
try {
  const page = await unsupportedBrowser.newPage({ viewport: { width: 375, height: 1000 } });
  const expectedErrors = [];
  page.on('pageerror', error => expectedErrors.push(error.message));
  await page.goto(url); await page.locator('[data-state="fallback"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('canvas').count(), 0);
  await capture(page, 'fallback-unsupported');
  console.log(JSON.stringify({ behavior: 'WebGL disabled fallback', expectedErrors }));
} finally { await unsupportedBrowser.close(); }
