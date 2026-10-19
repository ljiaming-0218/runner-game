import { Sfx } from "./audio";
import { drawFrame } from "./draw";
import { loadSave, writeSave } from "./save";
import {
  STEP,
  applyView,
  beginRun,
  createRun,
  step,
  tryConvertToSlide,
  type Input,
  type Phase,
  type RunState,
} from "./sim";

export interface Hud {
  phase: Phase;
  score: number;
  best: number;
  distance: number;
  combo: number;
  mult: number;
  maxCombo: number;
  newBest: boolean;
  muted: boolean;
  paused: boolean;
  speedT: number;
  recording: boolean;
}

type Probe = {
  phase: Phase;
  score: number;
  distance: number;
  combo: number;
  paused: boolean;
  start: () => void;
  jump: () => void;
  slide: () => void;
  kill: () => void;
};

export class GameController {
  readonly state: RunState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sfx = new Sfx();
  private onHud: (hud: Hud) => void;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private stopped = false;
  private paused = false;
  private reduced = false;
  private jumpEdge = false;
  private slideEdge = false;
  private jumpDown = false;
  private slideDown = false;
  private lastEmit = 0;
  private lastCombo = 0;
  private lastPhase: Phase = "menu";
  private pointerId: number | null = null;
  private pointerY = 0;
  private converted = false;

  constructor(canvas: HTMLCanvasElement, onHud: (hud: Hud) => void) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建画布");
    this.canvas = canvas;
    this.ctx = ctx;
    this.onHud = onHud;
    const saved = loadSave();
    this.state = createRun(saved);
    this.sfx.muted = saved.muted;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  start() {
    this.last = performance.now();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onHide);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.resize();
    this.emit(true);
    this.raf = requestAnimationFrame(this.frame);
    const probe: Probe = {
      phase: this.state.phase,
      score: 0,
      distance: 0,
      combo: 0,
      paused: false,
      start: () => this.begin(),
      jump: () => this.pressJump(),
      slide: () => this.pressSlide(),
      kill: () => this.kill(),
    };
    Object.defineProperties(probe, {
      phase: { get: () => this.state.phase },
      score: { get: () => Math.floor(this.state.score) },
      distance: { get: () => this.state.distance },
      combo: { get: () => this.state.combo },
      paused: { get: () => this.paused },
    });
    (window as unknown as { __runner?: Probe }).__runner = probe;
  }

  destroy() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onHide);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    const w = window as unknown as { __runner?: Probe };
    if (w.__runner) delete w.__runner;
  }

  begin() {
    this.sfx.unlock();
    this.paused = false;
    this.acc = 0;
    beginRun(this.state);
    this.resize();
    this.emit(true);
  }

  pressJump() {
    this.sfx.unlock();
    if (this.state.phase === "menu" || this.state.phase === "over") {
      this.begin();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.emit(true);
      return;
    }
    if (this.state.phase !== "play") return;
    this.jumpEdge = true;
    this.jumpDown = true;
  }

  releaseJump() {
    this.jumpDown = false;
  }

  pressSlide() {
    this.sfx.unlock();
    if (this.state.phase === "menu" || this.state.phase === "over") {
      this.begin();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.emit(true);
      return;
    }
    if (this.state.phase !== "play") return;
    this.slideEdge = true;
    this.slideDown = true;
  }

  releaseSlide() {
    this.slideDown = false;
  }

  toggleMute() {
    this.sfx.unlock();
    const muted = !this.sfx.muted;
    this.sfx.setMuted(muted);
    writeSave({ muted });
    this.emit(true);
  }

  private kill() {
    if (this.state.phase !== "play") this.begin();
    this.state.phase = "play";
    this.state.player.y = this.state.ground;
    this.state.player.onGround = true;
    // Force a crate into the player.
    const e = this.state.entities.find((item) => !item.active) ?? this.state.entities[0];
    if (!e) return;
    e.active = true;
    e.kind = "crate";
    e.x = this.state.player.x - 10;
    e.y = this.state.ground - 56;
    e.w = 50;
    e.h = 56;
    e.prevX = e.x;
    e.scored = false;
    e.near = false;
  }

  private frame = (now: number) => {
    if (this.stopped) return;
    const raw = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.resize();
    const running = this.state.phase !== "play" || !this.paused;
    if (running) {
      this.acc += raw;
      let guard = 0;
      while (this.acc >= STEP && guard < 5) {
        step(this.state, this.consume(), STEP);
        this.acc -= STEP;
        guard += 1;
        this.playEvents();
      }
      if (guard >= 5) this.acc = 0;
    } else {
      this.acc = 0;
    }
    this.sfx.music(raw, this.state.speedT, this.state.phase === "play" && !this.paused);
    this.draw();
    this.emit(false);
    this.raf = requestAnimationFrame(this.frame);
  };

  private consume(): Input {
    const input: Input = {
      jumpPressed: this.jumpEdge,
      jumpDown: this.jumpDown,
      slidePressed: this.slideEdge,
      slideDown: this.slideDown,
    };
    this.jumpEdge = false;
    this.slideEdge = false;
    return input;
  }

  private playEvents() {
    for (const event of this.state.events) {
      if (event === "jump") this.sfx.jump();
      else if (event === "land") this.sfx.land();
      else if (event === "slide") this.sfx.slide();
      else if (event === "coin") this.sfx.coin(this.state.combo);
      else if (event === "near") this.sfx.near();
      else if (event === "hit") this.sfx.hit();
      else if (event === "over") this.emit(true);
    }
    this.state.events.length = 0;
    if (this.state.needsSave) {
      writeSave({
        best: this.state.best,
        bestDistance: this.state.bestDistance,
        bestCombo: this.state.bestCombo,
        muted: this.sfx.muted,
      });
      this.state.needsSave = false;
      this.emit(true);
    }
  }

  private emit(force: boolean) {
    const now = performance.now();
    const phaseChanged = this.state.phase !== this.lastPhase;
    const comboChanged = this.state.combo !== this.lastCombo;
    if (!force && !phaseChanged && !comboChanged && now - this.lastEmit < 100) return;
    this.lastEmit = now;
    this.lastPhase = this.state.phase;
    this.lastCombo = this.state.combo;
    const score = Math.floor(this.state.score);
    this.onHud({
      phase: this.state.phase,
      score,
      best: this.state.best,
      distance: Math.floor(this.state.distance / 48),
      combo: this.state.combo,
      mult: this.state.mult,
      maxCombo: this.state.maxCombo,
      newBest: this.state.newBest,
      muted: this.sfx.muted,
      paused: this.paused,
      speedT: this.state.speedT,
      recording: this.state.phase === "play" && score > this.state.best,
    });
  }

  private resize() {
    const canvas = this.canvas;
    const cssW = canvas.clientWidth || 960;
    const cssH = canvas.clientHeight || 540;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.max(1, Math.floor(cssW * dpr));
    const bh = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const target = Math.max(72, Math.min(120, Math.min(cssW, cssH) * 0.16));
    const viewW = (78 / target) * cssW;
    const viewH = viewW * (cssH / Math.max(1, cssW));
    applyView(this.state, viewW, viewH);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = cssW / this.state.viewW;
    const worldH = this.state.viewH * scale;
    const offsetY = Math.max(0, (cssH - worldH) / 2);
    const offsetX = Math.max(0, (cssW - this.state.viewW * scale) / 2);
    this.ctx.fillStyle = "#121722";
    this.ctx.fillRect(0, 0, cssW, cssH);
    this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  }

  private draw() {
    drawFrame(this.ctx, this.state, this.reduced);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const jump = event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW";
    const slide = event.code === "ArrowDown" || event.code === "KeyS";
    if (!jump && !slide && event.code !== "KeyM" && event.code !== "Escape") return;
    event.preventDefault();
    this.sfx.unlock();
    if (event.code === "KeyM") {
      this.toggleMute();
      return;
    }
    if (event.code === "Escape" && this.state.phase === "play") {
      this.paused = !this.paused;
      this.emit(true);
      return;
    }
    if (this.state.phase === "menu" || this.state.phase === "over") {
      if (jump || slide) this.begin();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.emit(true);
      return;
    }
    if (jump) {
      this.jumpEdge = true;
      this.jumpDown = true;
    }
    if (slide) {
      this.slideEdge = true;
      this.slideDown = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") this.jumpDown = false;
    if (event.code === "ArrowDown" || event.code === "KeyS") this.slideDown = false;
  };

  private onBlur = () => {
    this.jumpDown = false;
    this.slideDown = false;
    this.jumpEdge = false;
    this.slideEdge = false;
  };

  private onHide = () => {
    this.sfx.resume();
    if (document.hidden && this.state.phase === "play") {
      this.paused = true;
      this.onBlur();
      this.emit(true);
    }
  };

  private onPointerDown = (event: PointerEvent) => {
    this.sfx.unlock();
    if (this.state.phase === "menu" || this.state.phase === "over") {
      this.begin();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.emit(true);
      return;
    }
    if (this.state.phase !== "play") return;
    this.pointerId = event.pointerId;
    this.pointerY = event.clientY;
    this.converted = false;
    this.canvas.setPointerCapture(event.pointerId);
    this.jumpEdge = true;
    this.jumpDown = true;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.pointerId !== event.pointerId || this.converted) return;
    if (event.clientY - this.pointerY > 42) {
      this.converted = true;
      this.jumpDown = false;
      tryConvertToSlide(this.state);
      this.slideEdge = true;
      this.slideDown = true;
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    this.jumpDown = false;
    this.slideDown = false;
  };
}
