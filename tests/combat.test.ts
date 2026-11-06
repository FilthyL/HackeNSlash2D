import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, type Input } from '../src/combat.ts';

const idle: Input = { x: 0, y: 0, attack: false, heavy: false, dodge: false, parry: false };
function advance(b: Battle, seconds: number, input: Partial<Input> = {}) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60)
    b.update(1 / 60, { ...idle, ...input });
}
function harmlessBoss(b: Battle) {
  b.boss.action = 'recover';
  b.boss.actionTime = 99;
}
function combo(b: Battle, seconds: number) {
  for (let frame = 0; frame < seconds * 60; frame++)
    b.update(1 / 60, { ...idle, attack: frame % 21 === 0 });
}

test('movement normalizes diagonals and remains inside the arena', () => {
  const a = new Battle(),
    b = new Battle();
  harmlessBoss(a);
  harmlessBoss(b);
  const ax = a.player.x,
    ay = a.player.y;
  advance(a, 0.2, { x: 1 });
  advance(b, 0.2, { x: 1, y: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(a.player.x - ax, a.player.y - ay) - Math.hypot(b.player.x - ax, b.player.y - ay),
    ) < 0.001,
  );
  advance(a, 20, { x: 1, y: 1 });
  assert.equal(a.player.x, 4.8);
  assert.equal(a.player.y, 4.8);
});

test('slashes miss at distance and deal damage in range after their windup', () => {
  const b = new Battle();
  harmlessBoss(b);
  advance(b, 0.4, { attack: true });
  assert.equal(b.boss.hp, b.boss.maxHp);
  advance(b, 0.5);
  b.player.x = b.boss.x + 1.2;
  b.player.y = b.boss.y;
  b.update(1 / 60, { ...idle, attack: true });
  assert.equal(b.boss.hp, b.boss.maxHp);
  advance(b, 0.2);
  assert.ok(b.boss.hp < b.boss.maxHp);
  assert.ok(b.events.includes('hit'));
});

test('boss phase transition pauses combat, resumes once, then allows victory', () => {
  const b = new Battle();
  harmlessBoss(b);
  b.boss.hp = b.boss.maxHp / 2 + 5;
  b.player.x = b.boss.x + 1;
  b.player.y = b.boss.y;
  advance(b, 0.3, { attack: true });
  assert.equal(b.state, 'phase');
  const hp = b.boss.hp,
    t = b.time;
  advance(b, 3, { attack: true });
  assert.equal(b.boss.hp, hp);
  assert.equal(b.time, t);
  b.resumePhase();
  assert.equal(b.state, 'fight');
  assert.equal(b.boss.phase, 2);
  harmlessBoss(b);
  combo(b, 10);
  assert.equal(b.state, 'victory');
  assert.equal(b.boss.hp, 0);
  assert.equal(b.events.filter((e) => e === 'phase').length, 1);
  assert.equal(b.events.filter((e) => e === 'victory').length, 1);
});

test('perfect parry prevents damage and staggers a telegraphed sweep', () => {
  const b = new Battle();
  b.player.x = b.boss.x + 1.5;
  b.player.y = b.boss.y;
  b.boss.facing = 0;
  b.boss.action = 'windup';
  b.boss.attackKind = 'sweep';
  b.boss.actionTime = 0.12;
  b.update(1 / 60, { ...idle, parry: true });
  advance(b, 0.15);
  assert.equal(b.player.hp, 100);
  assert.equal(b.boss.action, 'stagger');
  assert.ok(b.events.includes('parry'));
});

test('unblocked sweep causes damage; invulnerability prevents immediate repeated damage', () => {
  const b = new Battle();
  b.player.x = b.boss.x + 1.5;
  b.player.y = b.boss.y;
  b.boss.facing = 0;
  b.boss.action = 'windup';
  b.boss.attackKind = 'sweep';
  b.boss.actionTime = 0.01;
  advance(b, 0.03);
  assert.equal(b.player.hp, 82);
  b.boss.action = 'windup';
  b.boss.actionTime = 0.01;
  advance(b, 0.03);
  assert.equal(b.player.hp, 82);
});

test('dodge grants invulnerability and consumes stamina; reset clears encounter outcomes', () => {
  const b = new Battle();
  harmlessBoss(b);
  b.update(1 / 60, { ...idle, dodge: true, x: 1 });
  assert.equal(b.player.action, 'dodge');
  assert.ok(b.player.invulnerable > 0);
  assert.ok(b.player.stamina < 100);
  b.state = 'defeat';
  b.player.hp = 0;
  b.reset();
  assert.equal(b.state, 'fight');
  assert.equal(b.player.hp, 100);
  assert.equal(b.events.length, 0);
});

test('thrust corridor misses a sidestepped player and hits one directly ahead', () => {
  for (const sideways of [0, 1.1]) {
    const b = new Battle();
    b.player.x = b.boss.x + 3;
    b.player.y = b.boss.y + sideways;
    b.boss.facing = 0;
    b.boss.action = 'windup';
    b.boss.attackKind = 'thrust';
    b.boss.actionTime = 0.01;
    advance(b, 0.03);
    assert.equal(b.player.hp, sideways === 0 ? 76 : 100);
  }
});

test('bell wave expands across the ground and a timed dodge avoids its damage', () => {
  const waiting = new Battle(),
    dodging = new Battle();
  for (const b of [waiting, dodging]) {
    b.player.x = b.boss.x + 2;
    b.player.y = b.boss.y;
    b.boss.action = 'windup';
    b.boss.attackKind = 'bell';
    b.boss.actionTime = 0.01;
    advance(b, 0.2);
    assert.equal(b.player.hp, 100);
  }
  advance(waiting, 0.35);
  dodging.update(1 / 60, { ...idle, dodge: true, x: -1 });
  advance(dodging, 0.35);
  assert.equal(waiting.player.hp, 80);
  assert.equal(dodging.player.hp, 100);
});

test('lethal boss damage ends combat exactly once', () => {
  const b = new Battle();
  b.player.hp = 10;
  b.player.x = b.boss.x + 1.5;
  b.player.y = b.boss.y;
  b.boss.facing = 0;
  b.boss.action = 'windup';
  b.boss.attackKind = 'sweep';
  b.boss.actionTime = 0.01;
  advance(b, 2);
  assert.equal(b.state, 'defeat');
  assert.equal(b.player.hp, 0);
  assert.equal(b.events.filter((e) => e === 'defeat').length, 1);
});

test('bell wave does not damage beyond its telegraph plus player hit radius', () => {
  const b = new Battle();
  b.boss.x = -1;
  b.boss.y = 0;
  b.player.x = 3.9;
  b.player.y = 0;
  b.boss.action = 'windup';
  b.boss.attackKind = 'bell';
  b.boss.actionTime = 0.01;
  advance(b, 0.95);
  assert.equal(b.player.hp, 100);
});

test('complete encounter is beatable through movement, strikes, parries and dodges', () => {
  const b = new Battle();
  let phases = 0,
    parries = 0,
    phaseOneBell = false;
  for (let frame = 0; frame < 18000 && !['victory', 'defeat'].includes(b.state); frame++) {
    if (b.state === 'phase') {
      phases++;
      b.resumePhase();
    }
    const p = b.player,
      boss = b.boss;
    const dx = boss.x - p.x,
      dy = boss.y - p.y,
      d = Math.hypot(dx, dy);
    const input = { ...idle };
    const free = ['idle', 'run'].includes(p.action);
    const imminentSteel =
      boss.action === 'windup' && boss.attackKind !== 'bell' && boss.actionTime < 0.18;
    const wave = b.effects.find(
      (e) =>
        e.kind === 'shockwave' && Math.abs(Math.hypot(p.x - e.x, p.y - e.y) - e.age * 5.6) < 0.8,
    );
    if (wave && p.action !== 'dodge') {
      input.dodge = true;
      input.x = dx / d;
      input.y = dy / d;
    } else if (imminentSteel && free) input.parry = true;
    else if (d > 1.6) {
      input.x = dx / d;
      input.y = dy / d;
    } else if (free && !(boss.action === 'windup' && boss.actionTime < 0.6)) {
      if (boss.action === 'stagger' && p.stamina > 35) input.heavy = true;
      else input.attack = true;
    }
    b.update(1 / 60, input);
    for (const event of b.events.splice(0)) {
      if (event === 'parry') parries++;
      if (event === 'bossAttack' && b.boss.phase === 1 && b.boss.attackKind === 'bell')
        phaseOneBell = true;
    }
  }
  assert.equal(b.state, 'victory');
  assert.equal(phases, 1);
  assert.ok(parries > 0);
  assert.ok(phaseOneBell, 'the first phase showcases its bell mechanic before transforming');
  assert.ok(b.player.hp > 0);
});

test('a fresh attack pulse during final recovery is buffered into the next combo cut', () => {
  const b = new Battle();
  harmlessBoss(b);
  b.player.x = b.boss.x + 1.3;
  b.player.y = b.boss.y;
  b.update(1 / 60, { ...idle, attack: true });
  advance(b, 0.23);
  b.update(1 / 60, { ...idle, attack: true });
  advance(b, 0.3);
  assert.equal(b.events.filter((e) => e === 'slash').length, 2);
  assert.equal(b.events.filter((e) => e === 'hit').length, 2);
});

test('held action inputs do not repeat after an animation finishes', () => {
  for (const move of ['attack', 'heavy', 'dodge'] as const) {
    const b = new Battle();
    harmlessBoss(b);
    advance(b, 2, { [move]: true });
    assert.equal(b.events.filter((e) => e === (move === 'attack' ? 'slash' : move)).length, 1);
  }
  const b = new Battle();
  harmlessBoss(b);
  advance(b, 2, { parry: true });
  assert.equal(b.player.action, 'idle');
});

test('parry, heavy and dodge edge pulses survive the final recovery frames', () => {
  for (const move of ['parry', 'heavy', 'dodge'] as const) {
    const b = new Battle();
    harmlessBoss(b);
    // Heavy commits its recovery so dodge cannot cancel it immediately.
    b.player.action = 'heavy';
    b.player.actionTime = 0.09;
    b.update(1 / 60, { ...idle, [move]: true });
    assert.equal(b.player.action, 'heavy');
    advance(b, 0.09);
    assert.equal(b.player.action, move);
  }
});
