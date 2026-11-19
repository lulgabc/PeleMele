import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_URL ?? 'http://localhost:5173';
const outDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const executablePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];

async function makePage(viewport, label) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[${label}] console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`[${label}] pageerror: ${error.message}`));
  return { page, context };
}

async function shot(page, name, options = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${outDir}${name}.jpg`, type: 'jpeg', quality: 88, ...options });
  console.log('shot', name);
}

const desktop = await makePage({ width: 1440, height: 900 }, 'desktop');
for (const view of ['today', 'week', 'month', 'together', 'settings']) {
  await desktop.page.goto(`${base}/#/${view}`, { waitUntil: 'networkidle' });
  await shot(desktop.page, `desktop-${view}`, { fullPage: view !== 'today' });
}
await desktop.page.goto(`${base}/#/today`, { waitUntil: 'networkidle' });
await desktop.page.getByRole('button', { name: '安排一件事' }).click();
await shot(desktop.page, 'desktop-event-form');
await desktop.context.close();

const mobile = await makePage({ width: 390, height: 844 }, 'mobile');
for (const view of ['today', 'week', 'month', 'together']) {
  await mobile.page.goto(`${base}/#/${view}`, { waitUntil: 'networkidle' });
  await shot(mobile.page, `mobile-${view}`);
}
await mobile.page.goto(`${base}/#/today`, { waitUntil: 'networkidle' });
await mobile.page.getByRole('button', { name: '安排一件事' }).click();
await shot(mobile.page, 'mobile-event-form');
await mobile.page.keyboard.press('Escape');
await mobile.page.goto(`${base}/#/settings`, { waitUntil: 'networkidle' });
await shot(mobile.page, 'mobile-settings');
await mobile.page.getByRole('button', { name: '青柠野餐' }).click();
await shot(mobile.page, 'mobile-settings-lime');
await mobile.page.getByRole('button', { name: '可可夜' }).click();
await mobile.page.goto(`${base}/#/today`, { waitUntil: 'networkidle' });
await shot(mobile.page, 'mobile-today-cocoa');
await mobile.context.close();

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('no console errors');
}
