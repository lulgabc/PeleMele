import { chromium } from 'playwright-core';

const executablePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const base = (process.env.BASE_URL ?? 'http://localhost:4183').replace(/\/+$/, '');
await page.goto(`${base}/#/today`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const info = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  const manifestResponse = await fetch(link.href);
  const manifest = await manifestResponse.json();
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
  return {
    manifestStatus: manifestResponse.status,
    appName: manifest.name,
    shortName: manifest.short_name,
    icons: manifest.icons?.length ?? 0,
    standalone: manifest.display,
    swScope: registration?.scope ?? null,
    controlled: Boolean(navigator.serviceWorker.controller),
  };
});
console.log('manifest/sw:', JSON.stringify(info));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await context.setOffline(true);
let offlineOk = false;
try {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const text = await page.locator('body').innerText();
  offlineOk = text.includes('pelemele') && text.includes('小满一家');
} catch (error) {
  console.log('offline reload failed:', error.message);
}
console.log('offline app renders:', offlineOk);
console.log('console errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
if (!offlineOk || errors.length) process.exitCode = 1;
