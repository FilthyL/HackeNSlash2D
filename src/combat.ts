/** Deterministic combat simulation. Positions and radii are in ground-plane units. */
export type BattleState = 'fight' | 'phase' | 'victory' | 'defeat';
export type AttackKind = 'sweep' | 'thrust' | 'bell';
export interface Input {
  x: number;
  y: number;
  attack: boolean;
  dodge: boolean;
  parry: boolean;
  heavy: boolean;
}
export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: number;
  action: string;
  actionTime: number;
  invulnerable: number;
  stamina: number;
  maxStamina: number;
  combo: number;
}
export interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: number;
  action: string;
  actionTime: number;
  phase: number;
  attackKind: AttackKind;
}
export interface Effect {
  kind: string;
  x: number;
  y: number;
  age: number;
  duration: number;
  angle?: number;
  radius?: number;
}
export interface Telegraph {
  kind: 'circle' | 'arc' | 'line' | 'ring';
  x: number;
  y: number;
  radius: number;
  angle: number;
  progress: number;
}
type PlayerMove = 'attack' | 'heavy' | 'parry' | 'dodge';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const BELL_RADIUS = 4.5;
const BELL_SPEED = 5.6;
const BELL_DURATION = BELL_RADIUS / BELL_SPEED;

export class Battle {
  player!: Player;
  boss!: Boss;
  state: BattleState = 'fight';
  time = 0;
  effects: Effect[] = [];
  telegraphs: Telegraph[] = [];
  events: string[] = [];
  private attackIndex = 0;
  private windupDuration = 1;
  private comboTime = 0;
  private playerStrikeAt = -1;
  private dodgeAngle = 0;
  private parryAge = 0;
  private phaseTriggered = false;
  private queuedMove: PlayerMove | null = null;
  private queuedUntil = 0;
  private previousMoves = { attack: false, heavy: false, parry: false, dodge: false };
  private waves: { x: number; y: number; age: number; hit: boolean }[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.player = {
      x: 1,
      y: 3,
      hp: 100,
      maxHp: 100,
      facing: -2,
      action: 'idle',
      actionTime: 0,
      invulnerable: 0,
      stamina: 100,
      maxStamina: 100,
      combo: 0,
    };
    this.boss = {
      x: -1,
      y: -1.5,
      hp: 720,
      maxHp: 720,
      facing: 1.15,
      action: 'idle',
      actionTime: 1.35,
      phase: 1,
      attackKind: 'sweep',
    };
    this.state = 'fight';
    this.time = 0;
    this.effects = [];
    this.telegraphs = [];
    this.events = [];
    this.attackIndex = 0;
    this.windupDuration = 1;
    this.comboTime = 0;
    this.playerStrikeAt = -1;
    this.dodgeAngle = 0;
    this.parryAge = 0;
    this.phaseTriggered = false;
    this.waves = [];
    this.queuedMove = null;
    this.queuedUntil = 0;
    this.previousMoves = { attack: false, heavy: false, parry: false, dodge: false };
  }

  resumePhase() {
    if (this.state !== 'phase') return;
    this.state = 'fight';
    this.boss.phase = 2;
    this.boss.action = 'idle';
    this.boss.actionTime = 1.2;
    this.player.action = 'idle';
    this.player.actionTime = 0;
    this.player.invulnerable = 0.7;
    this.player.stamina = this.player.maxStamina;
    this.playerStrikeAt = -1;
    this.queuedMove = null;
    this.previousMoves = { attack: false, heavy: false, parry: false, dodge: false };
  }

  update(delta: number, input: Input) {
    if (this.state !== 'fight' || !Number.isFinite(delta)) return;
    const dt = clamp(delta, 0, 0.05);
    if (dt === 0) return;
    this.time += dt;
    this.effects.forEach((e) => {
      e.age += dt;
    });
    this.effects = this.effects.filter((e) => e.age < e.duration);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.comboTime -= dt;
    if (this.comboTime <= 0) this.player.combo = 0;
    this.player.stamina = Math.min(
      100,
      this.player.stamina +
        dt * (this.player.action === 'idle' || this.player.action === 'run' ? 27 : 8),
    );
    this.updatePlayer(dt, input);
    if (this.state !== 'fight') return;
    this.updateBoss(dt);
    if (this.state !== 'fight') return;
    this.updateWaves(dt);
    this.separateActors();
  }

  private effect(
    kind: string,
    x: number,
    y: number,
    duration: number,
    angle?: number,
    radius?: number,
  ) {
    this.effects.push({ kind, x, y, age: 0, duration, angle, radius });
    if (this.effects.length > 80) this.effects.shift();
  }

  private updatePlayer(dt: number, input: Input) {
    const p = this.player;
    // The frontend emits one-frame pulses. Buffer a fresh press briefly so a
    // near-perfect combo/parry does not disappear during the last recovery frames.
    // Tracking edges also prevents held inputs from silently repeating actions.
    const priority: PlayerMove[] = ['dodge', 'parry', 'heavy', 'attack'];
    const pressed = priority.find((move) => input[move] && !this.previousMoves[move]);
    for (const move of priority) this.previousMoves[move] = input[move];
    if (pressed) {
      this.queuedMove = pressed;
      this.queuedUntil = this.time + 0.12;
    }
    if (this.time > this.queuedUntil) this.queuedMove = null;
    const oldTime = p.actionTime;
    p.actionTime = Math.max(0, p.actionTime - dt);
    if (p.action === 'parry') this.parryAge += dt;
    if (
      this.playerStrikeAt >= 0 &&
      oldTime > this.playerStrikeAt &&
      p.actionTime <= this.playerStrikeAt
    ) {
      this.strikeBoss(p.action === 'heavy');
      this.playerStrikeAt = -1;
    }
    if (this.state !== 'fight') {
      this.queuedMove = null;
      return;
    }
    if (p.actionTime <= 0) p.action = 'idle';

    // A dodge may cancel a normal slash, but not its heavier committed variant.
    if (
      this.queuedMove === 'dodge' &&
      p.stamina >= 23 &&
      !['dodge', 'heavy', 'hurt'].includes(p.action)
    ) {
      p.stamina -= 23;
      p.action = 'dodge';
      p.actionTime = 0.28;
      p.invulnerable = 0.31;
      this.dodgeAngle =
        Math.hypot(input.x, input.y) > 0.01 ? Math.atan2(input.y, input.x) : p.facing;
      p.facing = this.dodgeAngle;
      this.playerStrikeAt = -1;
      this.events.push('dodge');
      this.effect('dodge', p.x, p.y, 0.42, this.dodgeAngle);
      this.queuedMove = null;
    }
    if (p.action === 'dodge') {
      p.x += Math.cos(this.dodgeAngle) * 10 * dt;
      p.y += Math.sin(this.dodgeAngle) * 10 * dt;
    } else if (p.action === 'idle' || p.action === 'run') {
      if (this.queuedMove === 'parry' && p.stamina >= 12) {
        p.stamina -= 12;
        p.action = 'parry';
        p.actionTime = 0.42;
        this.parryAge = 0;
        p.facing = Math.atan2(this.boss.y - p.y, this.boss.x - p.x);
        this.effect('guard', p.x, p.y, 0.42, p.facing);
        this.queuedMove = null;
      } else if ((this.queuedMove === 'heavy' && p.stamina >= 30) || this.queuedMove === 'attack') {
        const heavy = this.queuedMove === 'heavy';
        p.action = heavy ? 'heavy' : 'attack';
        p.actionTime = heavy ? 0.68 : 0.31;
        this.playerStrikeAt = heavy ? 0.3 : 0.18;
        if (heavy) p.stamina -= 30;
        else {
          p.combo = (p.combo % 3) + 1;
          this.comboTime = 0.95;
        }
        if (distance(p, this.boss) < 3.1)
          p.facing = Math.atan2(this.boss.y - p.y, this.boss.x - p.x);
        this.events.push(heavy ? 'heavy' : 'slash');
        this.effect(heavy ? 'heavy' : 'slash', p.x, p.y, heavy ? 0.6 : 0.32, p.facing);
        this.queuedMove = null;
      } else {
        const magnitude = Math.hypot(input.x, input.y);
        if (magnitude > 0.01) {
          const divisor = Math.max(1, magnitude);
          p.x += (input.x / divisor) * 3.7 * dt;
          p.y += (input.y / divisor) * 3.7 * dt;
          p.facing = Math.atan2(input.y, input.x);
          p.action = 'run';
        }
      }
    }
    p.x = clamp(p.x, -4.8, 4.8);
    p.y = clamp(p.y, -4.8, 4.8);
  }

  private strikeBoss(heavy: boolean) {
    const p = this.player,
      b = this.boss;
    const angle = Math.atan2(b.y - p.y, b.x - p.x);
    if (distance(p, b) > (heavy ? 2.25 : 1.95) || Math.abs(angleDifference(angle, p.facing)) > 1.3)
      return;
    const damage = heavy ? 42 : p.combo === 3 ? 28 : 18;
    b.hp = Math.max(0, b.hp - damage);
    this.events.push('hit');
    this.effect('impact', b.x, b.y, 0.38, p.facing);
    if (b.hp <= 0) {
      this.state = 'victory';
      b.action = 'dead';
      b.actionTime = 0;
      this.telegraphs = [];
      this.waves = [];
      this.events.push('victory');
      return;
    }
    if (b.hp <= b.maxHp / 2 && !this.phaseTriggered) {
      this.phaseTriggered = true;
      this.state = 'phase';
      b.phase = 2;
      this.telegraphs = [];
      this.waves = [];
      this.events.push('phase');
      return;
    }
    if (heavy && b.action !== 'windup') {
      b.action = 'stagger';
      b.actionTime = 0.6;
    }
  }

  private updateBoss(dt: number) {
    const b = this.boss,
      p = this.player;
    b.actionTime -= dt;
    if (b.action === 'windup') {
      this.telegraphs = [
        {
          kind: b.attackKind === 'sweep' ? 'arc' : b.attackKind === 'thrust' ? 'line' : 'ring',
          x: b.x,
          y: b.y,
          radius: b.attackKind === 'bell' ? BELL_RADIUS : b.attackKind === 'thrust' ? 4.2 : 2.7,
          angle: b.facing,
          progress: clamp(1 - b.actionTime / this.windupDuration, 0, 1),
        },
      ];
      if (b.actionTime <= 0) this.bossStrike();
      return;
    }
    this.telegraphs = [];
    if (b.action === 'attack') {
      if (b.actionTime <= 0) {
        b.action = 'recover';
        b.actionTime = b.phase === 2 ? 0.7 : 1.0;
      }
      return;
    }
    if (b.action === 'recover' || b.action === 'stagger') {
      if (b.actionTime <= 0) {
        b.action = 'idle';
        b.actionTime = b.phase === 2 ? 0.22 : 0.45;
      }
      return;
    }
    b.facing = Math.atan2(p.y - b.y, p.x - b.x);
    const dist = distance(p, b);
    if (dist > 2.05) {
      b.action = 'approach';
      const speed = b.phase === 2 ? 1.65 : 1.2;
      b.x += Math.cos(b.facing) * speed * dt;
      b.y += Math.sin(b.facing) * speed * dt;
    } else b.action = 'idle';
    if (b.actionTime <= 0 && (dist < 2.7 || this.attackIndex % 3 !== 0)) {
      const sequence: AttackKind[] =
        b.phase === 2 ? ['sweep', 'thrust', 'bell', 'thrust'] : ['sweep', 'bell', 'thrust'];
      b.attackKind = sequence[this.attackIndex++ % sequence.length]!;
      this.windupDuration =
        (b.attackKind === 'bell' ? 1.25 : b.attackKind === 'thrust' ? 0.95 : 0.85) *
        (b.phase === 2 ? 0.82 : 1);
      b.action = 'windup';
      b.actionTime = this.windupDuration;
    }
    b.x = clamp(b.x, -4.5, 4.5);
    b.y = clamp(b.y, -4.5, 4.5);
  }

  private bossStrike() {
    const b = this.boss,
      p = this.player;
    b.action = 'attack';
    b.actionTime = 0.34;
    this.telegraphs = [];
    this.events.push('bossAttack');
    if (b.attackKind === 'bell') {
      this.waves.push({ x: b.x, y: b.y, age: 0, hit: false });
      this.effect('shockwave', b.x, b.y, BELL_DURATION, 0, BELL_RADIUS);
      return;
    }
    const dx = p.x - b.x,
      dy = p.y - b.y;
    let hits = false;
    if (b.attackKind === 'sweep') {
      hits =
        Math.hypot(dx, dy) < 2.85 && Math.abs(angleDifference(Math.atan2(dy, dx), b.facing)) < 1.5;
      this.effect('bossSlash', b.x, b.y, 0.42, b.facing, 2.7);
    } else {
      const along = dx * Math.cos(b.facing) + dy * Math.sin(b.facing);
      const across = Math.abs(-dx * Math.sin(b.facing) + dy * Math.cos(b.facing));
      hits = along > -0.3 && along < 4.4 && across < 0.65;
      this.effect('thrust', b.x, b.y, 0.4, b.facing, 4.2);
      b.x = clamp(b.x + Math.cos(b.facing) * 1.5, -4.5, 4.5);
      b.y = clamp(b.y + Math.sin(b.facing) * 1.5, -4.5, 4.5);
    }
    if (hits) this.hurtPlayer(b.attackKind === 'sweep' ? 18 : 24, true);
  }

  private updateWaves(dt: number) {
    for (const wave of this.waves) {
      const oldRadius = wave.age * BELL_SPEED;
      wave.age += dt;
      const radius = Math.min(BELL_RADIUS, wave.age * BELL_SPEED);
      const dist = distance(wave, this.player);
      if (!wave.hit && dist >= oldRadius - 0.3 && dist <= radius + 0.3) {
        wave.hit = true;
        this.hurtPlayer(20, false);
      }
    }
    this.waves = this.waves.filter((w) => w.age < BELL_DURATION);
  }

  private hurtPlayer(damage: number, canParry: boolean) {
    const p = this.player,
      b = this.boss;
    if (p.invulnerable > 0 || this.state !== 'fight') return;
    if (canParry && p.action === 'parry' && this.parryAge <= 0.25) {
      b.action = 'stagger';
      b.actionTime = 1.4;
      p.stamina = Math.min(100, p.stamina + 30);
      p.invulnerable = 0.25;
      this.events.push('parry');
      this.effect('parry', p.x, p.y, 0.65, p.facing);
      return;
    }
    const blocked = canParry && p.action === 'parry';
    p.hp = Math.max(0, p.hp - (blocked ? Math.round(damage * 0.35) : damage));
    p.invulnerable = 0.8;
    p.action = 'hurt';
    p.actionTime = 0.24;
    this.playerStrikeAt = -1;
    this.queuedMove = null;
    this.events.push('hurt');
    this.effect('hurt', p.x, p.y, 0.4);
    if (p.hp <= 0) {
      this.state = 'defeat';
      p.action = 'dead';
      this.telegraphs = [];
      this.events.push('defeat');
    }
  }

  private separateActors() {
    const p = this.player,
      b = this.boss;
    const d = distance(p, b);
    if (d < 0.68 && p.action !== 'dodge') {
      const angle = d < 0.001 ? p.facing + Math.PI : Math.atan2(p.y - b.y, p.x - b.x);
      p.x = clamp(b.x + Math.cos(angle) * 0.68, -4.8, 4.8);
      p.y = clamp(b.y + Math.sin(angle) * 0.68, -4.8, 4.8);
    }
  }
}
