import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const entry = '.omo/evidence/st_01a093ef/adductors.html';
const server = await createServer({ configFile: false, root: process.cwd(), optimizeDeps: { entries: [entry] }, server: { host: '127.0.0.1', port: 5197, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: '/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    let resolveFrame;
    window.firstGraphicsFrame = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Graphics initialization timeout')), 10000);
      resolveFrame = () => { clearTimeout(timeout); resolve(); };
    });
    const clear = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function(mask) { clear.call(this, mask); if (mask & this.COLOR_BUFFER_BIT) { resolveFrame(); window.dispatchEvent(new Event('graphics-frame')); } };
  });
  await page.goto(`http://127.0.0.1:5197/${entry}`); await page.evaluate(() => window.firstGraphicsFrame);
  const patches = await page.evaluate(() => window.adductorPatches());
  console.log(`PRIMARY_ADDUCTOR_PATCHES=${patches}`);
  assert.equal(patches, 2, 'Seated hip adduction must render two primary inner-thigh muscle patches');
  await page.screenshot({ path: '.omo/evidence/st_01a093ef/adductors-angled.png' });
  await page.evaluate(() => {
    window.nextGraphicsFrame = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Camera frame timeout')), 5000);
      window.addEventListener('graphics-frame', () => { clearTimeout(timeout); resolve(); }, { once: true });
    });
  });
  await page.getByRole('button', { name: 'front view', exact: true }).click(); await page.evaluate(() => window.nextGraphicsFrame);
  await page.screenshot({ path: '.omo/evidence/st_01a093ef/adductors-front.png' });
  assert.deepEqual(errors, []); console.log('ADDUCTOR_CHECK=PASS PAGE_ERRORS=0 CAPTURES=2');
} finally { await browser.close(); await server.close(); console.log('ADDUCTOR_SERVER_CLOSED port=5197'); }
