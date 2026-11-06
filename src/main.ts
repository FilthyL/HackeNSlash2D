import './style.css';
import { Battle, type Input } from './combat';
import { Renderer } from './renderer';
import { Soundscape } from './audio';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const battle = new Battle(),
  renderer = new Renderer($<HTMLCanvasElement>('world')),
  sound = new Soundscape();
type Mode = 'title' | 'intro' | 'fight' | 'phase' | 'ending' | 'victory' | 'defeat';
let mode: Mode = 'title',
  sceneTime = 0,
  last = 0,
  hitstop = 0,
  paused = false,
  messageTime = 0,
  lastBeat = -1;
const keys = new Set<string>(),
  pulse = { attack: false, dodge: false, parry: false, heavy: false };
const modal = $<HTMLDialogElement>('modal');
function show(id: string, visible: boolean) {
  $(id).classList.toggle('hidden', !visible);
}
function hud() {
  const p = battle.player,
    b = battle.boss;
  $('player-health').style.width = `${(p.hp / p.maxHp) * 100}%`;
  $('player-stamina').style.width = `${p.stamina}%`;
  $('player-health-text').textContent = `${p.hp} / ${p.maxHp}`;
  $('boss-health').style.width = `${(b.hp / b.maxHp) * 100}%`;
  $('boss-percent').textContent = `${Math.ceil((b.hp / b.maxHp) * 100)}%`;
  $('boss-phase').textContent = b.phase === 1 ? 'I · THE OATHBOUND' : 'II · THE UNBURIED';
}
function clearInput() {
  keys.clear();
  Object.keys(pulse).forEach((k) => (pulse[k as keyof typeof pulse] = false));
}
function setMode(next: Mode) {
  mode = next;
  sceneTime = 0;
  lastBeat = -1;
  const cinematic = ['intro', 'phase', 'ending'].includes(mode);
  $('app').classList.toggle('cinematic', cinematic);
  $('app').classList.toggle('playing', mode === 'fight');
  show('title-screen', mode === 'title');
  show('scene-label', mode === 'title');
  show('boss-hud', mode === 'fight');
  show('player-hud', mode === 'fight');
  show('touch-controls', mode === 'fight');
  show('cinema', cinematic);
  show('reveal', false);
  show('outcome', mode === 'victory' || mode === 'defeat');
  $('combat-message').textContent = '';
  messageTime = 0;
  clearInput();
  hud();
  if (mode === 'victory' || mode === 'defeat') {
    const win = mode === 'victory';
    $('outcome-label').textContent = win
      ? 'CHAPTER I · THE FIRST NAME RETURNS'
      : 'THE BELL STILL TOLLS';
    $('outcome-title').textContent = win ? 'An oath, unbroken.' : 'Rise. Remember.';
    $('outcome-copy').textContent = win
      ? 'Inside the broken bell: hundreds of stolen names. Your sister’s is the last. The final stroke is missing.'
      : 'He taught you how to hold a blade. Now learn when to let it pass. Watch the amber marks, parry the steel, and dodge through the bell’s wave.';
    if (win) {
      try {
        localStorage.setItem('ashen-vow-chapter-1', 'complete');
      } catch {}
    }
  }
}
function start(skipIntro = false) {
  battle.reset();
  paused = false;
  setMode(skipIntro ? 'fight' : 'intro');
  if (!skipIntro) {
    dialogue('REN TAKAMORI', 'I came for the names.');
    sound.play('bell');
  } else notify('WATCH THE GROUND. TRUST YOUR BLADE.', 4);
}
function dialogue(speaker: string, line: string) {
  $('speaker').textContent = speaker;
  $('line').textContent = line;
}
function notify(text: string, duration = 1.5) {
  $('combat-message').textContent = text;
  $('combat-message').style.opacity = '1';
  messageTime = duration;
}
function endScene() {
  if (mode === 'intro') {
    setMode('fight');
    notify('WATCH THE GROUND. TRUST YOUR BLADE.', 4);
  } else if (mode === 'phase') {
    battle.resumePhase();
    setMode('fight');
    notify('II · THE UNBURIED', 3);
  } else if (mode === 'ending') setMode('victory');
}
function cinematic() {
  if (mode === 'intro') {
    const beats = [
      ['REN TAKAMORI', 'I came for the names.'],
      ['LORD KURODA', 'Then you came too late.'],
      ['REN TAKAMORI', 'You taught me to count the living.'],
      ['LORD KURODA', 'And you still refuse to count the cost.'],
    ];
    const beat = Math.floor(sceneTime / 3.2);
    if (beat !== lastBeat) {
      lastBeat = beat;
      if (beat < 4) dialogue(...(beats[beat] as [string, string]));
      else if (beat === 4) {
        dialogue('', '');
        show('reveal', true);
        sound.play('phase');
        renderer.shake = renderer.reduced ? 0 : 8;
      }
    }
    if (sceneTime > 16.5) endScene();
  } else if (mode === 'phase') {
    if (lastBeat < 0) {
      lastBeat = 0;
      dialogue('LORD KURODA', 'They are not buried beneath us.');
      sound.play('phase');
      renderer.shake = 12;
    }
    if (sceneTime > 3.2 && lastBeat === 0) {
      lastBeat = 1;
      dialogue('LORD KURODA', 'They are holding me up.');
    }
    if (sceneTime > 6.5) endScene();
  } else if (mode === 'ending') {
    const beats = [
      ['LORD KURODA', 'Your sister rang the bell.'],
      ['REN TAKAMORI', 'She was here?'],
      ['LORD KURODA', 'She knew what it would cost.'],
      ['REN TAKAMORI', 'Then I will finish nothing for them.'],
    ];
    const beat = Math.floor(sceneTime / 3);
    if (beat !== lastBeat && beat < 4) {
      lastBeat = beat;
      dialogue(...(beats[beat] as [string, string]));
    }
    if (sceneTime > 12.5) endScene();
  }
}
function getInput(): Input {
  let sx =
      Number(keys.has('d') || keys.has('arrowright')) -
      Number(keys.has('a') || keys.has('arrowleft')),
    sy =
      Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  const input = { x: (sx + sy) * Math.SQRT1_2, y: (sy - sx) * Math.SQRT1_2, ...pulse };
  pulse.attack = pulse.dodge = pulse.parry = pulse.heavy = false;
  return input;
}
function frame(now: number) {
  const dt = Math.min((now - last) / 1000 || 0, 0.05);
  last = now;
  if (!paused) {
    sceneTime += dt;
    if (mode === 'fight') {
      if (hitstop > 0) hitstop -= dt;
      else battle.update(dt, getInput());
      for (const e of battle.events.splice(0)) {
        sound.play(e);
        if (e === 'hit') {
          renderer.shake = 5;
          hitstop = 0.035;
        }
        if (e === 'hurt') {
          renderer.shake = 10;
          notify('BREATHE. WATCH HIS BLADE.', 1.3);
        }
        if (e === 'parry') {
          renderer.shake = 12;
          renderer.flash = 0.22;
          hitstop = 0.08;
          notify('OATHBREAKER', 1.4);
        }
        if (e === 'phase') setMode('phase');
        if (e === 'victory') {
          setMode('ending');
          sound.play('victory');
        }
        if (e === 'defeat') setMode('defeat');
      }
      hud();
    } else if (['intro', 'phase', 'ending'].includes(mode)) cinematic();
    if (messageTime > 0) {
      messageTime -= dt;
      if (messageTime < 0.5)
        $('combat-message').style.opacity = String(Math.max(0, messageTime * 2));
    }
  }
  renderer.draw(battle, paused ? 0 : dt, mode, sceneTime);
  requestAnimationFrame(frame);
}
$('begin').addEventListener('click', () => start());
$('retry').addEventListener('click', () => start(true));
$('return-title').addEventListener('click', () => {
  battle.reset();
  setMode('title');
});
$('skip').addEventListener('click', endScene);
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
  if (key === 'escape') {
    if (!modal.open && mode === 'fight') {
      e.preventDefault();
      openModal('pause');
    }
    return;
  }
  if (modal.open) return;
  if (key === 'enter') {
    if (['intro', 'phase', 'ending'].includes(mode)) endScene();
    return;
  }
  keys.add(key);
  if (e.repeat || mode !== 'fight') return;
  if (key === 'j') pulse.attack = true;
  if (key === 'k') pulse.parry = true;
  if (key === ' ') pulse.dodge = true;
  if (key === 'e') pulse.heavy = true;
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  clearInput();
  if (mode === 'fight' && !modal.open) openModal('pause');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    if (mode === 'fight' && !modal.open) openModal('pause');
  }
});
$('world').addEventListener('pointerdown', (e) => {
  if (mode === 'fight' && !paused) {
    if (e.button === 0) pulse.attack = true;
    if (e.button === 2) pulse.parry = true;
  }
});
$('world').addEventListener('contextmenu', (e) => e.preventDefault());
$('sound-button').addEventListener('click', async () => {
  const enabled = await sound.toggle();
  $('sound-button').innerHTML = `<span>♫</span> SOUND ${enabled ? 'ON' : 'OFF'}`;
  $('sound-button').setAttribute('aria-pressed', String(enabled));
  $('sound-button').setAttribute('aria-label', enabled ? 'Disable sound' : 'Enable sound');
  if (enabled) sound.play('bell');
});
const controls = `<span class="eyebrow">A MOMENT BEFORE THE BLADE</span><h2>Learn his rhythm.</h2><dl><dt>W A S D / arrows</dt><dd>Move around the courtyard.</dd><dt>J / left click</dt><dd>Cut. Chain three cuts for a stronger finisher. Face your foe automatically at close range.</dd><dt>K / right click</dt><dd>Parry just before steel connects. A perfect parry staggers Kuroda and restores stamina.</dd><dt>Space</dt><dd>Dodge in your movement direction. Dodge through the expanding bell wave.</dd><dt>E</dt><dd>Heavy cut. Costs stamina and leaves you briefly committed.</dd><dt>Escape</dt><dd>Pause and catch your breath.</dd></dl><p class="modal-tip">Amber marks show where the next attack will land. Strike during his recovery. The bell wave cannot be parried. Touch controls appear on touch devices.</p>`;
const chronicle = `<span class="eyebrow">ASHEN VOW · THE CHRONICLE</span><h2>Some debts survive death.</h2><p>The Quiet Accord learned to preserve the names and last words of the dead inside bronze bells. Then its ministers learned to take those names without permission. Communities lost the memory of why they had resisted. Massacres became unfortunate weather. Grief remained, but nobody could say who was missing.</p><h3>Ren Takamori · The Uncounted</h3><p>A Japanese samurai taught by Lord Kuroda to count every soldier home, Ren held a mountain road while his commander promised refugees another way out. There was no safe route. Ren returned to a family that could no longer remember his sister Aki. Only her name, scratched into his sword guard, survived the bell. Seven years later, he returns to the shrine above that road to confront the man he obeyed—and the choice he made.</p><h3>Lord Kuroda · The Hollow Warden</h3><p>Kuroda sealed the road and helped fill the bell. Now he contains its stolen names inside his own armour. His vigil is a punishment he appointed for himself because it was easier than facing the survivors. The people holding him upright have not forgotten.</p><h3>Lady Eleanor Vale · The Knight Who Signed</h3><p>An English knight celebrated for ending a siege through negotiation, Eleanor signed a warrant sending villagers to an Accord relief house. It had no kitchen. Years later, a surviving child asked where her mother was buried. Eleanor now carries the original warrant sewn inside her surcoat, seeking evidence that will condemn herself alongside the officials who designed the system.</p><h3>Lin Yue · The Vermilion Exile</h3><p>A Chinese jian swordswoman raised in a family of printers, Lin corrected a provincial register that falsely described a village as abandoned. The Accord seized the printing house; her father surrendered his name to save her. She now distributes forbidden testimony inside ordinary broadsheets, learning that an accurate account cannot make its readers choose justice.</p><h3>Meera · The Keeper of the Last Crossing</h3><p>A warrior from a coastal community informed by Kerala’s martial traditions, Meera helped a stranded Accord vessel before discovering its cargo of stolen names. Her brother refused an order to burn them. The struggle sank their ferry. She follows the river upstream with one sealed vessel that speaks in his voice—and knows things he never knew.</p><p class="modal-tip">An original fantasy world informed by distinct cultural references. This prototype implements Ren’s first duel; the other protagonists are planned chapters. Full stories and encounter scripts are included in the project’s docs folder.</p>`;
function openModal(kind: 'controls' | 'story' | 'pause') {
  paused = true;
  clearInput();
  $('modal-content').innerHTML =
    kind === 'story'
      ? chronicle
      : kind === 'pause'
        ? `<span class="eyebrow">THE COURTYARD WAITS</span><h2>A breath between blows.</h2><p>The encounter is paused. Close this panel or press Escape to resume.</p><button class="primary" id="resume">RETURN TO THE DUEL <b>↗</b></button><h3>Remember</h3><p>J to cut · K to parry · Space to dodge · E for a heavy cut. Dodge through the bell wave; parry the sword.</p>`
        : controls;
  modal.showModal();
  document.getElementById('resume')?.addEventListener('click', () => modal.close());
}
$('story-button').addEventListener('click', () => openModal('story'));
$('controls-button').addEventListener('click', () => openModal('controls'));
$('pause-button').addEventListener('click', () => openModal('pause'));
$('close-modal').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  paused = false;
  clearInput();
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      modal.close();
  }
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
  const map: Record<string, string> = { up: 'w', down: 's', left: 'a', right: 'd' },
    key = map[button.dataset.dir!]!;
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(key);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(event, () => keys.delete(key));
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]'))
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pulse[button.dataset.action as keyof typeof pulse] = true;
  });
// Read-only telemetry supports smoke tests without adding cheats to the game.
Object.defineProperty(window, 'ashenVow', {
  value: Object.freeze({
    snapshot: () => ({
      mode,
      paused,
      player: { ...battle.player },
      boss: { ...battle.boss },
      state: battle.state,
      time: battle.time,
    }),
  }),
});
setMode('title');
requestAnimationFrame(frame);
