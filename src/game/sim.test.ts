import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  beginRun,
  createRun,
  step,
  STEP,
  EMPTY_INPUT,
  collectPower,
  applyView,
  type RunState,
} from "./sim.ts";
import { LEVELS } from "./content.ts";
function run() {
  const s = createRun();
  beginRun(s);
  return s;
}
function collide(s: RunState) {
  const e = s.entities[0]!;
  Object.assign(e, {
    active: true,
    kind: "crate",
    x: s.player.x - 10,
    prevX: s.player.x - 10,
    y: s.ground - 56,
    w: 50,
    h: 56,
  });
}
describe("game progression and abilities", () => {
  it("each selected level has its own pace and a reachable finish that records once", () => {
    for (const level of LEVELS) {
      const s = createRun();
      s.level = level.id;
      beginRun(s);
      s.distance = level.target * 48 - 1;
      step(s, EMPTY_INPUT, STEP);
      assert.equal(s.phase, "over");
      assert.equal(s.cleared, true);
      assert.equal(s.distance, level.target * 48);
      assert.equal(s.needsSave, true);
      const score = s.score;
      step(s, EMPTY_INPUT, STEP);
      assert.equal(s.score, score);
    }
  });
  it("character and level survive restart, gold starts with a shield", () => {
    const s = createRun();
    s.level = "rain";
    s.character = "jinmo";
    beginRun(s);
    assert.equal(s.level, "rain");
    assert.equal(s.character, "jinmo");
    assert.equal(s.shield, 1);
    assert.ok(s.speed > 390);
  });
  it("Qingyu jumps higher than Chilan", () => {
    const a = run(),
      b = run();
    b.character = "qingyu";
    for (const s of [a, b]) step(s, { ...EMPTY_INPUT, jumpPressed: true, jumpDown: true }, STEP);
    assert.ok(b.player.vy < a.player.vy);
  });
  it("a shield absorbs a real obstacle and the next unprotected collision ends the run", () => {
    const s = run();
    collectPower(s, "shield");
    collide(s);
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.phase, "play");
    assert.equal(s.shield, 0);
    assert.ok(s.invincible > 0);
    s.invincible = 0;
    collide(s);
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.phase, "dead");
  });
  it("a shield rescues a fall", () => {
    const s = run();
    s.shield = 1;
    s.player.onGround = false;
    s.player.y = s.ground + 70;
    s.player.vy = 300;
    Object.assign(s.entities[0]!, {
      active: true,
      kind: "gap",
      x: s.player.x - 100,
      prevX: s.player.x - 100,
      y: s.ground,
      w: 200,
      h: 90,
    });
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.phase, "play");
    assert.equal(s.shield, 0);
    assert.ok(s.player.y < s.ground);
  });
  it("powerups are collectible rather than lethal and expire after eight seconds", () => {
    const s = run();
    Object.assign(s.entities[0]!, {
      active: true,
      kind: "double",
      x: s.player.x,
      prevX: s.player.x,
      y: s.ground - 50,
      w: 28,
      h: 28,
    });
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.phase, "play");
    assert.equal(s.double, 8);
    s.double = 0.01;
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.double, 0);
  });
  it("double affects distance points and coin pickup", () => {
    const a = run(),
      b = run();
    b.double = 8;
    for (const s of [a, b]) {
      Object.assign(s.entities[0]!, {
        active: true,
        kind: "coin",
        x: s.player.x,
        y: s.ground - 45,
        w: 20,
        h: 20,
      });
      step(s, EMPTY_INPUT, STEP);
    }
    assert.equal(a.coins, 1);
    assert.equal(b.coins, 1);
    assert.equal(b.score, a.score * 2);
  });
  it("magnet draws nearby coins into the character without counting them as hazards", () => {
    const s = run();
    s.magnet = 8;
    Object.assign(s.entities[0]!, {
      active: true,
      kind: "coin",
      x: s.player.x + 100,
      y: s.ground - 170,
      w: 20,
      h: 20,
    });
    for (let i = 0; i < 30; i++) step(s, EMPTY_INPUT, STEP);
    assert.equal(s.coins, 1);
    assert.equal(s.phase, "play");
  });
  it("all three powerups are spawned over successive obstacle patterns", () => {
    const s = run();
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      s.spawnX = 0;
      step(s, EMPTY_INPUT, STEP);
      for (const e of s.entities) {
        if (["shield", "magnet", "double"].includes(e.kind) && e.active) seen.add(e.kind);
        e.active = false;
      }
    }
    assert.deepEqual([...seen].sort(), ["double", "magnet", "shield"]);
  });
  it("resize keeps player and entities aligned to the roof", () => {
    const s = run();
    applyView(s, 390, 844);
    assert.equal(s.player.y, s.ground);
    step(s, EMPTY_INPUT, STEP);
    assert.equal(s.player.y, s.ground);
  });
});
