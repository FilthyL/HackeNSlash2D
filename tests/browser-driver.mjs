export async function playUntilCinematic(page, useSpecial = false) {
  return page.evaluate(
    (useSpecial) =>
      new Promise((resolve, reject) => {
        const held = new Set();
        const started = performance.now();
        let previousAction = '',
          previousKind = '',
          wave = null;
        let phaseOneBell = false;
        const commands = { cuts: 0, heavies: 0, parries: 0, dodges: 0 };
        function key(type, value) {
          window.dispatchEvent(
            new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }),
          );
        }
        function move(x, y) {
          const wanted = new Set();
          // Invert main.ts's screen-to-ground transform and quantize to 8-way WASD.
          const sx = x - y,
            sy = x + y;
          const threshold = Math.max(Math.abs(sx), Math.abs(sy)) * 0.414;
          if (sx > threshold) wanted.add('d');
          else if (sx < -threshold) wanted.add('a');
          if (sy > threshold) wanted.add('s');
          else if (sy < -threshold) wanted.add('w');
          for (const value of held)
            if (!wanted.has(value)) {
              key('keyup', value);
              held.delete(value);
            }
          for (const value of wanted)
            if (!held.has(value)) {
              key('keydown', value);
              held.add(value);
            }
        }
        function tap(value) {
          key('keydown', value);
          key('keyup', value);
        }
        function tick() {
          const snapshot = window.ashenVow.snapshot();
          if (snapshot.mode !== 'fight') {
            move(0, 0);
            resolve({ ...snapshot, phaseOneBell, commands });
            return;
          }
          if (performance.now() - started > 90000) {
            move(0, 0);
            reject(new Error(`Encounter policy timed out: ${JSON.stringify(snapshot)}`));
            return;
          }
          if (snapshot.paused) {
            move(0, 0);
            reject(new Error('Unexpected encounter pause'));
            return;
          }
          const p = snapshot.player,
            enemies =
              snapshot.stage === 'gate' ? snapshot.guards.filter((g) => g.hp > 0) : [snapshot.boss];
          const b = [...enemies].sort(
            (a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
          const dx = b.x - p.x,
            dy = b.y - p.y,
            distance = Math.hypot(dx, dy);
          const free = ['idle', 'run'].includes(p.action);
          if (
            b.action === 'attack' &&
            b.attackKind === 'bell' &&
            (previousAction !== 'attack' || previousKind !== 'bell')
          ) {
            wave = { x: b.x, y: b.y, start: snapshot.time - Math.max(0, 0.34 - b.actionTime) };
            if (b.phase === 1) phaseOneBell = true;
          }
          previousAction = b.action;
          previousKind = b.attackKind;
          if (wave && snapshot.time - wave.start > 0.82) wave = null;
          const waveDistance = wave ? Math.hypot(p.x - wave.x, p.y - wave.y) : Infinity;
          const waveRadius = wave ? (snapshot.time - wave.start) * 5.6 : -100;
          const imminentWave = wave && Math.abs(waveDistance - waveRadius) < 0.8;
          const imminentSteel = enemies.some(
            (e) =>
              e.action === 'windup' &&
              e.attackKind !== 'bell' &&
              e.actionTime < 0.18 &&
              Math.hypot(e.x - p.x, e.y - p.y) < 4.2,
          );
          move(0, 0);
          if (imminentWave && p.action !== 'dodge') {
            move(dx, dy);
            tap(' ');
            commands.dodges++;
          } else if (imminentSteel && free) {
            tap('k');
            commands.parries++;
          } else if (useSpecial && p.resolve > 0 && free && distance < 4.8) {
            tap('q');
          } else if (distance > 1.6) {
            move(dx, dy);
          } else if (
            free &&
            !(b.action === 'windup' && b.actionTime < 0.6) &&
            !(useSpecial && snapshot.stage === 'gate' && snapshot.stats.parries === 0)
          ) {
            if (b.action === 'stagger' && p.stamina > 35) {
              tap('e');
              commands.heavies++;
            } else {
              tap('j');
              commands.cuts++;
            }
          }
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
    useSpecial,
  );
}
