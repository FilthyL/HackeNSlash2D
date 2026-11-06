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
  thunderCue = false;
  get wind() {
    return 0.55 + Math.pow((Math.sin(this.time * 0.63) + 1) / 2, 3) * 1.1;
  }
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private scenery = document.createElement('canvas');
  private backdrop = document.createElement('canvas');
  private leftTree = document.createElement('canvas');
  private rightTree = document.createElement('canvas');
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.scenery.width = 1440;
    this.scenery.height = 1000;
    this.backdrop.width = 1440;
    this.backdrop.height = 900;
    for (const tree of [this.leftTree, this.rightTree]) {
      tree.width = 1440;
      tree.height = 1000;
    }
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
    g.addColorStop(0, '#0b0b0b');
    g.addColorStop(0.42, '#555555');
    g.addColorStop(1, '#151515');
    c.fillStyle = g;
    c.fillRect(0, 0, 1440, 900);
    // Broad charcoal cloud banks, with no moon or warm light source.
    for (let i = 0; i < 22; i++) {
      const x = random(i + 56) * 1700 - 100,
        y = random(i + 39) * 210;
      const cloud = c.createRadialGradient(x, y, 10, x, y, 240);
      cloud.addColorStop(0, i % 2 ? '#050505aa' : '#aaaaaa15');
      cloud.addColorStop(1, '#11111100');
      c.fillStyle = cloud;
      c.fillRect(x - 240, y - 240, 480, 480);
    }
    for (let layer = 0; layer < 3; layer++) {
      c.beginPath();
      c.moveTo(-100, 650);
      for (let x = -100; x < 1600; x += 65)
        c.lineTo(x, 260 + layer * 95 + random(x + layer * 29) * 120);
      c.lineTo(1600, 950);
      c.lineTo(-100, 950);
      c.fillStyle = ['#444444', '#303030', '#202020'][layer];
      c.fill();
    }
    for (let i = 0; i < 65; i++) {
      const x = random(i + 45) * 1500,
        y = 150 + random(i + 12) * 380,
        h = 130 + random(i + 3) * 260;
      this.line({ x, y: y + h }, { x: x - 45, y }, '#14141488', 3 + random(i) * 8, c);
      for (let j = 0; j < 4; j++)
        this.line(
          { x: x - 30, y: y + j * 30 },
          { x: x - 70 - random(i + j) * 40, y: y + j * 30 - 30 },
          '#1a1a1a88',
          2,
          c,
        );
    }
    const fog = c.createLinearGradient(0, 150, 0, 750);
    fog.addColorStop(0, '#dddddd00');
    fog.addColorStop(0.6, '#dddddd22');
    fog.addColorStop(1, '#11111100');
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
      '#282828',
      undefined,
      c,
    );
    this.path(
      [p(-5.6, 5.6), p(5.6, 5.6), p(5.6, 5.6, -64), p(-5.6, 5.6, -42)],
      '#3e3e3e',
      undefined,
      c,
    );
    this.path(
      [p(5.6, 5.6), p(5.6, -5.6), p(5.6, -5.6, -45), p(5.6, 5.6, -64)],
      '#343434',
      undefined,
      c,
    );
    for (let i = 0; i < 22; i++) {
      const x = -5.5 + i * 0.5;
      this.line(p(x, 5.6), p(x, 5.6, -38 - random(i) * 20), '#23232388', 2, c);
    }
    this.path(
      [p(-5.65, -5.65), p(5.65, -5.65), p(5.65, 5.65), p(-5.65, 5.65)],
      '#777777',
      undefined,
      c,
    );
    for (let x = -5.5; x < 5.5; x += 0.5)
      for (let y = -5.5; y < 5.5; y += 0.5) {
        const r = random(x * 100 + y * 7);
        const colors = ['#6d6d6d', '#737373', '#7d7d7d', '#777777', '#6a6a6a'];
        this.tile(x + 0.018, y + 0.018, 0.46, colors[Math.floor(r * 5)], c);
        if (r > 0.78) {
          const a = p(x + 0.08, y + 0.03),
            b = p(x + 0.26, y + 0.18),
            d = p(x + 0.4, y + 0.4);
          this.line(a, b, '#47474777', 0.8, c);
          this.line(b, d, '#47474777', 0.8, c);
        }
      }
    // The inset ritual court and worn circular bell inscription.
    for (let i = 0; i < 4; i++) {
      const s = 4.9 - i * 0.13;
      this.path(
        [p(-s, -s), p(s, -s), p(s, s), p(-s, s)],
        'transparent',
        i % 2 ? '#8d8d8d44' : '#48484888',
        c,
      );
    }
    const center = p(-0.3, -0.5);
    c.save();
    c.translate(center.x, center.y);
    c.scale(1, 0.5);
    c.strokeStyle = '#b8b8b838';
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
      c.fillStyle = '#b8b8b844';
      c.fillRect(153, -2, 9, 3);
      c.restore();
    }
    c.restore();
    // Broad stone steps at the near corner.
    for (let s = 5; s >= 0; s--) {
      const a = p(2.1, 5.6 + s * 0.22, -s * 5),
        b = p(4, 5.6 + s * 0.22, -s * 5);
      this.path([a, b, { x: b.x, y: b.y + 7 }, { x: a.x, y: a.y + 7 }], '#5e5e5e', undefined, c);
      this.line(a, b, '#8a8a8a', 2, c);
    }
    // Puddles, moss and fallen maple leaves.
    for (let i = 0; i < 380; i++) {
      const x = random(i * 8 + 2) * 10.7 - 5.35,
        y = random(i * 6 + 7) * 10.7 - 5.35,
        q = p(x, y);
      if (i < 35) this.ellipse(q.x, q.y, 8 + random(i) * 20, 2 + random(i + 2) * 6, '#a6a6a630', c);
      else if (i < 140)
        this.ellipse(q.x, q.y, 2 + random(i) * 12, 1 + random(i + 2) * 3, '#47474777', c);
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
          ['#6a6a6a', '#5b5b5b', '#8a8a8a', '#474747'][i % 4],
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
      this.path([a, b, { x: b.x, y: b.y - 23 }, { x: a.x, y: a.y - 23 }], '#5d5d5d', '#444444', c);
      this.line({ x: a.x - 3, y: a.y - 24 }, { x: b.x + 3, y: b.y - 24 }, '#888888', 5, c);
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
    c.strokeStyle = '#a1a1a1';
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
        '#bdbdbd',
        undefined,
        c,
      );
    }
    this.tree(140, 510, 1.2, this.leftTree.getContext('2d')!);
    this.tree(1250, 385, 0.95, this.rightTree.getContext('2d')!);
  }
  torii(c: CanvasRenderingContext2D) {
    const q = this.project(-3.8, -3.8);
    const x = q.x,
      y = q.y;
    this.ellipse(x, y + 13, 195, 20, '#27272755', c);
    for (const side of [-1, 1]) {
      const px = x + side * 126;
      this.path(
        [
          { x: px - 12, y },
          { x: px + 13, y: y + 2 },
          { x: px + 9, y: y - 197 },
          { x: px - 6, y: y - 197 },
        ],
        '#494949',
        '#383838',
        c,
      );
      this.line({ x: px - 4, y: y - 190 }, { x: px - 4, y: y - 12 }, '#6b6b6b', 3, c);
      this.path(
        [
          { x: px - 18, y: y + 2 },
          { x: px + 18, y: y + 2 },
          { x: px + 19, y: y - 14 },
          { x: px - 17, y: y - 14 },
        ],
        '#3e3e3e',
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
      '#3c3c3c',
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
      '#5d5d5d',
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
      '#5e5e5e',
      '#3e3e3e',
      c,
    );
    c.fillStyle = '#4f4f4f';
    c.fillRect(x - 9, y - 193, 18, 50);
    c.fillStyle = '#bbbbbb';
    c.font = '13px Georgia';
    c.fillText('哀', x - 7, y - 168);
  }
  bell(c: CanvasRenderingContext2D) {
    const q = this.project(-3.8, -3.8),
      x = q.x,
      y = q.y - 25;
    this.line({ x, y: y - 130 }, { x, y: y - 85 }, '#a5a5a5', 5, c);
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
      '#727272',
      '#383838',
      c,
    );
    this.ellipse(x, y - 84, 27, 8, '#8f8f8f', c);
    this.ellipse(x, y - 4, 44, 9, '#969696', c);
    this.ellipse(x, y - 1, 35, 5, '#3f3f3f', c);
    for (let i = 0; i < 4; i++) {
      this.line(
        { x: x - 29 - i * 2, y: y - 65 + i * 13 },
        { x: x + 29 + i * 2, y: y - 65 + i * 13 },
        '#9b9b9b66',
        2,
        c,
      );
    }
    this.line({ x: x + 9, y: y - 83 }, { x: x - 5, y: y - 48 }, '#343434', 3, c);
    this.line({ x: x - 5, y: y - 48 }, { x: x + 6, y: y - 31 }, '#343434', 3, c);
    this.line({ x: x + 6, y: y - 31 }, { x: x - 7, y: y + 2 }, '#343434', 3, c);
  }
  lantern(x: number, y: number, c: CanvasRenderingContext2D) {
    const q = this.project(x, y);
    this.ellipse(q.x, q.y, 25, 10, '#2b2b2b33', c);
    this.path(
      [
        { x: q.x - 17, y: q.y },
        { x: q.x + 17, y: q.y },
        { x: q.x + 12, y: q.y - 10 },
        { x: q.x - 12, y: q.y - 10 },
      ],
      '#888888',
      undefined,
      c,
    );
    c.fillStyle = '#676767';
    c.fillRect(q.x - 6, q.y - 42, 12, 34);
    this.path(
      [
        { x: q.x - 15, y: q.y - 40 },
        { x: q.x + 15, y: q.y - 40 },
        { x: q.x + 13, y: q.y - 67 },
        { x: q.x - 13, y: q.y - 67 },
      ],
      '#4a4a4a',
      undefined,
      c,
    );
    c.fillStyle = '#bababa';
    c.fillRect(q.x - 8, q.y - 61, 16, 16);
    this.line({ x: q.x, y: q.y - 64 }, { x: q.x, y: q.y - 43 }, '#545454', 3, c);
    this.path(
      [
        { x: q.x - 25, y: q.y - 65 },
        { x: q.x, y: q.y - 83 },
        { x: q.x + 25, y: q.y - 65 },
        { x: q.x + 17, y: q.y - 60 },
        { x: q.x - 17, y: q.y - 60 },
      ],
      '#818181',
      '#4a4a4a',
      c,
    );
    this.ellipse(q.x, q.y - 50, 34, 25, '#bdbdbd0a', c);
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
      c.strokeStyle = '#2c2c2c';
      c.lineWidth = i ? 8 : 17;
      c.stroke();
      c.strokeStyle = '#484848';
      c.lineWidth = i ? 2 : 4;
      c.stroke();
    }
    for (let i = 0; i < 160; i++) {
      const px = (random(i + 91) - 0.5) * 300 + 20,
        py = -190 - random(i + 81) * 160;
      const r = 8 + random(i + 11) * 24;
      const color = ['#444444', '#4e4e4e', '#5b5b5b', '#636363', '#737373', '#606060'][i % 6];
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
    const previousStorm = Math.floor((this.time + 2.2) / 13);
    this.time += dt;
    if (Math.floor((this.time + 2.2) / 13) > previousStorm) this.thunderCue = true;
    this.phase = b.boss.phase;
    const c = this.ctx,
      dpr = this.canvas.width / this.width;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = '#282828';
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
    for (const [tree, x, y] of [
      [this.leftTree, 140, 510],
      [this.rightTree, 1250, 385],
    ] as const) {
      c.save();
      c.translate(x, y);
      if (!this.reduced) c.rotate((0.012 + Math.sin(this.time * 1.8 + x) * 0.008) * this.wind);
      c.drawImage(tree, -x, -y);
      c.restore();
    }
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
          '#b6b6b688',
          1,
        );
      }
    }
    // Torn prayers and debris share the same gust as Ren's sleeves.
    for (let i = 0; i < 24; i++) {
      const x =
        ((((random(i + 75) * 1800 - this.time * (125 + random(i) * 70)) % 1800) + 1800) % 1800) -
        180;
      const y = (random(i + 81) * 850 + this.time * 30 + Math.sin(this.time * 3 + i) * 12) % 900;
      c.save();
      c.translate(x, y);
      c.rotate(Math.sin(this.time * 4 + i) * 1.4);
      this.path(
        [
          { x: -7, y: 0 },
          { x: 2, y: -3 },
          { x: 9, y: 1 },
          { x: 2, y: 3 },
        ],
        i % 3 ? '#11111199' : '#cccccc88',
      );
      c.restore();
    }
    // Expanding rings and wind-sheared reflections on the wet stone.
    for (let i = 0; i < 36; i++) {
      const p = this.project(random(i + 100) * 10 - 5, random(i + 400) * 10 - 5);
      const age = (this.time * 1.4 + random(i) * 7) % 1;
      c.beginPath();
      c.ellipse(p.x, p.y, 2 + age * 13, 1 + age * 4, 0, 0, TAU);
      c.strokeStyle = `rgba(235,235,235,${(1 - age) * 0.17})`;
      c.lineWidth = 0.7;
      c.stroke();
    }
    c.restore();
    this.storm();
    // Foreground brush and framing branches.
    c.fillStyle = '#212121d9';
    c.beginPath();
    c.moveTo(0, 850);
    for (let x = 0; x <= 1500; x += 15) c.lineTo(x, 850 + Math.sin(x * 0.01) * 30 - random(x) * 35);
    c.lineTo(1500, 5000);
    c.lineTo(0, 5000);
    c.fill();
    if (this.flash > 0 && !this.reduced) {
      c.fillStyle = `rgba(213, 213, 213,${this.flash})`;
      c.fillRect(0, 0, 1440, 900);
      this.flash = Math.max(0, this.flash - dt * 2);
    }
    c.restore();
    void logicalWidth;
  }
  storm() {
    const c = this.ctx,
      gust = this.wind;
    // No lightning flashes in reduced-motion mode; rainfall remains slower and sparse.
    const strike = (this.time + 2.2) % 13;
    if (!this.reduced && strike < 0.22) {
      c.save();
      c.globalAlpha = (1 - strike / 0.22) * 0.7;
      const x = 1000 + random(Math.floor(this.time / 13)) * 200;
      const bolt = [
        { x, y: 0 },
        { x: x - 28, y: 58 },
        { x: x - 9, y: 65 },
        { x: x - 56, y: 124 },
        { x: x - 39, y: 117 },
        { x: x - 82, y: 200 },
      ];
      for (let i = 1; i < bolt.length; i++) this.line(bolt[i - 1], bolt[i], '#eeeeee', 2);
      this.line(bolt[2], { x: x + 36, y: 122 }, '#cccccc', 1);
      c.globalAlpha = 0.045 * (1 - strike / 0.22);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 1440, 900);
      c.restore();
    }
    const count = this.reduced ? 90 : 360,
      speed = this.reduced ? 160 : 720;
    for (let layer = 0; layer < 3; layer++) {
      c.beginPath();
      for (let i = layer; i < count; i += 3) {
        const seed = i + 321,
          velocity = speed * (0.65 + random(i + 7) * 0.7);
        const y = ((random(seed + 144) * 1100 + this.time * velocity) % 1100) - 100;
        const x =
          ((((random(seed) * 1800 - this.time * velocity * 0.7) % 1800) + 1800) % 1800) - 180;
        const len = (12 + layer * 13) * (this.reduced ? 0.6 : 1);
        c.moveTo(x, y);
        c.lineTo(x - len * (0.65 + gust * 0.22), y + len);
      }
      c.strokeStyle = ['#dddddd13', '#dddddd25', '#ffffff45'][layer];
      c.lineWidth = 0.6 + layer * 0.3;
      c.stroke();
    }
    // Long, low ribbons of spray make the wind direction legible.
    for (let i = 0; i < 5; i++) {
      const x = ((((random(i + 850) * 1900 - this.time * 90) % 1900) + 1900) % 1900) - 200;
      const y = 370 + i * 90 + Math.sin(this.time + i) * 12;
      const mist = c.createLinearGradient(x - 240, y, x + 200, y);
      mist.addColorStop(0, '#dddddd00');
      mist.addColorStop(0.5, '#dddddd0c');
      mist.addColorStop(1, '#dddddd00');
      c.fillStyle = mist;
      c.beginPath();
      c.ellipse(x, y, 260, 10 + gust * 6, -0.12, 0, TAU);
      c.fill();
    }
  }
  ronin(a: Player, mode: string) {
    const c = this.ctx,
      q = this.project(a.x, a.y),
      running = a.action === 'run';
    const facing = Math.cos(a.facing) - Math.sin(a.facing) >= 0 ? 1 : -1;
    const stride = running ? Math.sin(this.time * 15) * 5 : 0;
    const wind = this.reduced ? 5 : this.wind * 10 + Math.sin(this.time * 9) * 3;
    const sway = running ? Math.abs(stride) * 0.3 : Math.sin(this.time * 2) * 0.7;
    this.ellipse(q.x, q.y + 4, 28, 10, '#00000088');
    c.save();
    c.translate(q.x, q.y - sway);
    c.scale(1.12 * facing, 1.12);
    if (a.action === 'dead') {
      c.rotate(0.9);
      c.scale(1, 0.6);
    }
    if (a.action === 'hurt') c.globalAlpha = 0.6;
    if (a.action === 'dodge') c.rotate(-0.19);
    // Sandals and wrapped ankles beneath a broad, pleated black hakama.
    this.line({ x: -10, y: -20 }, { x: -13 - stride, y: -1 }, '#cccccc', 6);
    this.line({ x: 10, y: -20 }, { x: 14 + stride, y: 0 }, '#bbbbbb', 6);
    this.line({ x: -18 - stride, y: 0 }, { x: -7 - stride, y: 0 }, '#0a0a0a', 5);
    this.line({ x: 10 + stride, y: 2 }, { x: 23 + stride, y: 2 }, '#0a0a0a', 5);
    this.path(
      [
        { x: -17, y: -42 },
        { x: 17, y: -41 },
        { x: 25 + stride * 0.4, y: -9 },
        { x: 4, y: -8 },
        { x: 0, y: -27 },
        { x: -6, y: -9 },
        { x: -25 - stride * 0.4, y: -11 },
      ],
      '#111111',
      '#777777',
    );
    for (let i = -2; i <= 2; i++)
      this.line({ x: i * 6, y: -37 }, { x: i * 9 + stride * 0.2, y: -12 }, '#555555', 0.8);
    // Wind stretches the haori behind him rather than adding a generic cape.
    this.path(
      [
        { x: -13, y: -77 },
        { x: -26, y: -66 },
        { x: -35 - wind, y: -27 },
        { x: -24 - wind * 0.7, y: -32 },
        { x: -31 - wind, y: -16 },
        { x: -14, y: -27 },
        { x: 9, y: -63 },
      ],
      '#d1d1d1',
      '#151515',
    );
    this.path(
      [
        { x: -18, y: -67 },
        { x: -23 - wind * 0.6, y: -40 },
        { x: -32 - wind, y: -26 },
        { x: -21, y: -34 },
      ],
      '#777777',
    );
    this.path(
      [
        { x: -18, y: -73 },
        { x: 7, y: -76 },
        { x: 24, y: -60 },
        { x: 18, y: -32 },
        { x: -17, y: -30 },
        { x: -25, y: -58 },
      ],
      '#191919',
      '#acacac',
    );
    this.path(
      [
        { x: -11, y: -75 },
        { x: 5, y: -67 },
        { x: 14, y: -56 },
        { x: 2, y: -38 },
        { x: -5, y: -43 },
        { x: 5, y: -58 },
      ],
      '#e4e4e4',
    );
    this.line({ x: -10, y: -72 }, { x: 6, y: -57 }, '#ffffff', 2);
    // Loose sleeve hangs under the sword arm; a stitched family crest at the shoulder.
    this.path(
      [
        { x: 9, y: -71 },
        { x: 24, y: -64 },
        { x: 30, y: -48 },
        { x: 19, y: -32 },
        { x: 9, y: -45 },
      ],
      '#d9d9d9',
      '#181818',
    );
    this.ellipse(-15, -63, 4, 4, '#ededed');
    this.ellipse(-15, -63, 2, 2, '#222222');
    this.path(
      [
        { x: -18, y: -37 },
        { x: 19, y: -38 },
        { x: 18, y: -30 },
        { x: -17, y: -29 },
      ],
      '#c9c9c9',
      '#161616',
    );
    this.path(
      [
        { x: -11, y: -32 },
        { x: -25 - wind, y: -24 },
        { x: -43 - wind, y: -29 },
        { x: -40 - wind, y: -24 },
        { x: -19 - wind * 0.7, y: -20 },
        { x: -7, y: -28 },
      ],
      '#dddddd',
    );
    this.line({ x: -14, y: -30 }, { x: -49 - wind, y: -34 }, '#777777', 2);
    // Face in deep shade, chin cord, and a wide woven kasa with visible radial ribs.
    this.ellipse(3, -82, 9, 10, '#8d8d8d');
    this.line({ x: 3, y: -79 }, { x: 9, y: -79 }, '#151515', 2);
    this.line({ x: -17, y: -85 }, { x: 2, y: -69 }, '#aaaaaa', 0.8);
    this.line({ x: 24, y: -83 }, { x: 2, y: -69 }, '#aaaaaa', 0.8);
    this.path(
      [
        { x: -38, y: -86 },
        { x: -4, y: -113 },
        { x: 39, y: -90 },
        { x: 33, y: -83 },
        { x: 5, y: -78 },
        { x: -27, y: -80 },
      ],
      '#b9b9b9',
      '#101010',
    );
    this.path(
      [
        { x: -38, y: -86 },
        { x: 0, y: -87 },
        { x: 39, y: -90 },
        { x: 33, y: -83 },
        { x: 5, y: -78 },
        { x: -27, y: -80 },
      ],
      '#242424',
      '#c4c4c4',
    );
    for (let i = 0; i < 12; i++) {
      const x = -35 + i * 6.4;
      this.line(
        { x: -4, y: -111 },
        { x, y: -86 - Math.max(0, x) * 0.09 },
        i % 2 ? '#777777' : '#e4e4e4',
        0.65,
      );
    }
    this.line({ x: -26, y: -94 }, { x: 25, y: -98 }, '#d7d7d7', 0.65);
    this.line({ x: -16, y: -102 }, { x: 12, y: -106 }, '#777777', 0.65);
    this.line({ x: -36, y: -85 }, { x: 36, y: -89 }, '#e4e4e4', 1.2);
    // Keep the sword clear of the robe in each combat pose.
    let hand = { x: 23, y: -52 },
      tip = { x: 76, y: -67 };
    if (a.action === 'attack' || a.action === 'heavy') {
      const t = a.actionTime * 12;
      tip = { x: 23 + Math.cos(t) * 66, y: -52 + Math.sin(t) * 46 };
    }
    if (a.action === 'parry') {
      hand = { x: 23, y: -60 };
      tip = { x: 12, y: -119 };
    }
    if (a.action === 'dodge') {
      hand = { x: 10, y: -41 };
      tip = { x: -66, y: -28 };
    }
    this.line({ x: 15, y: -65 }, hand, '#c9c9c9', 8);
    this.ellipse(hand.x, hand.y, 3.5, 3.5, '#aaaaaa');
    this.line({ x: hand.x - 9, y: hand.y + 3 }, hand, '#131313', 4);
    this.line({ x: hand.x - 2, y: hand.y - 5 }, { x: hand.x + 2, y: hand.y + 5 }, '#d9d9d9', 2);
    this.line(hand, tip, '#191919', 4);
    this.line(hand, tip, '#f5f5f5', 2);
    this.line({ x: -6, y: -33 }, { x: -46, y: -14 }, '#111111', 5);
    this.line({ x: -6, y: -35 }, { x: -45, y: -16 }, '#8a8a8a', 0.8);
    c.restore();
    if (mode === 'fight') {
      c.beginPath();
      c.ellipse(q.x, q.y + 5, 26, 11, 0, 0, TAU);
      c.strokeStyle = '#ffffff99';
      c.lineWidth = 1;
      c.stroke();
    }
  }
  samurai(a: Player | Boss, isBoss: boolean, mode: string, _cinemaTime: number) {
    if (!isBoss) {
      this.ronin(a as Player, mode);
      return;
    }
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
    this.ellipse(q.x, q.y + 3, isBoss ? 37 : 23, isBoss ? 14 : 9, '#22222270');
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
    const cloth = isBoss ? '#3a3a3a' : '#bfbfbf',
      dark = isBoss ? '#2c2c2c' : '#3a3a3a',
      red = isBoss ? '#5a5a5a' : '#5d5d5d';
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
      '#282828',
    );
    this.line({ x: -10, y: -15 }, { x: -10 - stride, y: -2 }, '#a9a9a9', 7);
    this.line({ x: 12, y: -15 }, { x: 12 + stride, y: -1 }, '#a8a8a8', 7);
    this.line({ x: -13 - stride, y: -1 }, { x: -4 - stride, y: -1 }, '#2a2a2a', 5);
    this.line({ x: 10 + stride, y: 0 }, { x: 22 + stride, y: 0 }, '#2a2a2a', 5);
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
      isBoss ? '#595959' : '#5e5e5e',
      '#363636',
    );
    this.line({ x: -18, y: -61 }, { x: -25 + flutter, y: -28 }, '#88888847', 2);
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
      '#353535',
    );
    this.path(
      [
        { x: -13, y: -64 },
        { x: 12, y: -54 },
        { x: -3, y: -32 },
        { x: -15, y: -36 },
      ],
      isBoss ? '#515151' : '#d4d4d4',
    );
    this.line({ x: -12, y: -63 }, { x: 8, y: -45 }, '#515151', 2);
    if (isBoss) {
      for (let j = 0; j < 4; j++) {
        c.fillStyle = j % 2 ? '#454545' : '#525252';
        c.fillRect(-15, -58 + j * 7, 33, 5);
        for (let k = 0; k < 5; k++)
          this.line(
            { x: -11 + k * 6, y: -57 + j * 7 },
            { x: -10 + k * 6, y: -53 + j * 7 },
            '#8e8e8e',
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
          '#434343',
          '#272727',
        );
        for (let j = 0; j < 3; j++)
          this.line(
            { x: side * 16, y: -59 + j * 6 },
            { x: side * 29, y: -57 + j * 6 },
            '#818181',
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
    this.ellipse(1, -76, 10, 12, isBoss ? '#696969' : '#a8a8a8');
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
      '#2a2a2a',
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
        '#393939',
        '#7f7f7f',
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
        '#a3a3a3',
      );
      this.path(
        [
          { x: -8, y: -77 },
          { x: 9, y: -77 },
          { x: 7, y: -67 },
          { x: -4, y: -65 },
        ],
        '#393939',
      );
      this.line(
        { x: -5, y: -77 },
        { x: 0, y: -77 },
        'phase' in a && a.phase === 2 ? '#bfbfbf' : '#afafaf',
        2,
      );
      this.line(
        { x: 4, y: -77 },
        { x: 9, y: -77 },
        'phase' in a && a.phase === 2 ? '#bfbfbf' : '#afafaf',
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
        '#2c2c2c',
      );
      this.line({ x: -10, y: -80 }, { x: 10, y: -82 }, '#575757', 3);
      this.line({ x: -8, y: -80 }, { x: -31 - flutter, y: -67 }, '#626262', 3);
      this.line({ x: 6, y: -77 }, { x: 11, y: -77 }, '#2c2c2c', 1);
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
    this.ellipse(hand.x, hand.y, 4, 4, '#a5a5a5');
    const dx = tip.x - hand.x,
      dy = tip.y - hand.y,
      l = Math.hypot(dx, dy),
      nx = -dy / l,
      ny = dx / l;
    this.line({ x: hand.x - dx * 0.15, y: hand.y - dy * 0.15 }, hand, '#3d3d3d', 4);
    this.line(
      { x: hand.x + nx * 6, y: hand.y + ny * 6 },
      { x: hand.x - nx * 6, y: hand.y - ny * 6 },
      '#a6a6a6',
      2,
    );
    this.path(
      [
        { x: hand.x + nx * 2, y: hand.y + ny * 2 },
        { x: tip.x + nx * 2, y: tip.y + ny * 2 },
        tip,
        { x: hand.x - nx, y: hand.y - ny },
      ],
      '#dcdcdc',
    );
    this.line(hand, tip, '#ebebeb', 0.8);
    // Scabbard stays visible below the belt.
    this.line({ x: -5, y: -33 }, { x: -43, y: -19 }, '#2a2a2a', 4);
    this.line({ x: -9, y: -32 }, { x: -14, y: -30 }, '#8e8e8e', 4);
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
          '#d0d0d0bb',
        );
        this.line({ x: 0, y: -6 }, { x: 0, y: 5 }, '#555555', 1);
        this.line({ x: -2, y: -2 }, { x: 2, y: -2 }, '#555555', 1);
        c.restore();
      }
    }
    if (!isBoss && mode === 'fight') {
      c.beginPath();
      c.ellipse(q.x, q.y + 5, 25, 11, 0, 0, TAU);
      c.strokeStyle = '#c9c9c977';
      c.lineWidth = 1;
      c.stroke();
      this.path(
        [
          { x: q.x, y: q.y + 17 },
          { x: q.x - 3, y: q.y + 21 },
          { x: q.x + 3, y: q.y + 21 },
        ],
        '#bdbdbd',
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
    const color = `rgba(128, 128, 128,${alpha})`;
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
        '#afafaf99',
      );
      const end = this.project(
        t.x + d.x * t.radius * t.progress,
        t.y + d.y * t.radius * t.progress,
      );
      const start = this.project(t.x, t.y);
      this.line(start, end, '#bababa', 2);
    } else if (t.kind === 'arc') {
      this.groundArc(t.x, t.y, t.radius, t.angle - 1.5, t.angle + 1.5, color, 1, true);
      this.groundArc(t.x, t.y, t.radius, t.angle - 1.5, t.angle + 1.5, '#bfbfbf88', 2);
      this.groundArc(t.x, t.y, t.radius * t.progress, t.angle - 1.5, t.angle + 1.5, '#c8c8c8aa', 1);
    } else {
      this.groundArc(t.x, t.y, t.radius, 0, TAU, color, 1, true);
      this.groundArc(t.x, t.y, t.radius, 0, TAU, '#b5b5b5aa', 2);
      this.groundArc(t.x, t.y, t.radius * (1 - t.progress), 0, TAU, '#ccccccaa', 1);
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
        e.kind === 'bossSlash' ? '#8f8f8f' : '#e6e6e6',
        e.kind === 'heavy' ? 8 : 4,
      );
      this.groundArc(e.x, e.y, r * 0.9, a - 1.5 + t * 2.5, a - 0.1 + t * 2.5, '#dbdbdb55', 12);
    } else if (e.kind === 'shockwave') {
      this.groundArc(e.x, e.y, e.age * 5.6, 0, TAU, '#d6d6d6', 4);
      this.groundArc(e.x, e.y, Math.max(0, e.age * 5.6 - 0.2), 0, TAU, '#787878', 8);
    } else if (e.kind === 'thrust') {
      const end = this.project(e.x + Math.cos(a) * 4.2, e.y + Math.sin(a) * 4.2);
      this.line({ x: q.x, y: q.y - 30 }, { x: end.x, y: end.y - 30 }, '#d2d2d2', 5);
    } else if (e.kind === 'dodge') {
      this.ellipse(q.x, q.y, 30 + t * 20, 10 + t * 5, '#d5d5d544');
    } else if (e.kind === 'guard') {
      this.groundArc(e.x, e.y, 0.7, a - 1, a + 1, '#c8c8c8', 3);
    } else {
      const parry = e.kind === 'parry';
      for (let i = 0; i < (parry ? 28 : 15); i++) {
        const ang = random(i + 61) * TAU,
          r = t * (parry ? 125 : 65),
          len = (1 - t) * 20;
        this.line(
          { x: q.x + Math.cos(ang) * r, y: q.y - 45 + Math.sin(ang) * r * 0.7 },
          { x: q.x + Math.cos(ang) * (r + len), y: q.y - 45 + Math.sin(ang) * (r + len) * 0.7 },
          e.kind === 'hurt' ? '#6a6a6a' : i % 3 ? '#d5d5d5' : '#f3f3f3',
          i % 3 ? 1 : 2,
        );
      }
      if (parry) {
        this.line(
          { x: q.x - 120 * t, y: q.y - 45 },
          { x: q.x + 120 * t, y: q.y - 45 },
          '#efefef',
          2,
        );
      }
    }
    c.restore();
  }
}
