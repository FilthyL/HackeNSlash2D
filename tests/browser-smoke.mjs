import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const url = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const executablePath =
  process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForTimeout(500);
await page.screenshot({ path: 'artifacts/title-desktop.png' });
await page.getByRole('button', { name: 'HOW TO PLAY' }).click();
assert.equal(await page.locator('#modal').isVisible(), true);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'DRAW YOUR BLADE' }).click();
await page.waitForTimeout(500);
assert.equal(await page.evaluate(() => window.ashenVow.snapshot().mode), 'intro');
await page.screenshot({ path: 'artifacts/cutscene-desktop.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
assert.equal(await page.evaluate(() => window.ashenVow.snapshot().mode), 'fight');
const before = await page.evaluate(() => window.ashenVow.snapshot());
await page.keyboard.down('w');
await page.waitForTimeout(350);
await page.keyboard.up('w');
const after = await page.evaluate(() => window.ashenVow.snapshot());
assert.ok(after.player.x < before.player.x && after.player.y < before.player.y);
await page.keyboard.press('j');
await page.waitForTimeout(50);
assert.equal(await page.evaluate(() => window.ashenVow.snapshot().player.action), 'attack');
await page.keyboard.press('Escape');
const paused = await page.evaluate(() => window.ashenVow.snapshot());
assert.equal(paused.paused, true);
await page.waitForTimeout(250);
assert.equal((await page.evaluate(() => window.ashenVow.snapshot())).time, paused.time);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Enable sound' }).click();
assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'), 'true');
await page.screenshot({ path: 'artifacts/fight-desktop.png' });
assert.deepEqual(errors, []);
console.log(
  'Desktop: title, controls, intro, skipping, movement, attack, pause/resume, audio passed; no runtime errors.',
);
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(url);
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: 'artifacts/title-mobile.png' });
await mobile.locator('#begin').click();
await mobile.locator('#skip').click();
await mobile.waitForTimeout(100);
assert.equal(await mobile.locator('#touch-controls').isVisible(), true);
await mobile.screenshot({ path: 'artifacts/fight-mobile.png' });
assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
console.log(
  'Mobile: responsive title, cutscene skip, touch controls and no horizontal overflow passed.',
);
await browser.close();
