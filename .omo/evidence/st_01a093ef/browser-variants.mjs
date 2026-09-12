import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { exercises } from '../../../src/catalog';
const names = ['Single-leg leg press', 'Single-leg Romanian deadlift', 'Cable hip abduction'];
const browser = await chromium.launch({ executablePath: '/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  for (const name of names) {
    const exercise = exercises.find(value => value.name === name); assert.ok(exercise);
    const page = await browser.newPage({ viewport: { width: 768, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const clear = WebGL2RenderingContext.prototype.clear;
      WebGL2RenderingContext.prototype.clear = function(mask) { clear.call(this, mask); if (mask & this.COLOR_BUFFER_BIT) window.dispatchEvent(new Event('graphics-render')); };
    });
    await page.goto(`http://127.0.0.1:5197/.omo/evidence/st_01a093ef/harness.html?exercise=${exercise.id}`);
    await page.evaluate(() => new Promise((resolve, reject) => {
      let frames = 0; const timer = setTimeout(() => reject(new Error('Renderer timeout')), 10000);
      function rendered() { if (++frames === 30) { clearTimeout(timer); window.removeEventListener('graphics-render', rendered); resolve(); } }
      window.addEventListener('graphics-render', rendered);
    }));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.screenshot({ path: `.omo/evidence/st_01a093ef/variant-${exercise.id}.png` });
    assert.deepEqual(errors, []); console.log(JSON.stringify({ name, metadata: exercise.animation, errors }));
    await page.close();
  }
} finally { await browser.close(); }
