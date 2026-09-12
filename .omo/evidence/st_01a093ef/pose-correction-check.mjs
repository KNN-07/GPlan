import assert from 'node:assert/strict';
import { createServer, build } from 'vite';
import { chromium } from 'playwright';
const directory = '.omo/evidence/st_01a093ef';
const entry = `${directory}/pose-correction.html`;
const server = await createServer({ configFile: false, root: process.cwd(), optimizeDeps: { entries: [entry] }, server: { host: '127.0.0.1', port: 5197, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  for (const scenario of ['hip', 'seated']) {
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
    await page.goto(`http://127.0.0.1:5197/${entry}?case=${scenario}`); await page.evaluate(() => window.firstGraphicsFrame);
    const samples = await page.evaluate(() => new Promise((resolve, reject) => {
      const poses = [];
      const timeout = setTimeout(() => { window.removeEventListener('graphics-frame', frame); reject(new Error('Graphics sampling timeout')); }, 10000);
      function frame() {
        poses.push(window.poseSnapshot());
        if (poses.length === 20) { clearTimeout(timeout); window.removeEventListener('graphics-frame', frame); resolve(poses); }
      }
      window.addEventListener('graphics-frame', frame);
    }));
    if (scenario === 'hip') {
      assert.equal(new Set(samples.map(sample => sample.fingerprint)).size, 1, 'Unsupported hip-isolation must hold all rendered transforms static');
      console.log('HIP_STATIC_TRANSFORMS=PASS SAMPLED_RENDER_FRAMES=20');
    } else {
      for (const sample of samples) { assert.equal(sample.rootY, .65); assert.deepEqual(sample.hips, [-1.5, -1.5]); }
      console.log('SEATED_SQUAT=PASS ROOT_Y=0.65 HIPS=[-1.5,-1.5] SAMPLED_RENDER_FRAMES=20');
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.screenshot({ path: `${directory}/correction-${scenario}-angled.png` });
    await page.evaluate(() => { window.nextFrame = new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Camera frame timeout')), 5000); window.addEventListener('graphics-frame', () => { clearTimeout(timeout); resolve(); }, { once: true }); }); });
    await page.getByRole('button', { name: 'front view', exact: true }).click(); await page.evaluate(() => window.nextFrame);
    await page.screenshot({ path: `${directory}/correction-${scenario}-front.png` });
    assert.deepEqual(errors, []); console.log(`SCENARIO=${scenario} PAGE_ERRORS=0 CAPTURES=2`);
    await page.close();
  }
  await build({ configFile: false, build: { outDir: `${directory}/pose-correction-build`, emptyOutDir: true, rollupOptions: { input: entry } } });
  console.log('POSE_CORRECTION_BUILD=PASS');
} finally { await browser?.close(); await server.close(); console.log('POSE_CORRECTION_SERVER_CLOSED port=5197'); }
