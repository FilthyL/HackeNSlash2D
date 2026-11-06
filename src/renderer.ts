import type { Battle, Player, Boss } from './combat';
type Point = { x: number; y: number };
const TAU = Math.PI * 2;
const random = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export class Renderer {
  ctx: CanvasRenderingContext2D;
  width = 1440;
  height = 900;
  time = 0;
  camera = 0;
  zoom = 1;
  shake = 0;
  flash = 0;
  phase = 1;
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private scenery = document.createElement('canvas');
  private backdrop = document.createElement('canvas');
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.scenery.width = 1440;
    this.scenery.height = 1000;
    this.backdrop.width = 1440;
    this.backdrop.height = 900;
    this.makeScenery();
    this.makeBackdrop();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    this.width = r.width;
    this.height = r.height;
  }
  project(x: number, y: number, z = 0): Point {
    return { x: 720 + (x - y) * 54, y: 490 + (x + y) * 27 - z };
  }
  path(points: Point[], fill: string, stroke?: string, ctx = this.ctx) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  line(a: Point, b: Point, color: string, width = 1, ctx = this.ctx) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ellipse(x: number, y: number, rx: number, ry: number, color: string, ctx = this.ctx) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }
  tile(x: number, y: number, size: number, fill: string, ctx = this.ctx) {
    this.path(
      [
        this.project(x, y),
        this.project(x + size, y),
        this.project(x + size, y + size),
        this.project(x, y + size),
      ],
      fill,
      undefined,
      ctx,
    );
  }
  makeBackdrop() {
    const c = this.backdrop.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, '#8e8c76');
    g.addColorStop(0.45, '#59695b');
    g.addColorStop(1, '#172924');
    c.fillStyle = g;
    c.fillRect(0, 0, 1440, 900);
    this.ellipse(1050, 180, 100, 100, '#c1ae82', c);
    this.ellipse(1050, 180, 111, 111, '#d0b18b0b', c);
    for (let layer = 0; layer < 3; layer++) {
      c.beginPath();
      c.moveTo(-100, 650);
      for (let x = -100; x < 1600; x += 65)
        c.lineTo(x, 240 + layer * 95 + random(x + layer * 29) * 120);
      c.lineTo(1600, 950);
      c.lineTo(-100, 950);
      c.fillStyle = ['#697365', '#485d51', '#344c40'][layer];
      c.fill();
    }
    for (let i = 0; i < 80; i++) {
      const x = random(i + 45) * 1500,
        y = 150 + random(i + 12) * 380;
      const h = 130 + random(i + 3) * 260;
      this.line({ x, y: y + h }, { x: x + 12, y }, '#263f3477', 3 + random(i) * 8, c);
      for (let j = 0; j < 4; j++)
        this.line(
          { x: x + 10, y: y + j * 30 },
          { x: x + random(i + j) * 70 - 35, y: y + j * 30 - 40 },
          '#324b3d88',
          2,
          c,
        );
    }
    const fog = c.createLinearGradient(0, 200, 0, 700);
    fog.addColorStop(0, '#9b9d7b00');
    fog.addColorStop(0.6, '#b0b09033');
    fog.addColorStop(1, '#2e483c00');
    c.fillStyle = fog;
    c.fillRect(0, 0, 1440, 900);
  }
  makeScenery() {
    const c = this.scenery.getContext('2d')!;
    const p = (x: number, y: number, z = 0) => this.project(x, y, z);
    // Uneven, suspended stone foundation. Every mark is deterministic and drawn once.
    this.path(
      [
        p(-5.6, 5.6),
        p(5.6, 5.6),
        p(5.6, -5.6),
        p(5.6, -5.6, -60),
        p(5.6, 5.6, -80),
        p(-5.6, 5.6, -60),
      ],
      '#202b27',
      undefined,
      c,
    );
    this.path(
      [p(-5.6, 5.6), p(5.6, 5.6), p(5.6, 5.6, -64), p(-5.6, 5.6, -42)],
      '#354138',
      undefined,
      c,
    );
    this.path(
      [p(5.6, 5.6), p(5.6, -5.6), p(5.6, -5.6, -45), p(5.6, 5.6, -64)],
      '#24392e',
      undefined,
      c,
    );
    for (let i = 0; i < 22; i++) {
      const x = -5.5 + i * 0.5;
      this.line(p(x, 5.6), p(x, 5.6, -38 - random(i) * 20), '#15271e88', 2, c);
    }
    this.path(
      [p(-5.65, -5.65), p(5.65, -5.65), p(5.65, 5.65), p(-5.65, 5.65)],
      '#737969',
      undefined,
      c,
    );
    for (let x = -5.5; x < 5.5; x += 0.5)
      for (let y = -5.5; y < 5.5; y += 0.5) {
        const r = random(x * 100 + y * 7);
        const colors = ['#66705e', '#707664', '#79806b', '#737a66', '#626e5b'];
        this.tile(x + 0.018, y + 0.018, 0.46, colors[Math.floor(r * 5)], c);
        if (r > 0.78) {
          const a = p(x + 0.08, y + 0.03),
            b = p(x + 0.26, y + 0.18),
            d = p(x + 0.4, y + 0.4);
          this.line(a, b, '#394c3b77', 0.8, c);
          this.line(b, d, '#394c3b77', 0.8, c);
        }
      }
    // The inset ritual court and worn circular bell inscription.
    for (let i = 0; i < 4; i++) {
      const s = 4.9 - i * 0.13;
      this.path(
        [p(-s, -s), p(s, -s), p(s, s), p(-s, s)],
        'transparent',
        i % 2 ? '#8d907244' : '#394e3d88',
        c,
      );
    }
    const center = p(-0.3, -0.5);
    c.save();
    c.translate(center.x, center.y);
    c.scale(1, 0.5);
    c.strokeStyle = '#c5ba8438';
    c.lineWidth = 2;
    for (const radius of [150, 159, 169]) {
      c.beginPath();
      c.arc(0, 0, radius, 0, TAU);
      c.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      c.save();
      c.rotate(a);
      c.fillStyle = '#c5ba8444';
      c.fillRect(153, -2, 9, 3);
      c.restore();
    }
    c.restore();
    // Broad stone steps at the near corner.
    for (let s = 5; s >= 0; s--) {
      const a = p(2.1, 5.6 + s * 0.22, -s * 5),
        b = p(4, 5.6 + s * 0.22, -s * 5);
      this.path([a, b, { x: b.x, y: b.y + 7 }, { x: a.x, y: a.y + 7 }], '#586151', undefined, c);
      this.line(a, b, '#8b8d6b', 2, c);
    }
    // Puddles, moss and fallen maple leaves.
    for (let i = 0; i < 380; i++) {
      const x = random(i * 8 + 2) * 10.7 - 5.35,
        y = random(i * 6 + 7) * 10.7 - 5.35,
        q = p(x, y);
      if (i < 35) this.ellipse(q.x, q.y, 8 + random(i) * 20, 2 + random(i + 2) * 6, '#9aab9530', c);
      else if (i < 140)
        this.ellipse(q.x, q.y, 2 + random(i) * 12, 1 + random(i + 2) * 3, '#374d3477', c);
      else {
        c.save();
        c.translate(q.x, q.y);
        c.rotate(random(i) * TAU);
        this.path(
          [
            { x: -3, y: 0 },
            { x: -1, y: -2 },
            { x: 1, y: -5 },
            { x: 2, y: -1 },
            { x: 5, y: 0 },
            { x: 1, y: 2 },
            { x: 0, y: 4 },
          ],
          ['#a55e32', '#a44a2e', '#b88343', '#753d29'][i % 4],
          undefined,
          c,
        );
        c.restore();
      }
    }
    // Back wall, lanterns, torii and the cracked bronze mourning bell.
    for (let i = -5; i <= 5; i += 1) {
      const a = p(i, -5.5),
        b = p(i + 1, -5.5);
      this.path([a, b, { x: b.x, y: b.y - 23 }, { x: a.x, y: a.y - 23 }], '#56604f', '#374936', c);
      this.line({ x: a.x - 3, y: a.y - 24 }, { x: b.x + 3, y: b.y - 24 }, '#8a8b6a', 5, c);
    }
    this.torii(c);
    this.bell(c);
    this.lantern(-4.7, -3.5, c);
    this.lantern(3.8, -4.7, c);
    this.lantern(-4.6, 3.3, c);
    this.lantern(4.5, 2.5, c);
    // Paper prayers along the rear rope.
    const a = p(-5, -3.7, 85),
      b = p(2.4, -5.3, 85);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 24, b.x, b.y);
    c.strokeStyle = '#b1a077';
    c.lineWidth = 2;
    c.stroke();
    for (let i = 1; i < 9; i++) {
      const t = i / 9,
        x = a.x + (b.x - a.x) * t,
        y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 12;
      this.path(
        [
          { x, y },
          { x: x + 6, y: y + 2 },
          { x: x + 3, y: y + 15 },
          { x: x + 8, y: y + 18 },
          { x: x + 2, y: y + 25 },
          { x: x - 3, y: y + 14 },
        ],
        '#c4bea0',
        undefined,
        c,
      );
    }
    this.tree(140, 510, 1.2, c);
    this.tree(1250, 385, 0.95, c);
  }
  torii(c: CanvasRenderingContext2D) {
    const q = this.project(-3.8, -3.8);
    const x = q.x,
      y = q.y;
    this.ellipse(x, y + 13, 195, 20, '#182c2855', c);
    for (const side of [-1, 1]) {
      const px = x + side * 126;
      this.path(
        [
          { x: px - 12, y },
          { x: px + 13, y: y + 2 },
          { x: px + 9, y: y - 197 },
          { x: px - 6, y: y - 197 },
        ],
        '#783e2d',
        '#3d382b',
        c,
      );
      this.line({ x: px - 4, y: y - 190 }, { x: px - 4, y: y - 12 }, '#b05b3b', 3, c);
      this.path(
        [
          { x: px - 18, y: y + 2 },
          { x: px + 18, y: y + 2 },
          { x: px + 19, y: y - 14 },
          { x: px - 17, y: y - 14 },
        ],
        '#374137',
        undefined,
        c,
      );
    }
    this.path(
      [
        { x: x - 177, y: y - 202 },
        { x: x - 175, y: y - 218 },
        { x: x - 100, y: y - 207 },
        { x: x + 100, y: y - 207 },
        { x: x + 175, y: y - 218 },
        { x: x + 177, y: y - 202 },
        { x: x + 120, y: y - 190 },
        { x: x - 120, y: y - 190 },
      ],
      '#333f32',
      undefined,
      c,
    );
    this.path(
      [
        { x: x - 164, y: y - 197 },
        { x: x + 164, y: y - 197 },
        { x: x + 157, y: y - 184 },
        { x: x - 157, y: y - 184 },
      ],
      '#a34d32',
      undefined,
      c,
    );
    this.path(
      [
        { x: x - 146, y: y - 158 },
        { x: x + 146, y: y - 158 },
        { x: x + 146, y: y - 147 },
        { x: x - 146, y: y - 147 },
      ],
      '#9b5033',
      '#503a2b',
      c,
    );
    c.fillStyle = '#6e4933';
    c.fillRect(x - 9, y - 193, 18, 50);
    c.fillStyle = '#d7b97b';
    c.font = '13px Georgia';
    c.fillText('哀', x - 7, y - 168);
  }
  bell(c: CanvasRenderingContext2D) {
    const q = this.project(-3.8, -3.8),
      x = q.x,
      y = q.y - 25;
    this.line({ x, y: y - 130 }, { x, y: y - 85 }, '#b7a477', 5, c);
    this.path(
      [
        { x: x - 27, y: y - 84 },
        { x: x + 27, y: y - 84 },
        { x: x + 38, y: y - 18 },
        { x: x + 48, y: y - 10 },
        { x: x + 45, y },
        { x: x - 45, y },
        { x: x - 48, y: y - 10 },
        { x: x - 38, y: y - 18 },
      ],
      '#777450',
      '#303c2e',
      c,
    );
    this.ellipse(x, y - 84, 27, 8, '#9a9160', c);
    this.ellipse(x, y - 4, 44, 9, '#a19765', c);
    this.ellipse(x, y - 1, 35, 5, '#39432e', c);
    for (let i = 0; i < 4; i++) {
      this.line(
        { x: x - 29 - i * 2, y: y - 65 + i * 13 },
        { x: x + 29 + i * 2, y: y - 65 + i * 13 },
        '#ae9b6666',
        2,
        c,
      );
    }
    this.line({ x: x + 9, y: y - 83 }, { x: x - 5, y: y - 48 }, '#27382d', 3, c);
    this.line({ x: x - 5, y: y - 48 }, { x: x + 6, y: y - 31 }, '#27382d', 3, c);
    this.line({ x: x + 6, y: y - 31 }, { x: x - 7, y: y + 2 }, '#27382d', 3, c);
  }
  lantern(x: number, y: number, c: CanvasRenderingContext2D) {
    const q = this.project(x, y);
    this.ellipse(q.x, q.y, 25, 10, '#1b302633', c);
    this.path(
      [
        { x: q.x - 17, y: q.y },
        { x: q.x + 17, y: q.y },
        { x: q.x + 12, y: q.y - 10 },
        { x: q.x - 12, y: q.y - 10 },
      ],
      '#8a8a68',
      undefined,
      c,
    );
    c.fillStyle = '#606b50';
    c.fillRect(q.x - 6, q.y - 42, 12, 34);
    this.path(
      [
        { x: q.x - 15, y: q.y - 40 },
        { x: q.x + 15, y: q.y - 40 },
        { x: q.x + 13, y: q.y - 67 },
        { x: q.x - 13, y: q.y - 67 },
      ],
      '#404e39',
      undefined,
      c,
    );
    c.fillStyle = '#e1b768';
    c.fillRect(q.x - 8, q.y - 61, 16, 16);
    this.line({ x: q.x, y: q.y - 64 }, { x: q.x, y: q.y - 43 }, '#57553c', 3, c);
    this.path(
      [
        { x: q.x - 25, y: q.y - 65 },
        { x: q.x, y: q.y - 83 },
        { x: q.x + 25, y: q.y - 65 },
        { x: q.x + 17, y: q.y - 60 },
        { x: q.x - 17, y: q.y - 60 },
      ],
      '#838368',
      '#424e38',
      c,
    );
    this.ellipse(q.x, q.y - 50, 34, 25, '#f5b65a0a', c);
  }
  tree(x: number, y: number, s: number, c: CanvasRenderingContext2D) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    const branches = [
      [
        [0, 0],
        [17, -95],
        [1, -180],
        [28, -280],
      ],
      [
        [13, -100],
        [-44, -164],
        [-94, -185],
      ],
      [
        [-1, -175],
        [-42, -225],
        [-97, -245],
      ],
      [
        [11, -165],
        [80, -208],
        [140, -225],
      ],
      [
        [16, -233],
        [77, -282],
        [121, -289],
      ],
      [
        [19, -260],
        [-13, -310],
        [-39, -325],
      ],
    ];
    for (let i = 0; i < branches.length; i++) {
      const a = branches[i];
      c.beginPath();
      a.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.strokeStyle = '#242f27';
      c.lineWidth = i ? 8 : 17;
      c.stroke();
      c.strokeStyle = '#4b4934';
      c.lineWidth = i ? 2 : 4;
      c.stroke();
    }
    for (let i = 0; i < 160; i++) {
      const px = (random(i + 91) - 0.5) * 300 + 20,
        py = -190 - random(i + 81) * 160;
      const r = 8 + random(i + 11) * 24;
      const color = ['#683c29', '#84412d', '#9b4c30', '#a85431', '#b66539', '#a9502e'][i % 6];
      this.path(
        [
          { x: px - r, y: py },
          { x: px - r * 0.5, y: py - r * 0.4 },
          { x: px - r * 0.2, y: py - r },
          { x: px + r * 0.3, y: py - r * 0.6 },
          { x: px + r, y: py - r * 0.3 },
          { x: px + r * 0.7, y: py + r * 0.3 },
          { x: px, y: py + r * 0.5 },
        ],
        color,
        undefined,
        c,
      );
    }
    c.restore();
  }
  draw(b: Battle, dt: number, mode: string, cinemaTime = 0) {
    this.time += dt;
    this.phase = b.boss.phase;
    const c = this.ctx,
      dpr = this.canvas.width / this.width;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = '#1c2c24';
    c.fillRect(0, 0, this.width, this.height);
    if (this.width < 700 && mode !== 'title') {
      const backgroundScale = Math.max(this.width / 1440, this.height / 900);
      c.drawImage(
        this.backdrop,
        (this.width - 1440 * backgroundScale) / 2,
        (this.height - 900 * backgroundScale) / 2,
        1440 * backgroundScale,
        900 * backgroundScale,
      );
    }
    const scale =
      this.width < 700 && mode !== 'title'
        ? Math.min(this.width / 1220, this.height / 900)
        : Math.max(this.width / 1440, this.height / 1000);
    const logicalWidth = this.width / scale;
    const offsetX = (this.width - 1440 * scale) / 2;
    const offsetY = (this.height - 900 * scale) / 2;
    c.save();
    c.translate(offsetX, offsetY);
    c.scale(scale, scale);
    if (this.width >= 700 || mode === 'title') c.drawImage(this.backdrop, 0, 0);
    const target = mode === 'title' ? 125 : 0;
    this.camera += (target - this.camera) * Math.min(1, dt * 2);
    const zTarget =
      mode === 'intro' ? (cinemaTime > 12.8 ? 1.22 : 1.08) : mode === 'phase' ? 1.18 : 1;
    this.zoom += (zTarget - this.zoom) * Math.min(1, dt * 2);
    c.save();
    c.translate(720 + this.camera, 470);
    c.scale(this.zoom, this.zoom);
    c.translate(-720, -470);
    if (!this.reduced && this.shake > 0) {
      c.translate(
        (random(this.time) * 2 - 1) * this.shake,
        (random(this.time + 4) * 2 - 1) * this.shake,
      );
    }
    this.shake = Math.max(0, this.shake - dt * 35);
    c.drawImage(this.scenery, 0, 0);
    for (const t of b.telegraphs) this.telegraph(t);
    const actors = [
      { actor: b.player, boss: false },
      { actor: b.boss, boss: true },
    ].sort((a, z) => a.actor.x + a.actor.y - (z.actor.x + z.actor.y));
    for (const a of actors) this.samurai(a.actor, a.boss, mode, cinemaTime);
    for (const e of b.effects) this.effect(e);
    if (mode === 'phase') {
      const q = this.project(b.boss.x, b.boss.y);
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * TAU + this.time * 0.2,
          r = 40 + ((this.time * 50 + i * 13) % 110);
        this.line(
          { x: q.x + Math.cos(a) * r, y: q.y - 50 + Math.sin(a) * r * 0.6 },
          { x: q.x + Math.cos(a) * (r + 18), y: q.y - 50 + Math.sin(a) * (r + 18) * 0.6 },
          '#e2b06c88',
          1,
        );
      }
    }
    // Windborne maple leaves and fine rain, not shader-dependent.
    for (let i = 0; i < 32; i++) {
      const x = ((random(i + 75) * 1500 + this.time * (12 + random(i) * 20)) % 1600) - 80,
        y = ((random(i + 81) * 900 + this.time * 11) % 950) - 30;
      c.save();
      c.translate(x, y);
      c.rotate(this.time * 0.6 + i);
      this.path(
        [
          { x: -4, y: 0 },
          { x: -1, y: -3 },
          { x: 1, y: -6 },
          { x: 2, y: -1 },
          { x: 6, y: 0 },
          { x: 1, y: 3 },
        ],
        i % 3 ? '#b76b3eaa' : '#d39a57bb',
      );
      c.restore();
    }
    c.restore();
    for (let i = 0; i < 75; i++) {
      const x = (random(i + 321) * 1600 - this.time * 30) % 1600,
        y = (random(i + 144) * 1000 + this.time * 320) % 1000;
      this.line({ x, y }, { x: x - 3, y: y + 14 }, '#c8d0ac13', 0.8);
    }
    // Foreground brush and framing branches.
    c.fillStyle = '#14251ed9';
    c.beginPath();
    c.moveTo(0, 850);
    for (let x = 0; x <= 1500; x += 15) c.lineTo(x, 850 + Math.sin(x * 0.01) * 30 - random(x) * 35);
    c.lineTo(1500, 5000);
    c.lineTo(0, 5000);
    c.fill();
    if (this.flash > 0 && !this.reduced) {
      c.fillStyle = `rgba(237,211,156,${this.flash})`;
      c.fillRect(0, 0, 1440, 900);
      this.flash = Math.max(0, this.flash - dt * 2);
    }
    c.restore();
    void logicalWidth;
  }
  samurai(a: Player | Boss, isBoss: boolean, mode: string, _cinemaTime: number) {
    const c = this.ctx,
      q = this.project(a.x, a.y);
    const moving = a.action === 'run' || a.action === 'approach',
      dead = a.action === 'dead';
    const stride = moving ? Math.sin(this.time * (isBoss ? 8 : 15)) * 6 : 0;
    const bob = moving ? Math.abs(stride) * 0.3 : Math.sin(this.time * 2) * 1.2;
    const facing = Math.cos(a.facing) - Math.sin(a.facing) >= 0 ? 1 : -1;
    const sz = isBoss ? 1.45 : 1;
    const attack = ['attack', 'heavy'].includes(a.action);
    const windup = isBoss && a.action === 'windup';
    this.ellipse(q.x, q.y + 3, isBoss ? 37 : 23, isBoss ? 14 : 9, '#14271e70');
    c.save();
    c.translate(q.x, q.y - bob);
    c.scale(sz * facing, sz);
    if (dead) {
      c.rotate(isBoss ? -0.7 : 0.9);
      c.scale(1, 0.6);
    }
    if ('invulnerable' in a && a.invulnerable > 0 && a.action === 'hurt')
      c.globalAlpha = 0.5 + Math.sin(this.time * 40) * 0.2;
    // Cloth silhouette, leg wraps, split hakama, lamellar armour.
    const cloth = isBoss ? '#353c31' : '#c4c1a1',
      dark = isBoss ? '#222f29' : '#303d35',
      red = isBoss ? '#865039' : '#a34c36';
    this.path(
      [
        { x: -15, y: -39 },
        { x: 17, y: -39 },
        { x: 24 + stride * 0.3, y: -5 },
        { x: 5, y: -3 },
        { x: 1, y: -24 },
        { x: -5, y: -3 },
        { x: -22 - stride * 0.4, y: -5 },
      ],
      dark,
      '#1d2c24',
    );
    this.line({ x: -10, y: -15 }, { x: -10 - stride, y: -2 }, '#b0ab87', 7);
    this.line({ x: 12, y: -15 }, { x: 12 + stride, y: -1 }, '#afa989', 7);
    this.line({ x: -13 - stride, y: -1 }, { x: -4 - stride, y: -1 }, '#242c23', 5);
    this.line({ x: 10 + stride, y: 0 }, { x: 22 + stride, y: 0 }, '#242c23', 5);
    // Trailing shoulder cloth / commander's torn mantle.
    const flutter = Math.sin(this.time * 4) * 4;
    this.path(
      [
        { x: -13, y: -72 },
        { x: -27, y: -60 },
        { x: -36 + flutter, y: -21 },
        { x: -24, y: -25 },
        { x: -28, y: -11 },
        { x: -11, y: -32 },
        { x: 6, y: -60 },
      ],
      isBoss ? '#914c34' : '#ab4c34',
      '#532f25',
    );
    this.line({ x: -18, y: -61 }, { x: -25 + flutter, y: -28 }, '#cf785047', 2);
    this.path(
      [
        { x: -17, y: -65 },
        { x: 8, y: -69 },
        { x: 21, y: -52 },
        { x: 14, y: -31 },
        { x: -16, y: -31 },
        { x: -23, y: -50 },
      ],
      cloth,
      '#28392e',
    );
    this.path(
      [
        { x: -13, y: -64 },
        { x: 12, y: -54 },
        { x: -3, y: -32 },
        { x: -15, y: -36 },
      ],
      isBoss ? '#4e5341' : '#ddd4b3',
    );
    this.line({ x: -12, y: -63 }, { x: 8, y: -45 }, '#4f5342', 2);
    if (isBoss) {
      for (let j = 0; j < 4; j++) {
        c.fillStyle = j % 2 ? '#3d4939' : '#4f5541';
        c.fillRect(-15, -58 + j * 7, 33, 5);
        for (let k = 0; k < 5; k++)
          this.line(
            { x: -11 + k * 6, y: -57 + j * 7 },
            { x: -10 + k * 6, y: -53 + j * 7 },
            '#ad8b56',
            0.8,
          );
      }
      for (const side of [-1, 1]) {
        this.path(
          [
            { x: side * 13, y: -64 },
            { x: side * 28, y: -62 },
            { x: side * 31, y: -42 },
            { x: side * 18, y: -44 },
          ],
          '#394738',
          '#1d2b23',
        );
        for (let j = 0; j < 3; j++)
          this.line(
            { x: side * 16, y: -59 + j * 6 },
            { x: side * 29, y: -57 + j * 6 },
            '#a07d4c',
            1,
          );
      }
    }
    this.path(
      [
        { x: -18, y: -35 },
        { x: 18, y: -36 },
        { x: 17, y: -29 },
        { x: -17, y: -28 },
      ],
      red,
    );
    this.line({ x: 8, y: -33 }, { x: 17 + flutter, y: -15 }, red, 4);
    // Head, tied hair and kabuto crest.
    this.ellipse(1, -76, 10, 12, isBoss ? '#74694b' : '#c3a47e');
    this.path(
      [
        { x: -10, y: -76 },
        { x: -11, y: -87 },
        { x: -3, y: -94 },
        { x: 7, y: -91 },
        { x: 12, y: -82 },
        { x: 7, y: -82 },
        { x: 5, y: -86 },
        { x: 0, y: -80 },
      ],
      '#202e26',
    );
    if (isBoss) {
      this.path(
        [
          { x: -16, y: -79 },
          { x: -13, y: -90 },
          { x: 0, y: -99 },
          { x: 14, y: -90 },
          { x: 18, y: -79 },
        ],
        '#303d30',
        '#8c8052',
      );
      this.path(
        [
          { x: -6, y: -90 },
          { x: -22, y: -107 },
          { x: -17, y: -87 },
          { x: 0, y: -81 },
          { x: 17, y: -88 },
          { x: 23, y: -109 },
          { x: 6, y: -91 },
        ],
        '#b5a46b',
      );
      this.path(
        [
          { x: -8, y: -77 },
          { x: 9, y: -77 },
          { x: 7, y: -67 },
          { x: -4, y: -65 },
        ],
        '#353b2b',
      );
      this.line(
        { x: -5, y: -77 },
        { x: 0, y: -77 },
        'phase' in a && a.phase === 2 ? '#f9b66c' : '#c5ae72',
        2,
      );
      this.line(
        { x: 4, y: -77 },
        { x: 9, y: -77 },
        'phase' in a && a.phase === 2 ? '#f9b66c' : '#c5ae72',
        2,
      );
    } else {
      this.path(
        [
          { x: -10, y: -85 },
          { x: -20, y: -82 },
          { x: -18, y: -73 },
          { x: -10, y: -77 },
        ],
        '#222f28',
      );
      this.line({ x: -10, y: -80 }, { x: 10, y: -82 }, '#9c4631', 3);
      this.line({ x: -8, y: -80 }, { x: -31 - flutter, y: -67 }, '#a95137', 3);
      this.line({ x: 6, y: -77 }, { x: 11, y: -77 }, '#282e23', 1);
    }
    // Sword poses and bright, deliberately asymmetric blade.
    const parry = a.action === 'parry';
    let hand = { x: 19, y: -47 },
      tip = { x: 68, y: -69 };
    if (windup) {
      hand = { x: 12, y: -78 };
      tip = { x: -28, y: -133 };
    } else if (attack) {
      const swing = a.actionTime * (isBoss ? 9 : 12);
      hand = { x: 20, y: -51 };
      tip = { x: 20 + Math.cos(swing) * 65, y: -51 + Math.sin(swing) * 48 };
    } else if (parry) {
      hand = { x: 20, y: -56 };
      tip = { x: 8, y: -112 };
    } else if (a.action === 'dodge') {
      tip = { x: -65, y: -30 };
      hand = { x: -7, y: -39 };
    }
    this.line({ x: 9, y: -60 }, hand, cloth, 10);
    this.ellipse(hand.x, hand.y, 4, 4, '#bfa17c');
    const dx = tip.x - hand.x,
      dy = tip.y - hand.y,
      l = Math.hypot(dx, dy),
      nx = -dy / l,
      ny = dx / l;
    this.line({ x: hand.x - dx * 0.15, y: hand.y - dy * 0.15 }, hand, '#443d2c', 4);
    this.line(
      { x: hand.x + nx * 6, y: hand.y + ny * 6 },
      { x: hand.x - nx * 6, y: hand.y - ny * 6 },
      '#c3a45f',
      2,
    );
    this.path(
      [
        { x: hand.x + nx * 2, y: hand.y + ny * 2 },
        { x: tip.x + nx * 2, y: tip.y + ny * 2 },
        tip,
        { x: hand.x - nx, y: hand.y - ny },
      ],
      '#dfdec1',
    );
    this.line(hand, tip, '#f4eccc', 0.8);
    // Scabbard stays visible below the belt.
    this.line({ x: -5, y: -33 }, { x: -43, y: -19 }, '#232c25', 4);
    this.line({ x: -9, y: -32 }, { x: -14, y: -30 }, '#a68c56', 4);
    c.restore();
    if (isBoss && 'phase' in a && a.phase === 2 && !dead) {
      for (let i = 0; i < 8; i++) {
        const ang = this.time * 0.7 + (i * TAU) / 8,
          rx = q.x + Math.cos(ang) * 47,
          ry = q.y - 65 + Math.sin(ang) * 25 + Math.sin(this.time * 3 + i) * 10;
        c.save();
        c.translate(rx, ry);
        c.rotate(Math.sin(ang) * 0.3);
        this.path(
          [
            { x: -3, y: -12 },
            { x: 4, y: -10 },
            { x: 3, y: 9 },
            { x: 0, y: 14 },
            { x: -4, y: 8 },
          ],
          '#ddd0a5bb',
        );
        this.line({ x: 0, y: -6 }, { x: 0, y: 5 }, '#6d513b', 1);
        this.line({ x: -2, y: -2 }, { x: 2, y: -2 }, '#6d513b', 1);
        c.restore();
      }
    }
    if (!isBoss && mode === 'fight') {
      c.beginPath();
      c.ellipse(q.x, q.y + 5, 25, 11, 0, 0, TAU);
      c.strokeStyle = '#dac99377';
      c.lineWidth = 1;
      c.stroke();
      this.path(
        [
          { x: q.x, y: q.y + 17 },
          { x: q.x - 3, y: q.y + 21 },
          { x: q.x + 3, y: q.y + 21 },
        ],
        '#d5bc80',
      );
    }
  }
  groundArc(
    x: number,
    y: number,
    r: number,
    start: number,
    end: number,
    color: string,
    width: number,
    fill = false,
  ) {
    const c = this.ctx;
    c.beginPath();
    if (fill) {
      const p = this.project(x, y);
      c.moveTo(p.x, p.y);
    }
    for (let i = 0; i <= 50; i++) {
      const a = start + ((end - start) * i) / 50,
        p = this.project(x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (i === 0 && !fill) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    if (fill) {
      c.closePath();
      c.fillStyle = color;
      c.fill();
    } else {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke();
    }
  }
  telegraph(t: Battle['telegraphs'][number]) {
    const c = this.ctx,
      alpha = 0.09 + t.progress * 0.15;
    const color = `rgba(223,106,63,${alpha})`;
    if (t.kind === 'line') {
      const d = { x: Math.cos(t.angle), y: Math.sin(t.angle) },
        n = { x: -d.y * 0.55, y: d.x * 0.55 };
      this.path(
        [
          this.project(t.x + n.x, t.y + n.y),
          this.project(t.x + d.x * t.radius + n.x, t.y + d.y * t.radius + n.y),
          this.project(t.x + d.x * t.radius - n.x, t.y + d.y * t.radius - n.y),
          this.project(t.x - n.x, t.y - n.y),
        ],
        color,
        '#e5a66b99',
      );
      const end = this.project(
        t.x + d.x * t.radius * t.progress,
        t.y + d.y * t.radius * t.progress,
      );
      const start = this.project(t.x, t.y);
      this.line(start, end, '#edb179', 2);
    } else if (t.kind === 'arc') {
      this.groundArc(t.x, t.y, t.radius, t.angle - 1.5, t.angle + 1.5, color, 1, true);
      this.groundArc(t.x, t.y, t.radius, t.angle - 1.5, t.angle + 1.5, '#efb87888', 2);
      this.groundArc(t.x, t.y, t.radius * t.progress, t.angle - 1.5, t.angle + 1.5, '#e6c58baa', 1);
    } else {
      this.groundArc(t.x, t.y, t.radius, 0, TAU, color, 1, true);
      this.groundArc(t.x, t.y, t.radius, 0, TAU, '#dcb079aa', 2);
      this.groundArc(t.x, t.y, t.radius * (1 - t.progress), 0, TAU, '#e8c992aa', 1);
    }
    void c;
  }
  effect(e: Battle['effects'][number]) {
    const c = this.ctx,
      t = e.age / e.duration,
      q = this.project(e.x, e.y),
      a = e.angle || 0;
    c.save();
    c.globalAlpha = 1 - t;
    if (['slash', 'heavy', 'bossSlash'].includes(e.kind)) {
      const r = e.kind === 'bossSlash' ? 2.7 : e.kind === 'heavy' ? 2.2 : 1.7;
      this.groundArc(
        e.x,
        e.y,
        r,
        a - 1.4 + t * 2.5,
        a - 0.2 + t * 2.5,
        e.kind === 'bossSlash' ? '#d28152' : '#f2e7bd',
        e.kind === 'heavy' ? 8 : 4,
      );
      this.groundArc(e.x, e.y, r * 0.9, a - 1.5 + t * 2.5, a - 0.1 + t * 2.5, '#e9dca955', 12);
    } else if (e.kind === 'shockwave') {
      this.groundArc(e.x, e.y, e.age * 5.6, 0, TAU, '#ead5a6', 4);
      this.groundArc(e.x, e.y, Math.max(0, e.age * 5.6 - 0.2), 0, TAU, '#bb684e', 8);
    } else if (e.kind === 'thrust') {
      const end = this.project(e.x + Math.cos(a) * 4.2, e.y + Math.sin(a) * 4.2);
      this.line({ x: q.x, y: q.y - 30 }, { x: end.x, y: end.y - 30 }, '#ecd0a0', 5);
    } else if (e.kind === 'dodge') {
      this.ellipse(q.x, q.y, 30 + t * 20, 10 + t * 5, '#d9d8b044');
    } else if (e.kind === 'guard') {
      this.groundArc(e.x, e.y, 0.7, a - 1, a + 1, '#e4c68a', 3);
    } else {
      const parry = e.kind === 'parry';
      for (let i = 0; i < (parry ? 28 : 15); i++) {
        const ang = random(i + 61) * TAU,
          r = t * (parry ? 125 : 65),
          len = (1 - t) * 20;
        this.line(
          { x: q.x + Math.cos(ang) * r, y: q.y - 45 + Math.sin(ang) * r * 0.7 },
          { x: q.x + Math.cos(ang) * (r + len), y: q.y - 45 + Math.sin(ang) * (r + len) * 0.7 },
          e.kind === 'hurt' ? '#bc563a' : i % 3 ? '#ead4a0' : '#fff3d0',
          i % 3 ? 1 : 2,
        );
      }
      if (parry) {
        this.line(
          { x: q.x - 120 * t, y: q.y - 45 },
          { x: q.x + 120 * t, y: q.y - 45 },
          '#fff0bc',
          2,
        );
      }
    }
    c.restore();
  }
}
