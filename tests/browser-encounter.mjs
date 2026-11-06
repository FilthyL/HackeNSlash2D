import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';

const url = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

// Drive the exact public keyboard handlers. Telemetry is read-only; this test
// never imports the simulation, edits health, changes modes or advances time.
async function playUntilCinematic() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const held = new Set();
    const started = performance.now();
    let previousAction = '', previousKind = '', wave = null;
    let phaseOneBell = false;
    const commands = { cuts: 0, heavies: 0, parries: 0, dodges: 0 };
    function key(type, value) {
      window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
    }
    function move(x, y) {
      const wanted = new Set();
      // Invert main.ts's screen-to-ground transform and quantize to 8-way WASD.
      const sx = x - y, sy = x + y;
      const threshold = Math.max(Math.abs(sx), Math.abs(sy)) * 0.414;
      if (sx > threshold) wanted.add('d'); else if (sx < -threshold) wanted.add('a');
      if (sy > threshold) wanted.add('s'); else if (sy < -threshold) wanted.add('w');
      for (const value of held) if (!wanted.has(value)) { key('keyup', value); held.delete(value); }
      for (const value of wanted) if (!held.has(value)) { key('keydown', value); held.add(value); }
    }
    function tap(value) { key('keydown', value); key('keyup', value); }
    function tick() {
      const snapshot = window.ashenVow.snapshot();
      if (snapshot.mode !== 'fight') {
        move(0, 0); resolve({ ...snapshot, phaseOneBell, commands }); return;
      }
      if (performance.now() - started > 90000) {
        move(0, 0); reject(new Error(`Encounter policy timed out: ${JSON.stringify(snapshot)}`)); return;
      }
      if (snapshot.paused) {
        move(0, 0); reject(new Error('Unexpected encounter pause')); return;
      }
      const p = snapshot.player, b = snapshot.boss;
      const dx = b.x - p.x, dy = b.y - p.y, distance = Math.hypot(dx, dy);
      const free = ['idle', 'run'].includes(p.action);
      if (b.action === 'attack' && b.attackKind === 'bell' && (previousAction !== 'attack' || previousKind !== 'bell')) {
        wave = { x: b.x, y: b.y, start: snapshot.time - Math.max(0, 0.34 - b.actionTime) };
        if (b.phase === 1) phaseOneBell = true;
      }
      previousAction = b.action; previousKind = b.attackKind;
      if (wave && snapshot.time - wave.start > 0.82) wave = null;
      const waveDistance = wave ? Math.hypot(p.x - wave.x, p.y - wave.y) : Infinity;
      const waveRadius = wave ? (snapshot.time - wave.start) * 5.6 : -100;
      const imminentWave = wave && Math.abs(waveDistance - waveRadius) < 0.8;
      const imminentSteel = b.action === 'windup' && b.attackKind !== 'bell' && b.actionTime < 0.18;
      move(0, 0);
      if (imminentWave && p.action !== 'dodge') {
        move(dx, dy); tap(' '); commands.dodges++;
      } else if (imminentSteel && free) {
        tap('k'); commands.parries++;
      } else if (distance > 1.6) {
        move(dx, dy);
      } else if (free && !(b.action === 'windup' && b.actionTime < 0.6)) {
        if (b.action === 'stagger' && p.stamina > 35) { tap('e'); commands.heavies++; }
        else { tap('j'); commands.cuts++; }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
}

try {
  await page.goto(url);
  await page.locator('#begin').click();
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'intro');
  assert.equal(await page.locator('#line').textContent(), 'I came for the names.');
  await page.keyboard.press('Enter');
  const phase = await playUntilCinematic();
  assert.equal(phase.mode, 'phase', 'combat should reach its second-phase cinematic');
  assert.equal(phase.phaseOneBell, true, 'the first phase should showcase the bell');
  assert.equal(phase.boss.phase, 2);
  assert.ok(phase.boss.hp > 0 && phase.boss.hp <= phase.boss.maxHp / 2);
  await page.waitForFunction(() => document.getElementById('line').textContent === 'They are not buried beneath us.');
  await page.screenshot({ path: 'artifacts/phase-desktop.png' });
  await page.keyboard.press('Enter');
  const ending = await playUntilCinematic();
  assert.equal(ending.mode, 'ending', 'real keyboard combat should defeat the boss');
  assert.equal(ending.boss.hp, 0);
  assert.ok(ending.player.hp > 0);
  await page.waitForFunction(() => document.getElementById('line').textContent === 'Your sister rang the bell.');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'victory');
  assert.equal(await page.locator('#outcome-title').textContent(), 'An oath, unbroken.');
  assert.equal(await page.evaluate(() => localStorage.getItem('ashen-vow-chapter-1')), 'complete');
  await page.screenshot({ path: 'artifacts/victory-desktop.png' });
  console.log('Browser victory:', JSON.stringify({ time: ending.time, hp: ending.player.hp, phaseOneCommands: phase.commands, phaseTwoCommands: ending.commands }));

  await page.locator('#retry').click();
  let retry = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(retry.mode, 'fight');
  assert.equal(retry.player.hp, retry.player.maxHp);
  assert.equal(retry.boss.hp, retry.boss.maxHp);
  // With no input the same actual boss must deal lethal damage and show retry.
  await page.waitForFunction(() => window.ashenVow.snapshot().mode === 'defeat', undefined, { timeout: 90000 });
  assert.equal(await page.locator('#outcome-title').textContent(), 'Rise. Remember.');
  const defeat = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(defeat.player.hp, 0);
  await page.locator('#retry').click();
  retry = await page.evaluate(() => window.ashenVow.snapshot());
  assert.equal(retry.mode, 'fight');
  assert.equal(retry.player.hp, retry.player.maxHp);
  assert.equal(retry.boss.phase, 1);
  assert.deepEqual(errors, []);
  console.log(`Browser lifecycle passed: intro, first-phase bell, transformation, ending, victory/save, victory retry, idle defeat (${defeat.time.toFixed(2)}s), defeat retry; no runtime errors.`);
} catch (error) {
  console.error('Last browser state:', await page.evaluate(() => window.ashenVow?.snapshot()).catch(() => null));
  await page.screenshot({ path: 'artifacts/encounter-failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
