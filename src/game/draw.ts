import type { RunState } from "./sim";

const SKY_TOP = "#121722";
const SKY_HORIZON = "#3c261f";
const PAPER = "#f4efe4";
const INK = "#1a120e";
const CINNABAR = "#e4572e";
const GOLD = "#e7c36a";
const ROOF = "#4a3028";
const ROOF_DARK = "#2a1b18";
const RIDGE = "#c4472e";

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawFrame(ctx: CanvasRenderingContext2D, state: RunState, reduced: boolean) {
  const w = state.viewW;
  const h = state.viewH;
  const ground = state.ground;
  const shake = state.trauma * state.trauma;
  const amp = reduced ? 2.2 : 8;
  const ox = Math.sin(state.time * 53) * amp * shake;
  const oy = Math.cos(state.time * 41) * amp * 0.7 * shake + state.landKick;

  ctx.save();
  ctx.translate(ox, oy);

  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(0.72, "#241c22");
  sky.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -40, w + 40, ground + 40);

  drawMoon(ctx, w, h);
  drawStars(ctx, w, ground);
  drawSkyline(ctx, state, 0.12, "#1a2430", 150, 40);
  drawSkyline(ctx, state, 0.28, "#243240", 116, 18);
  drawMidRoofs(ctx, state);
  drawStreet(ctx, state);
  drawGround(ctx, state);
  drawGaps(ctx, state);
  drawObstacles(ctx, state);
  drawParticles(ctx, state, "back");
  drawPlayer(ctx, state);
  drawParticles(ctx, state, "front");
  drawSpeedLines(ctx, state, reduced);
  drawFloaters(ctx, state);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(244, 239, 228, ${state.flash * 0.55})`;
    ctx.fillRect(-20, -40, w + 40, h + 80);
    ctx.fillStyle = `rgba(228, 87, 46, ${state.flash * 0.18})`;
    ctx.fillRect(-20, -40, w + 40, h + 80);
  }

  ctx.restore();
}

function drawMoon(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const x = w * 0.78;
  const y = Math.min(118, h * 0.16);
  const glow = ctx.createRadialGradient(x, y, 8, x, y, 90);
  glow.addColorStop(0, "rgba(244,239,228,0.55)");
  glow.addColorStop(1, "rgba(244,239,228,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20,23,34,0.18)";
  ctx.beginPath();
  ctx.arc(x + 8, y - 6, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, ground: number) {
  ctx.fillStyle = "rgba(244,239,228,0.75)";
  for (let i = 0; i < 28; i++) {
    const x = hash(i * 3.1) * w;
    const y = hash(i * 5.7) * (ground * 0.55);
    const s = 1 + hash(i * 9.2) * 1.6;
    ctx.globalAlpha = 0.35 + hash(i) * 0.6;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  parallax: number,
  color: string,
  height: number,
  cell: number,
) {
  const ground = state.ground;
  const tile = 168;
  const scroll = state.scroll * parallax;
  const start = Math.floor(scroll / tile) - 1;
  ctx.fillStyle = color;
  for (let i = start; i < start + 10; i++) {
    const x = i * tile - (scroll % tile);
    const n = hash(i + cell);
    const bh = height * (0.45 + n * 0.7);
    const bw = 46 + hash(i + 2 + cell) * 70;
    ctx.fillRect(x, ground - bh - 28, bw, bh);
    if (n > 0.72) {
      const roofH = 22 + hash(i + 4) * 18;
      ctx.beginPath();
      ctx.moveTo(x - 6, ground - bh - 28);
      ctx.lineTo(x + bw / 2, ground - bh - 28 - roofH);
      ctx.lineTo(x + bw + 6, ground - bh - 28);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawMidRoofs(ctx: CanvasRenderingContext2D, state: RunState) {
  const ground = state.ground;
  const tile = 120;
  const scroll = state.scroll * 0.48;
  const start = Math.floor(scroll / tile) - 1;
  for (let i = start; i < start + 14; i++) {
    const x = i * tile - (scroll % tile);
    const n = hash(i + 20);
    const rh = 36 + n * 28;
    ctx.fillStyle = "#2c3844";
    ctx.fillRect(x, ground - rh - 18, 100, rh);
    ctx.fillStyle = GOLD;
    const windows = 2 + Math.floor(n * 3);
    for (let k = 0; k < windows; k++) {
      if (hash(i * 13 + k) < 0.4) continue;
      ctx.globalAlpha = 0.35 + hash(i + k * 3) * 0.55;
      ctx.fillRect(x + 12 + (k % 3) * 26, ground - rh + 8 + Math.floor(k / 3) * 18, 8, 10);
    }
    ctx.globalAlpha = 1;
  }
}

function drawStreet(ctx: CanvasRenderingContext2D, state: RunState) {
  const { viewW, viewH, ground } = state;
  const g = ctx.createLinearGradient(0, ground, 0, viewH);
  g.addColorStop(0, "#120e0c");
  g.addColorStop(1, "#070605");
  ctx.fillStyle = g;
  ctx.fillRect(-30, ground + 18, viewW + 60, viewH - ground + 40);
  const scroll = state.scroll * 1.05;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 140 - scroll * 0.2) % (viewW + 160)) - 40;
    ctx.fillStyle = i % 2 === 0 ? "rgba(228,87,46,0.16)" : "rgba(231,195,106,0.1)";
    ctx.beginPath();
    ctx.ellipse(x, ground + 48 + (i % 3) * 10, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx: CanvasRenderingContext2D, state: RunState) {
  const ground = state.ground;
  const tile = 48;
  const scroll = state.scroll;
  const start = Math.floor(scroll / tile) - 2;
  const cols = Math.ceil(state.viewW / tile) + 4;

  ctx.fillStyle = ROOF_DARK;
  ctx.fillRect(-40, ground + 8, state.viewW + 80, 22);

  for (let i = start; i < start + cols; i++) {
    const x = i * tile - (scroll % tile);
    if (gapAt(state, x + tile / 2)) continue;
    ctx.fillStyle = ROOF;
    ctx.fillRect(x, ground - 16, tile + 1, 26);
    ctx.fillStyle = RIDGE;
    ctx.fillRect(x, ground - 20, tile + 1, 6);
    ctx.strokeStyle = "rgba(26,18,14,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + tile, ground - 16);
    ctx.lineTo(x + tile, ground + 8);
    ctx.stroke();
    ctx.strokeStyle = "rgba(244,239,228,0.08)";
    ctx.beginPath();
    ctx.moveTo(x + 8, ground - 8);
    ctx.lineTo(x + tile - 6, ground - 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-40, ground + 10, state.viewW + 80, 6);
}

function gapAt(state: RunState, x: number) {
  for (const e of state.entities) {
    if (!e.active || e.kind !== "gap") continue;
    if (x > e.x && x < e.x + e.w) return e;
  }
  return null;
}

function drawGaps(ctx: CanvasRenderingContext2D, state: RunState) {
  for (const e of state.entities) {
    if (!e.active || e.kind !== "gap") continue;
    const { x, w } = e;
    const ground = state.ground;
    ctx.fillStyle = "#070605";
    ctx.fillRect(x, ground - 18, w, state.viewH - ground + 30);
    const glow = ctx.createLinearGradient(0, ground, 0, ground + 80);
    glow.addColorStop(0, "rgba(228,87,46,0.0)");
    glow.addColorStop(0.4, "rgba(228,87,46,0.18)");
    glow.addColorStop(1, "rgba(228,87,46,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x, ground, w, 80);

    ctx.fillStyle = ROOF_DARK;
    ctx.beginPath();
    ctx.moveTo(x - 8, ground - 20);
    ctx.lineTo(x + 10, ground - 8);
    ctx.lineTo(x + 4, ground + 8);
    ctx.lineTo(x - 14, ground + 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w + 8, ground - 20);
    ctx.lineTo(x + w - 12, ground - 6);
    ctx.lineTo(x + w - 2, ground + 10);
    ctx.lineTo(x + w + 12, ground + 4);
    ctx.closePath();
    ctx.fill();
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, state: RunState) {
  for (const e of state.entities) {
    if (!e.active) continue;
    if (e.kind === "crate" || e.kind === "tall") drawCrate(ctx, e.x, e.y, e.w, e.h, e.kind === "tall");
    else if (e.kind === "banner") drawBanner(ctx, e.x, e.y, e.w, e.h, state.time + e.phase);
    else if (e.kind === "coin") drawCoin(ctx, e.x + e.w / 2, e.y + e.h / 2 + Math.sin(state.time * 5 + e.phase) * 4, state.time + e.phase);
  }
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tall: boolean,
) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 4, w * 0.42, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(x, y, x + w, y);
  body.addColorStop(0, "#8a3d32");
  body.addColorStop(0.45, "#6e2c26");
  body.addColorStop(1, "#4d1e1b");
  ctx.fillStyle = body;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = "rgba(244,239,228,0.14)";
  ctx.fillRect(x + 6, y + 6, 5, h - 14);

  if (tall) {
    ctx.strokeStyle = "rgba(244,239,228,0.25)";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h * 0.48);
    ctx.lineTo(x + w - 4, y + h * 0.48);
    ctx.stroke();
  }

  ctx.fillStyle = GOLD;
  ctx.fillRect(x + w / 2 - 4, y + h / 2 - 4, 8, 8);
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
) {
  const bottom = y + h;
  ctx.strokeStyle = "#2a241c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 8);
  ctx.lineTo(x + w + 18, y + 10);
  ctx.stroke();

  ctx.fillStyle = "#1a120e";
  ctx.fillRect(x, y, w, 8);

  const fold = Math.sin(t * 6) * 2;
  ctx.fillStyle = CINNABAR;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x + w, y + 6);
  ctx.lineTo(x + w - 4, bottom + fold);
  ctx.quadraticCurveTo(x + w / 2, bottom - 10 + fold, x + 4, bottom - fold);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#9d2e24";
  const strips = 4;
  for (let i = 1; i < strips; i++) {
    const sx = x + (w / strips) * i;
    ctx.fillRect(sx, y + 8, 2, h - 16);
  }
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, bottom - 10, w, 4);
  ctx.fillStyle = "rgba(244,239,228,0.18)";
  ctx.fillRect(x + 6, y + 16, w * 0.18, h * 0.45);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2) * 0.15);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a8832e";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a4e16";
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: RunState) {
  const p = state.player;
  const sliding = p.sliding;
  const airborne = !p.onGround;
  const dead = state.phase === "dead" || (state.phase === "over" && p.tumble > 0.01);
  const swing = sliding || airborne || dead ? 0 : Math.sin(p.runPhase);

  ctx.save();
  drawScarf(ctx, p.scarf);
  ctx.translate(p.x, p.y + (dead ? 0 : Math.abs(Math.cos(p.runPhase)) * -2));

  const lift = airborne ? clampLift(p.vy) : 0;
  if (!dead && !sliding) ctx.scale(p.squashX, p.squashY);
  if (sliding) ctx.rotate(-1.02);
  if (dead) ctx.rotate(Math.min(1.4, p.tumble));

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(4, state.ground - p.y, sliding ? 30 : 18 + Math.max(0, 16 - (state.ground - p.y) * 0.08), 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const hip = sliding ? -16 : -34;
  const kneeBend = airborne ? 0.9 : 0.45;
  drawLeg(ctx, -2, hip, swing * 0.7, kneeBend, true);
  drawLeg(ctx, 4, hip, -swing * 0.75, kneeBend, false);

  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(-14, hip + 2);
  ctx.lineTo(-18, -60);
  ctx.quadraticCurveTo(-4, -68, 12, -58);
  ctx.lineTo(18, hip + 4);
  ctx.quadraticCurveTo(2, hip + 12, -14, hip + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = CINNABAR;
  ctx.fillRect(-6, -52, 14, 5);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-2, -44, 6, 8);

  const arm = airborne ? -0.8 : -swing * 0.8;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, -54);
  ctx.lineTo(16 + arm * 10, -38 + arm * 8);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-6, -52);
  ctx.lineTo(-16 - arm * 8, -34);
  ctx.stroke();

  ctx.fillStyle = "#e8b892";
  ctx.beginPath();
  ctx.arc(2, -74 + lift, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(1, -80 + lift, 13, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10, -80 + lift, 22, 8);
  ctx.fillStyle = CINNABAR;
  ctx.fillRect(8, -78 + lift, 12, 3);

  ctx.fillStyle = INK;
  ctx.fillRect(6, -76 + lift, 5, 1.6);

  ctx.restore();
}

function clampLift(vy: number) {
  return Math.max(-4, Math.min(4, -vy * 0.004));
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  hip: number,
  swing: number,
  bend: number,
  back: boolean,
) {
  const kneeX = x + Math.sin(swing) * 14;
  const kneeY = hip + 18;
  const footX = kneeX + Math.sin(swing + bend) * 12;
  const footY = kneeY + 16 - Math.cos(swing) * 2;
  ctx.strokeStyle = back ? "#2a241f" : "#3a312b";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, hip);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
  ctx.fillStyle = CINNABAR;
  roundRect(ctx, footX - 7, footY - 3, 14, 6, 2);
  ctx.fill();
}

function drawScarf(ctx: CanvasRenderingContext2D, scarf: { x: number; y: number }[]) {
  if (scarf.length === 0) return;
  ctx.strokeStyle = CINNABAR;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(scarf[0]!.x + 14, scarf[0]!.y - 6);
  for (const s of scarf) ctx.lineTo(s.x, s.y);
  ctx.stroke();
  ctx.strokeStyle = "#9d2f22";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: RunState, band: "back" | "front") {
  for (const p of state.particles) {
    if (!p.active) continue;
    const front = p.kind !== "dust";
    if (band === "front" && !front) continue;
    if (band === "back" && front) continue;
    const alpha = Math.max(0, p.life / p.max);
    ctx.globalAlpha = alpha;
    if (p.kind === "dust") ctx.fillStyle = "#cbbba4";
    else if (p.kind === "spark") ctx.fillStyle = GOLD;
    else ctx.fillStyle = p.size > 5 ? CINNABAR : PAPER;
    ctx.fillRect(p.x, p.y, p.size, p.size * (p.kind === "shard" ? 1.4 : 1));
  }
  ctx.globalAlpha = 1;
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, state: RunState, reduced: boolean) {
  if (reduced || state.speedT < 0.25 || state.phase === "menu") return;
  const n = Math.floor(4 + state.speedT * 8);
  ctx.strokeStyle = `rgba(244,239,228,${0.08 + state.speedT * 0.12})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const y = hash(i + 4) * (state.ground - 40) + 20;
    const span = 30 + hash(i + 8) * 70;
    const x = ((hash(i + 2) * state.viewW + state.scroll * (1.4 + state.speedT)) % (state.viewW + 120)) - 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - span, y);
    ctx.stroke();
  }
}

function drawFloaters(ctx: CanvasRenderingContext2D, state: RunState) {
  ctx.textAlign = "center";
  ctx.font = "700 16px 'Noto Sans SC', 'WenQuanYi Zen Hei', sans-serif";
  for (const f of state.floaters) {
    if (!f.active) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.gold ? GOLD : PAPER;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
