import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { playUntilCinematic } from './browser-driver.mjs';
const url = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
mkdirSync('artifacts', { recursive: true });
try {
  await page.goto(url);
  await page.locator('#begin').click();
  assert.equal(await page.locator('#line').textContent(), 'Sota. Iori. Stand aside.');
  await page.locator('#skip').click();
  await page.screenshot({ path: 'artifacts/chapter-gate.png' });
  const gate = await playUntilCinematic(page, true);
  assert.equal(gate.mode, 'remembrance');
  assert.equal(gate.stage, 'gate');
  assert.equal(gate.stats.kills, 2);
  assert.ok(gate.stats.parries >= 1);
  assert.ok(gate.stats.draws >= 1);
  await page.screenshot({ path: 'artifacts/chapter-remembrance.png' });
  await page.locator('#choose-mercy').click();
  let state = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(state.mode, 'intro');
  assert.equal(state.stage, 'warden');
  assert.equal(state.player.hp, 120);
  assert.equal(state.player.maxHp, 120);
  await page.locator('#skip').click();
  const phase = await playUntilCinematic(page, true);
  assert.equal(phase.mode, 'phase');
  await page.locator('#skip').click();
  const ending = await playUntilCinematic(page, true);
  assert.equal(ending.mode, 'ending');
  await page.locator('#skip').click();
  assert.equal(await page.evaluate(() => window.ashenVow.snapshot().mode), 'victory');
  assert.ok((await page.locator('#encounter-stats').textContent()).includes('STILLNESS CUTS'));
  await page.screenshot({ path: 'artifacts/chapter-victory.png' });
  await page.reload();
  assert.equal(await page.locator('#duel').textContent(), 'RESUME AT THE BELL');
  await page.locator('#duel').click();
  state = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(state.stage, 'warden');
  assert.equal(state.player.maxHp, 120);
  assert.equal(state.player.hp, 120);
  // Replay gate using a mobile viewport; verify the actual Stillness HUD button routes correctly.
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#begin').click();
  await page.locator('#skip').click();
  const mobileGate = await playUntilCinematic(page, true);
  assert.equal(mobileGate.mode, 'remembrance');
  await page.screenshot({ path: 'artifacts/chapter-remembrance-mobile.png' });
  await page.locator('#choose-resolve').click();
  await page.locator('#skip').click();
  state = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(state.player.resolve, 1);
  assert.equal(state.player.maxHp, 100);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  await page.locator('#resolve-button').click();
  await page.waitForTimeout(600);
  assert.equal(
    (await page.evaluate(() => window.ashenVow.snapshot())).stats.draws,
    state.stats.draws + 1,
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.deepEqual(errors, []);
  console.log(
    'Chapter passed: two sentries, earned Stillness Cut, both vows, boss victory, persistent checkpoint, mobile remembrance and ability button; no runtime errors.',
  );
} catch (e) {
  console.error(await page.evaluate(() => window.ashenVow?.snapshot()).catch(() => null));
  await page.screenshot({ path: 'artifacts/chapter-failure.png' });
  throw e;
} finally {
  await browser.close();
}
