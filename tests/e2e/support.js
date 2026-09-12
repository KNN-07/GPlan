import { test as base, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installCanvasProof, armCanvasProof, renderedCanvasProof } from '../../src/ui/canvas-proof.mjs';

export { expect };
export const stateKey = 'gplan.state.v1';
export const savedState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), stateKey);
export const test = base.extend({
  qa: [async ({ page, context }, use, info) => {
    const directory = `.omo/evidence/release/${info.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await mkdir(directory, { recursive: true });
    const receipt = { test: info.title, actions: [], screenshots: [], pageErrors: [], consoleErrors: [], requests: [], contextClosed: false };
    page.on('pageerror', error => receipt.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push(message.text()); });
    await installCanvasProof(page);
    const action = async (name, perform) => {
      const entry = { action: name, completed: false };
      receipt.actions.push(entry);
      const result = await base.step(name, perform);
      entry.completed = true;
      return result;
    };
    const qa = {
      receipt, action,
      click: name => action(`click ${name}`, () => page.getByRole('button', { name, exact: true }).click()),
      fill: (label, value) => action(`fill ${label}: ${label === 'API key' ? '[memory-only sentinel]' : value}`, () => page.getByLabel(label, { exact: true }).fill(value)),
      select: (label, value) => action(`select ${label}: ${value}`, () => page.getByLabel(label, { exact: true }).selectOption(value)),
      shot: async name => {
        const path = `${directory}/${name}.png`;
        await page.screenshot({ path });
        receipt.screenshots.push(path);
      },
      draw: async (name, trigger) => {
        await armCanvasProof(page);
        await action(name, trigger);
        const proof = await renderedCanvasProof(page);
        expect(proof.litPixels).toBeGreaterThan(100);
        expect(proof.highlightPixels).toBeGreaterThan(20);
        receipt.actions.push({ action: 'nonempty real framebuffer', completed: true, proof });
        return proof;
      },
      overflow: async () => {
        const sizes = await page.evaluate(() => {
          const dialog = document.querySelector('dialog');
          return { viewport: innerWidth, page: document.documentElement.scrollWidth,
            dialogClient: dialog?.clientWidth, dialogScroll: dialog?.scrollWidth };
        });
        receipt.actions.push({ action: 'measure overflow', completed: true, sizes });
        expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
        if (sizes.dialogClient !== undefined) expect(sizes.dialogScroll).toBeLessThanOrEqual(sizes.dialogClient);
      },
    };
    try {
      await use(qa);
      expect(receipt.pageErrors).toEqual([]);
    } finally {
      if (info.status !== info.expectedStatus && !page.isClosed()) await qa.shot('failure');
      await context.close();
      receipt.contextClosed = true;
      receipt.status = info.status;
      await writeFile(`${directory}/actions.json`, JSON.stringify(receipt, null, 2));
    }
  }, { auto: true }],
});

// Subscribe before the transition; deadlines only bound failure, never pace tests.
export async function activeServiceWorker(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = setTimeout(() => { cleanup(); reject(new Error('No activated controlling service worker')); }, 15000);
    const cleanup = () => { clearTimeout(deadline); navigator.serviceWorker.removeEventListener('controllerchange', check); };
    async function check() {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;
      const registration = await navigator.serviceWorker.ready;
      if (registration.active?.state !== 'activated') return;
      cleanup();
      resolve({ controller: controller.scriptURL, active: registration.active.state });
    }
    navigator.serviceWorker.addEventListener('controllerchange', check);
    void check();
  }));
}

async function offlineTransition(page, change) {
  await page.evaluate(() => {
    globalThis.offlineSignal = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => { window.removeEventListener('offline', changed); reject(new Error('Missing offline event')); }, 10000);
      function changed() { clearTimeout(deadline); resolve(navigator.onLine); }
      window.addEventListener('offline', changed, { once: true });
    });
  });
  await change();
  expect(await page.evaluate(() => globalThis.offlineSignal)).toBe(false);
}

export const goOffline = (page, context) => offlineTransition(page, () => context.setOffline(true));

export async function reloadOffline(page, context) {
  await page.reload();
  // Chromium 151 resets navigator.onLine on every navigation, even on a data
  // document without an app/SW. Transport stays offline. Reassert the browser's
  // native state via CDP, not a navigator override or synthetic application event.
  if (await page.evaluate(() => navigator.onLine)) {
    const cdp = await context.newCDPSession(page);
    await offlineTransition(page, () => cdp.send('Network.overrideNetworkState', {
      offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    }));
    // Keep emulation attached until the isolated context closes; detach resets it.
  }
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  // Workbox explicitly excludes /api: a live preview server must be unreachable.
  expect(await page.evaluate(() => fetch('/api/release-uncached-probe', { cache: 'no-store' })
    .then(response => response.status, error => error.name))).toBe('TypeError');
}

export const emptyBackup = {
  schemaVersion: 1, gym: { availableEquipment: ['dumbbells', 'bench'] }, activePlanId: null, aiPreferences: null,
  plans: [{ id: 'imported-plan', name: 'Imported empty session', source: 'manual',
    createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:00:00.000Z',
    days: [{ id: 'imported-day', name: 'Empty day', items: [] }] }],
};
