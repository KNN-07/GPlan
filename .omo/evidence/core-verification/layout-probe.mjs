import { preview } from 'vite';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const directory = '.omo/evidence/core-verification';
const server = await preview({ preview: { host: '127.0.0.1', port: 5198, strictPort: true } });
let browser;
const observations = [];
async function measure(page, scenario) {
  observations.push({ scenario, ...await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, scrollX, nodes: ['.dialog', '.dialog-content', '.detail-grid', '.exercise-viewer', '.gv-scene', 'canvas', '.catalog-hero', '.filter-bar', '.focus-chips', '.results-line', '.exercise-grid'].map(selector => {
    const element = document.querySelector(selector); if (!element) return {selector, absent:true};
    const r=element.getBoundingClientRect(); const c=getComputedStyle(element);
    return {selector,left:r.left,right:r.right,width:r.width,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,overflowX:c.overflowX,gridTemplateColumns:c.gridTemplateColumns,minWidth:c.minWidth};
  }) })) });
  await page.screenshot({ path: `${directory}/${scenario}.png` });
}
try {
  browser = await chromium.launch({ executablePath:'/home/norman/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless:true,args:['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({viewport:{width:1280,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:5198/');
  await page.getByRole('button',{name:'View Dumbbell curl',exact:true}).click();
  await page.locator('canvas').screenshot();
  await measure(page,'probe-desktop-detail');
  await page.setViewportSize({width:375,height:900});
  await page.locator('canvas').screenshot();
  await measure(page,'probe-resized-mobile-detail');
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await measure(page,'probe-mobile-closed');
  const mobile=await browser.newPage({viewport:{width:375,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await mobile.goto('http://127.0.0.1:5198/');
  await mobile.getByRole('button',{name:'View Dumbbell curl',exact:true}).waitFor();
  await measure(mobile,'probe-fresh-mobile-home');
  await mobile.getByRole('button',{name:'View Dumbbell curl',exact:true}).click();
  await mobile.locator('canvas').screenshot();
  await measure(mobile,'probe-fresh-mobile-detail');
  console.log(JSON.stringify(observations,null,2));
  await writeFile(`${directory}/layout-probe.json`,JSON.stringify(observations,null,2));
} finally {
  await browser?.close();
  await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));
}
