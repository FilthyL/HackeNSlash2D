import { playUntilCinematic } from './browser-driver.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';

const url = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const executablePath =
  process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

// Drive the exact public keyboard handlers. Telemetry is read-only; this test
// never imports the simulation, edits health, changes modes or advances time.

try {
  await page.goto(url);
  await page.locator('#duel').click();
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'intro');
  assert.equal(await page.locator('#line').textContent(), 'I came for the names.');
  await page.keyboard.press('Enter');
  const phase = await playUntilCinematic(page);
  assert.equal(phase.mode, 'phase', 'combat should reach its second-phase cinematic');
  assert.equal(phase.phaseOneBell, true, 'the first phase should showcase the bell');
  assert.equal(phase.boss.phase, 2);
  assert.ok(phase.boss.hp > 0 && phase.boss.hp <= phase.boss.maxHp / 2);
  await page.waitForFunction(
    () => document.getElementById('line').textContent === 'They are not buried beneath us.',
  );
  await page.screenshot({ path: 'artifacts/phase-desktop.png' });
  await page.keyboard.press('Enter');
  const ending = await playUntilCinematic(page);
  assert.equal(ending.mode, 'ending', 'real keyboard combat should defeat the boss');
  assert.equal(ending.boss.hp, 0);
  assert.ok(ending.player.hp > 0);
  await page.waitForFunction(
    () => document.getElementById('line').textContent === 'Your sister rang the bell.',
  );
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'victory');
  assert.equal(await page.locator('#outcome-title').textContent(), 'An oath, unbroken.');
  assert.equal(await page.evaluate(() => localStorage.getItem('ashen-vow-chapter-1')), 'complete');
  await page.screenshot({ path: 'artifacts/victory-desktop.png' });
  console.log(
    'Browser victory:',
    JSON.stringify({
      time: ending.time,
      hp: ending.player.hp,
      phaseOneCommands: phase.commands,
      phaseTwoCommands: ending.commands,
    }),
  );

  await page.locator('#retry').click();
  let retry = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(retry.mode, 'fight');
  assert.equal(retry.player.hp, retry.player.maxHp);
  assert.equal(retry.boss.hp, retry.boss.maxHp);
  // With no input the same actual boss must deal lethal damage and show retry.
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'defeat', undefined, {
    timeout: 90000,
  });
  assert.equal(await page.locator('#outcome-title').textContent(), 'Rise. Remember.');
  const defeat = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(defeat.player.hp, 0);
  await page.locator('#retry').click();
  retry = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(retry.mode, 'fight');
  assert.equal(retry.player.hp, retry.player.maxHp);
  assert.equal(retry.boss.phase, 1);
  assert.deepEqual(errors, []);
  console.log(
    `Browser lifecycle passed: intro, first-phase bell, transformation, ending, victory/save, victory retry, idle defeat (${defeat.time.toFixed(2)}s), defeat retry; no runtime errors.`,
  );
} catch (error) {
  console.error(
    'Last browser state:',
    await page.evaluate(() => window.ashenVow?.snapshot()).catch(() => null),
  );
  await page.screenshot({ path: 'artifacts/encounter-failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
