import {
  getLevel,
  type LevelId,
  type CharacterId,
  type PowerKind,
  POWER_LABELS,
} from "./content.ts";

export const VIEW_W = 960;
export const STEP = 1 / 60;
export const GROUND_PAD = 118;

export type Phase = "menu" | "play" | "dead" | "over";
export type HazardKind = "crate" | "tall" | "banner" | "gap" | "coin" | PowerKind;

export interface Input {
  jumpPressed: boolean;
  jumpDown: boolean;
  slidePressed: boolean;
  slideDown: boolean;
}

export interface Entity {
  active: boolean;
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  prevX: number;
  scored: boolean;
  near: boolean;
  phase: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "dust" | "spark" | "shard";
}

export interface Floater {
  active: boolean;
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  gold: boolean;
}

export interface RunState {
  phase: Phase;
  level: LevelId;
  character: CharacterId;
  cleared: boolean;
  coins: number;
  shield: number;
  magnet: number;
  double: number;
  invincible: number;
  nextPower: number;
  time: number;
  distance: number;
  speed: number;
  speedT: number;
  score: number;
  combo: number;
  comboTime: number;
  maxCombo: number;
  mult: number;
  spawnX: number;
  spawns: number;
  lastPattern: string;
  lastClose: "jump" | "slide" | "gap" | "none";
  rng: number;
  entities: Entity[];
  particles: Particle[];
  floaters: Floater[];
  events: string[];
  scroll: number;
  ground: number;
  viewW: number;
  viewH: number;
  best: number;
  bestDistance: number;
  bestCombo: number;
  newBest: boolean;
  needsSave: boolean;
  trauma: number;
  flash: number;
  landKick: number;
  hitstop: number;
  deadReason: "" | "hit" | "fall";
  note: string;
  dustGate: boolean;
  player: {
    x: number;
    y: number;
    vy: number;
    onGround: boolean;
    sliding: boolean;
    slideTime: number;
    coyote: number;
    jumpBuffer: number;
    slideBuffer: number;
    jumpCut: boolean;
    airTime: number;
    runPhase: number;
    squashX: number;
    squashY: number;
    tumble: number;
    scarf: { x: number; y: number }[];
  };
}

const JUMP_V = -900;
const GRAVITY = 2700;
const SLIDE_DUR = 0.58;
const BUFFER = 0.12;
const COYOTE = 0.11;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function smoother(t: number) {
  return t * t * (3 - 2 * t);
}

export function difficultyOf(distance: number) {
  return clamp(distance / 15000, 0, 1);
}

function speedOf(distance: number) {
  return 390 + smoother(difficultyOf(distance)) * 540;
}

function rand(state: RunState) {
  state.rng = (state.rng * 16807) % 2147483647;
  if (state.rng <= 0) state.rng += 2147483646;
  return state.rng / 2147483647;
}

function emit(state: RunState, name: string) {
  if (state.events.length < 24) state.events.push(name);
}

function makeEntities(): Entity[] {
  return Array.from({ length: 80 }, () => ({
    active: false,
    kind: "crate" as const,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    prevX: 0,
    scored: false,
    near: false,
    phase: 0,
  }));
}

function makeParticles(): Particle[] {
  return Array.from({ length: 100 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 2,
    kind: "dust" as const,
  }));
}

function makeFloaters(): Floater[] {
  return Array.from({ length: 16 }, () => ({
    active: false,
    x: 0,
    y: 0,
    text: "",
    life: 0,
    max: 1,
    gold: false,
  }));
}

export function createRun(saved?: {
  best?: number;
  bestDistance?: number;
  bestCombo?: number;
}): RunState {
  const viewH = 540;
  const ground = viewH - GROUND_PAD;
  const state: RunState = {
    phase: "menu",
    level: "lantern",
    character: "chilan",
    cleared: false,
    coins: 0,
    shield: 0,
    magnet: 0,
    double: 0,
    invincible: 0,
    nextPower: 2,
    time: 0,
    distance: 0,
    speed: 390,
    speedT: 0,
    score: 0,
    combo: 0,
    comboTime: 0,
    maxCombo: 0,
    mult: 1,
    spawnX: VIEW_W + 280,
    spawns: 0,
    lastPattern: "",
    lastClose: "none",
    rng: 1234567,
    entities: makeEntities(),
    particles: makeParticles(),
    floaters: makeFloaters(),
    events: [],
    scroll: 0,
    ground,
    viewW: VIEW_W,
    viewH,
    best: saved?.best ?? 0,
    bestDistance: saved?.bestDistance ?? 0,
    bestCombo: saved?.bestCombo ?? 0,
    newBest: false,
    needsSave: false,
    trauma: 0,
    flash: 0,
    landKick: 0,
    hitstop: 0,
    deadReason: "",
    note: "",
    dustGate: false,
    player: {
      x: 196,
      y: ground,
      vy: 0,
      onGround: true,
      sliding: false,
      slideTime: 0,
      coyote: COYOTE,
      jumpBuffer: 0,
      slideBuffer: 0,
      jumpCut: false,
      airTime: 0,
      runPhase: 0,
      squashX: 1,
      squashY: 1,
      tumble: 0,
      scarf: [],
    },
  };
  const neckY = ground - 62;
  for (let i = 0; i < 5; i++) {
    state.player.scarf.push({ x: state.player.x - 16 - i * 12, y: neckY + i * 4 });
  }
  return state;
}

export function applyView(state: RunState, viewW: number, viewH: number) {
  const w = clamp(viewW, 340, 1600);
  const h = clamp(viewH, 460, 1600);
  const street = Math.max(GROUND_PAD, Math.min(h * 0.34, 300));
  const ground = h - street;
  const dy = ground - state.ground;
  state.viewW = w;
  state.viewH = h;
  state.player.x = w * 0.22;
  if (dy === 0) return;
  state.ground = ground;
  state.player.y += dy;
  for (const e of state.entities) if (e.active) e.y += dy;
  for (const p of state.particles) if (p.active) p.y += dy;
  for (const f of state.floaters) if (f.active) f.y += dy;
  for (const s of state.player.scarf) s.y += dy;
}

export function tryConvertToSlide(state: RunState) {
  if (state.phase !== "play") return false;
  const p = state.player;
  if (!p.sliding && p.airTime <= 0.14 && p.y >= state.ground - 40) {
    p.vy = 0;
    p.y = state.ground;
    p.onGround = true;
    p.coyote = 0.11;
    p.airTime = 0;
    p.jumpBuffer = 0;
    p.sliding = true;
    p.slideTime = SLIDE_DUR;
    p.squashX = 1.22;
    p.squashY = 0.74;
    emit(state, "slide");
    return true;
  }
  return false;
}

export function resetRun(state: RunState) {
  const saved = {
    best: state.best,
    bestDistance: state.bestDistance,
    bestCombo: state.bestCombo,
  };
  const viewH = state.viewH;
  const level = state.level;
  const character = state.character;
  const fresh = createRun(saved);
  fresh.level = level;
  fresh.character = character;
  fresh.viewH = viewH;
  fresh.ground = viewH - GROUND_PAD;
  fresh.player.y = fresh.ground;
  for (const s of fresh.player.scarf) s.y += fresh.ground - (540 - GROUND_PAD);
  Object.assign(state, fresh);
  state.entities = fresh.entities;
  state.particles = fresh.particles;
  state.floaters = fresh.floaters;
  state.events = fresh.events;
  state.player = fresh.player;
}

export function beginRun(state: RunState) {
  resetRun(state);
  state.phase = "play";
  state.speed = speedOf(getLevel(state.level).difficulty * 15000);
  if (state.character === "jinmo") state.shield = 1;
}

function alloc(state: RunState) {
  for (const e of state.entities) {
    if (!e.active) return e;
  }
  return null;
}

function place(state: RunState, kind: HazardKind, x: number, y: number, w: number, h: number) {
  const e = alloc(state);
  if (!e) return;
  e.active = true;
  e.kind = kind;
  e.x = x;
  e.y = y;
  e.w = w;
  e.h = h;
  e.prevX = x;
  e.scored = false;
  e.near = false;
  e.phase = rand(state) * Math.PI * 2;
}

function burst(
  state: RunState,
  x: number,
  y: number,
  kind: Particle["kind"],
  n: number,
  power: number,
) {
  let left = n;
  for (const p of state.particles) {
    if (left <= 0) break;
    if (p.active) continue;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    const a = rand(state) * Math.PI * 2;
    const s = power * (0.4 + rand(state));
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s - power * 0.35;
    p.life = 0.35 + rand(state) * 0.35;
    p.max = p.life;
    p.size = kind === "shard" ? 3 + rand(state) * 4 : 2 + rand(state) * 3;
    left -= 1;
  }
}

function floatText(state: RunState, x: number, y: number, text: string, gold: boolean) {
  for (const f of state.floaters) {
    if (f.active) continue;
    f.active = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.life = 0.7;
    f.max = 0.7;
    f.gold = gold;
    return;
  }
}

function placeCrate(state: RunState, x: number, h: number, kind: "crate" | "tall") {
  const w = kind === "tall" ? 54 : 50;
  place(state, kind, x, state.ground - h, w, h);
  return w;
}

function placeBanner(state: RunState, x: number, speed: number) {
  const w = clamp(speed * 0.15, 86, 148);
  const bottom = state.ground - (42 + rand(state) * 10);
  const top = state.ground - 300;
  place(state, "banner", x, top, w, bottom - top);
  if (rand(state) < 0.75) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      place(state, "coin", x + 18 + i * ((w - 24) / n), state.ground - 30, 20, 20);
    }
  }
  return w;
}

function placeGap(state: RunState, x: number, speed: number) {
  const w = clamp(speed * 0.2, 74, 170);
  place(state, "gap", x, state.ground, w, 90);
  if (rand(state) < 0.6) {
    place(state, "coin", x + w * 0.5, state.ground - 124, 22, 22);
  }
  return w;
}

interface Pattern {
  id: string;
  close: "jump" | "slide" | "gap" | "none";
  weight: (t: number) => number;
  span: (t: number) => number;
  apply: (state: RunState, x0: number, speed: number) => void;
}

const PATTERNS: Pattern[] = [
  {
    id: "low",
    close: "jump",
    weight: (t) => lerp(5, 2, t),
    span: (t) => lerp(1.5, 1.02, t),
    apply(state, x0) {
      const h = 56;
      const w = placeCrate(state, x0, h, "crate");
      if (rand(state) < 0.7) {
        for (let i = 0; i < 3; i++) {
          const cx = x0 + w / 2 + (i - 1) * 34;
          const cy = state.ground - h - 46 - Math.abs(i - 1) * 10;
          place(state, "coin", cx, cy, 20, 20);
        }
      }
    },
  },
  {
    id: "tall",
    close: "jump",
    weight: (t) => (t < 0.18 ? 0 : lerp(0.2, 3, t)),
    span: (t) => lerp(1.55, 1.08, t),
    apply(state, x0) {
      placeCrate(state, x0, 100, "tall");
    },
  },
  {
    id: "banner",
    close: "slide",
    weight: (t) => lerp(1.1, 3.3, t),
    span: (t) => lerp(1.6, 1.08, t),
    apply(state, x0, speed) {
      placeBanner(state, x0, speed);
    },
  },
  {
    id: "gap",
    close: "gap",
    weight: (t) => (t < 0.1 ? 0 : lerp(0.3, 2.5, t)),
    span: (t) => lerp(1.65, 1.16, t),
    apply(state, x0, speed) {
      placeGap(state, x0, speed);
    },
  },
  {
    id: "coins",
    close: "none",
    weight: (t) => lerp(2.4, 0.85, t),
    span: (t) => lerp(1.15, 0.8, t),
    apply(state, x0) {
      const jumpLine = rand(state) < 0.55;
      const y = jumpLine ? state.ground - 118 : state.ground - 42;
      for (let i = 0; i < 5; i++) place(state, "coin", x0 + i * 36, y, 20, 20);
    },
  },
  {
    id: "low-banner",
    close: "slide",
    weight: (t) => (t < 0.32 ? 0 : lerp(0, 2.6, t)),
    span: (t) => 1.1 + lerp(1.35, 1.05, t),
    apply(state, x0, speed) {
      const h = 56;
      const w = placeCrate(state, x0, h, "crate");
      for (let i = 0; i < 3; i++) {
        place(state, "coin", x0 + w / 2 + (i - 1) * 32, state.ground - h - 42, 18, 18);
      }
      placeBanner(state, x0 + 1.1 * speed, speed);
    },
  },
  {
    id: "banner-low",
    close: "jump",
    weight: (t) => (t < 0.38 ? 0 : lerp(0, 2.3, t)),
    span: (t) => 1.08 + lerp(1.4, 1.05, t),
    apply(state, x0, speed) {
      placeBanner(state, x0, speed);
      placeCrate(state, x0 + 1.08 * speed, 58, "crate");
    },
  },
];

function pickPattern(state: RunState, t: number) {
  if (state.spawns === 0) return PATTERNS[0]!;
  let total = 0;
  const weights = PATTERNS.map((p) => {
    let w = p.weight(t);
    if (p.id === state.lastPattern) w *= 0.35;
    if (state.lastClose === "gap" && p.close === "gap") w = 0;
    if (state.lastClose === "slide" && p.id === "banner") w *= 0.45;
    total += w;
    return w;
  });
  let r = rand(state) * total;
  for (let i = 0; i < PATTERNS.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return PATTERNS[i]!;
  }
  return PATTERNS[0]!;
}

function spawnPass(state: RunState) {
  const horizon = state.viewW + state.speed * 1.2;
  let guard = 0;
  while (state.spawnX < horizon && guard < 8) {
    const t = Math.min(1, difficultyOf(state.distance) + getLevel(state.level).difficulty);
    const pattern = pickPattern(state, t);
    pattern.apply(state, state.spawnX, state.speed);
    if (state.spawns >= state.nextPower) {
      const kinds: PowerKind[] = ["shield", "magnet", "double"];
      const kind = kinds[Math.floor(rand(state) * kinds.length)]!;
      place(state, kind, state.spawnX + state.speed * 0.7, state.ground - 66, 28, 28);
      state.nextPower = state.spawns + 3 + Math.floor(rand(state) * 2);
    }
    state.spawnX += pattern.span(t) * state.speed;
    state.lastPattern = pattern.id;
    state.lastClose = pattern.close;
    state.spawns += 1;
    guard += 1;
  }
}

function supportedAt(state: RunState, x: number) {
  for (const e of state.entities) {
    if (!e.active || e.kind !== "gap") continue;
    const left = Math.min(e.x, e.prevX);
    const right = Math.max(e.x + e.w, e.prevX + e.w);
    if (x > left + 4 && x < right - 4) return false;
  }
  return true;
}

function playerBox(state: RunState) {
  const p = state.player;
  if (p.sliding) return { x: p.x - 4, y: p.y - 32, w: 64, h: 30 };
  return { x: p.x - 16, y: p.y - 70, w: 34, h: 68 };
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  inset: number,
) {
  return (
    a.x + inset < b.x + b.w &&
    a.x + a.w - inset > b.x &&
    a.y + inset < b.y + b.h &&
    a.y + a.h - inset > b.y
  );
}

function addCombo(state: RunState, n: number) {
  state.combo += n;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  state.comboTime = state.character === "chilan" ? 3.5 : 2.55;
  state.mult = Math.min(8, 1 + Math.floor(state.combo / 5));
}

function die(state: RunState, reason: "hit" | "fall", note: string) {
  if (state.phase !== "play") return;
  if (state.invincible > 0 || state.shield > 0) {
    if (state.invincible <= 0) {
      state.shield = 0;
      state.invincible = 1.5;
      emit(state, "shield-break");
    }
    if (reason === "fall") {
      state.player.y = state.ground - 120;
      state.player.vy = -550;
      state.player.onGround = false;
    }
    for (const e of state.entities) {
      if (
        e.active &&
        e.x < state.player.x + 100 &&
        e.x + e.w > state.player.x - 80 &&
        e.kind !== "coin"
      )
        e.active = false;
    }
    burst(state, state.player.x, state.player.y - 40, "spark", 16, 210);
    return;
  }
  state.phase = "dead";
  state.deadReason = reason;
  state.note = note;
  state.player.sliding = false;
  state.player.onGround = false;
  state.player.vy = reason === "hit" ? -460 : 40;
  state.player.airTime = 0;
  state.player.tumble = 0;
  state.hitstop = reason === "hit" ? 0.085 : 0.04;
  state.trauma = reason === "hit" ? 0.9 : 0.5;
  state.flash = 1;
  state.player.tumble = 0;
  emit(state, "hit");
  burst(state, state.player.x + 8, state.player.y - 40, "shard", 14, 280);
  burst(state, state.player.x, state.player.y - 20, "spark", 8, 180);
}

function finish(state: RunState) {
  state.phase = "over";
  const score = Math.floor(state.score);
  const meters = Math.floor(state.distance / 48);
  state.newBest = score > state.best;
  if (score > state.best) state.best = score;
  if (meters > state.bestDistance) state.bestDistance = meters;
  if (state.maxCombo > state.bestCombo) state.bestCombo = state.maxCombo;
  state.needsSave = true;
  emit(state, "over");
}

function updateJuice(state: RunState, dt: number) {
  state.trauma = Math.max(0, state.trauma - dt * 1.55);
  state.flash = Math.max(0, state.flash - dt * 3.2);
  state.landKick += (0 - state.landKick) * (1 - Math.exp(-10 * dt));
  const p = state.player;
  const kx = 1 - Math.exp(-14 * dt);
  p.squashX += (1 - p.squashX) * kx;
  p.squashY += (1 - p.squashY) * kx;

  const slide = p.sliding ? 1 : 0;
  const neckX = p.x - 2;
  const neckY = p.y - lerp(62, 22, slide);
  let ax = neckX;
  let ay = neckY;
  const follow = 1 - Math.exp(-11 * dt);
  for (let i = 0; i < p.scarf.length; i++) {
    const s = p.scarf[i]!;
    const tx = ax - 12;
    const ty = ay + 5 + Math.sin(state.time * 7 + i) * 1.5;
    s.x += (tx - s.x) * follow;
    s.y += (ty - s.y) * follow;
    ax = s.x;
    ay = s.y;
  }

  for (const part of state.particles) {
    if (!part.active) continue;
    part.life -= dt;
    if (part.life <= 0) {
      part.active = false;
      continue;
    }
    part.vy += 780 * dt;
    part.x += part.vx * dt;
    part.y += part.vy * dt;
  }
  for (const f of state.floaters) {
    if (!f.active) continue;
    f.life -= dt;
    if (f.life <= 0) {
      f.active = false;
      continue;
    }
    f.y -= 36 * dt;
  }
}

function stepDead(state: RunState, dt: number) {
  const p = state.player;
  if (state.hitstop > 0) {
    state.hitstop -= dt;
    return;
  }
  p.vy = Math.min(1200, p.vy + GRAVITY * dt);
  p.y += p.vy * dt;
  p.tumble += dt * (state.deadReason === "hit" ? 7.5 : 4.2);
  p.airTime += dt;
  state.speed = Math.max(0, state.speed - dt * 780);
  state.scroll += state.speed * dt;
  for (const e of state.entities) {
    if (!e.active) continue;
    e.prevX = e.x;
    e.x -= state.speed * dt;
  }
  for (const part of state.particles) if (part.active) part.x -= state.speed * dt;
  for (const f of state.floaters) if (f.active) f.x -= state.speed * dt;
  if (p.airTime > 0.78) finish(state);
}

export function step(state: RunState, input: Input, dt: number) {
  updateJuice(state, dt);
  state.time += dt;

  if (state.phase === "menu") {
    state.scroll += 80 * dt;
    state.player.runPhase += dt * 8;
    state.player.y = state.ground;
    state.player.onGround = true;
    state.player.vy = 0;
    const pulse = Math.sin(state.player.runPhase);
    if (pulse > 0.95 && !state.dustGate) {
      state.dustGate = true;
      burst(state, state.player.x - 6, state.ground, "dust", 2, 40);
    } else if (pulse < 0.2) state.dustGate = false;
    return;
  }

  if (state.phase === "over") return;
  if (state.phase === "dead") {
    stepDead(state, dt);
    return;
  }

  const p = state.player;
  if (input.jumpPressed) p.jumpBuffer = BUFFER;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  if (input.slidePressed) p.slideBuffer = BUFFER;
  else p.slideBuffer = Math.max(0, p.slideBuffer - dt);

  if (p.sliding) {
    p.slideTime -= dt;
    const standing = { x: p.x - 16, y: p.y - 70, w: 34, h: 68 };
    let blocked = false;
    if (p.slideTime <= 0 && p.slideTime > -0.22) {
      for (const e of state.entities) {
        if (!e.active || e.kind !== "banner") continue;
        if (intersects(standing, e, 4)) {
          blocked = true;
          break;
        }
      }
    }
    if (p.slideTime <= 0 && !blocked) p.sliding = false;
  }

  const groundedNow = p.onGround && (supportedAt(state, p.x - 12) || supportedAt(state, p.x + 10));
  if (p.onGround && !groundedNow) {
    p.onGround = false;
    p.coyote = COYOTE;
    p.sliding = false;
  }

  if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    p.jumpBuffer = 0;
    p.sliding = false;
    p.onGround = false;
    p.coyote = 0;
    p.vy = JUMP_V * (state.character === "qingyu" ? 1.1 : 1);
    p.jumpCut = false;
    p.airTime = 0;
    p.squashX = 0.84;
    p.squashY = 1.16;
    emit(state, "jump");
    burst(state, p.x, state.ground, "dust", 4, 70);
  } else if (p.slideBuffer > 0 && p.onGround && !p.sliding) {
    p.slideBuffer = 0;
    p.sliding = true;
    p.slideTime = SLIDE_DUR;
    p.squashX = 1.22;
    p.squashY = 0.74;
    emit(state, "slide");
    burst(state, p.x + 10, state.ground - 4, "spark", 3, 90);
  }

  if (!input.jumpDown && p.vy < -180 && !p.jumpCut && !p.onGround) {
    p.vy *= 0.75;
    p.jumpCut = true;
  }

  if (!p.onGround) {
    let g = GRAVITY;
    if (input.slideDown && !p.sliding) g += 2300;
    p.vy = Math.min(1200, p.vy + g * dt);
    p.y += p.vy * dt;
    p.coyote = Math.max(0, p.coyote - dt);
    p.airTime += dt;
    if (p.vy >= 0 && p.y >= state.ground) {
      const ok = supportedAt(state, p.x - 12) || supportedAt(state, p.x + 10);
      if (ok) {
        const impact = p.vy;
        p.y = state.ground;
        p.vy = 0;
        p.onGround = true;
        p.airTime = 0;
        p.coyote = COYOTE;
        if (impact > 260) {
          p.squashX = 1.3;
          p.squashY = 0.66;
          state.landKick = Math.min(7, impact * 0.005);
          emit(state, "land");
          burst(state, p.x - 4, state.ground, "dust", 6, 110);
        }
      } else if (p.y > state.ground + 52) {
        die(state, "fall", "gap");
        return;
      }
    }
  } else {
    p.y = state.ground;
    p.vy = 0;
    p.airTime = 0;
    p.coyote = COYOTE;
    p.runPhase += dt * (9 + state.speed * 0.01);
    const pulse = Math.sin(p.runPhase);
    if (!p.sliding && pulse > 0.94 && !state.dustGate) {
      state.dustGate = true;
      burst(state, p.x - 8, state.ground, "dust", 2, 36);
    } else if (pulse < 0.15) state.dustGate = false;
  }

  state.magnet = Math.max(0, state.magnet - dt);
  state.double = Math.max(0, state.double - dt);
  state.invincible = Math.max(0, state.invincible - dt);
  state.speedT = Math.min(1, difficultyOf(state.distance) + getLevel(state.level).difficulty);
  state.speed = speedOf(state.speedT * 15000);

  for (const e of state.entities) {
    if (!e.active) continue;
    e.prevX = e.x;
    e.x -= state.speed * dt;
    if (e.x + e.w < -180) e.active = false;
  }
  for (const part of state.particles) {
    if (part.active) part.x -= state.speed * dt;
  }
  for (const f of state.floaters) {
    if (f.active) f.x -= state.speed * dt;
  }
  state.spawnX -= state.speed * dt;
  state.scroll += state.speed * dt;
  state.distance += state.speed * dt;
  state.score += state.speed * dt * 0.055 * state.mult * (state.double > 0 ? 2 : 1);

  if (state.distance >= getLevel(state.level).target * 48) {
    state.distance = getLevel(state.level).target * 48;
    state.cleared = true;
    state.score += 500 + getLevel(state.level).target * 2;
    finish(state);
    emit(state, "clear");
    return;
  }
  spawnPass(state);

  if (state.phase !== "play") return;

  const box = playerBox(state);
  for (const e of state.entities) {
    if (!e.active || e.kind === "coin" || e.kind === "gap" || isPower(e.kind)) continue;
    const sweptW = e.w + Math.max(0, e.prevX - e.x);
    const solid = { x: e.x, y: e.y, w: sweptW, h: e.h };
    const hit = intersects(box, solid, 5);
    if (!hit) {
      const xOverlap = box.x < solid.x + solid.w && box.x + box.w > solid.x;
      if (xOverlap && (e.kind === "crate" || e.kind === "tall")) {
        const clearance = e.y - p.y;
        if (clearance >= -2 && clearance < 18) e.near = true;
      }
      if (xOverlap && e.kind === "banner" && p.sliding) {
        const playerTop = p.y - 32;
        const bannerBottom = e.y + e.h;
        const clearance = playerTop - bannerBottom;
        if (clearance >= -2 && clearance < 16) e.near = true;
      }
      continue;
    }
    if ((e.kind === "crate" || e.kind === "tall") && p.y <= e.y + 8 && p.vy >= 0) {
      e.near = true;
      continue;
    }
    die(state, "hit", e.kind);
    return;
  }

  for (const e of state.entities) {
    if (!e.active || (e.kind !== "coin" && !isPower(e.kind))) continue;
    if (e.kind === "coin" && state.magnet > 0 && Math.hypot(e.x - p.x, e.y - (p.y - 40)) < 240) {
      const follow = Math.min(1, dt * 12);
      e.x += (p.x - e.x) * follow;
      e.y += (p.y - 40 - e.y) * follow;
    }
    const coin = { x: e.x, y: e.y, w: e.w, h: e.h };
    if (!intersects(box, coin, -4)) continue;
    e.active = false;
    if (isPower(e.kind)) {
      collectPower(state, e.kind);
      continue;
    }
    state.coins += 1;
    addCombo(state, 1);
    const gain = Math.floor(25 * state.mult * (state.double > 0 ? 2 : 1));
    state.score += gain;
    emit(state, "coin");
    floatText(state, e.x, e.y - 8, `+${gain}`, true);
    burst(state, e.x + 8, e.y + 8, "spark", 5, 120);
  }

  for (const e of state.entities) {
    if (!e.active || e.scored || e.kind === "coin" || isPower(e.kind)) continue;
    if (e.x + e.w >= p.x - 6) continue;
    e.scored = true;
    addCombo(state, 1);
    const bonus = Math.floor((e.near ? 40 : 12) * state.mult * (state.double > 0 ? 2 : 1));
    state.score += bonus;
    if (e.near) {
      emit(state, "near");
      floatText(state, p.x + 20, p.y - 86, "擦肩", true);
    }
  }

  if (state.combo > 0) {
    state.comboTime -= dt;
    if (state.comboTime <= 0) {
      if (state.combo >= 6) {
        emit(state, "break");
        floatText(state, p.x + 24, p.y - 96, "连击中断", false);
      }
      state.combo = 0;
      state.mult = 1;
    }
  }
}

export const EMPTY_INPUT: Input = {
  jumpPressed: false,
  jumpDown: false,
  slidePressed: false,
  slideDown: false,
};

export function isPower(kind: HazardKind): kind is PowerKind {
  return kind === "shield" || kind === "magnet" || kind === "double";
}
export function collectPower(state: RunState, kind: PowerKind) {
  if (kind === "shield") state.shield = 1;
  else state[kind] = 8;
  emit(state, "power");
  floatText(state, state.player.x + 20, state.player.y - 110, POWER_LABELS[kind], true);
  burst(state, state.player.x, state.player.y - 40, "spark", 14, 160);
}
