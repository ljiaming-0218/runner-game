import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrate, loadSave, recordRun, writeSave, type RunRecord } from "./save.ts";
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  },
  configurable: true,
});
function record(id: string, score: number, level: RunRecord["level"] = "lantern"): RunRecord {
  return {
    id,
    name: "夜行客",
    score,
    distance: 20,
    combo: 4,
    level,
    character: "chilan",
    cleared: false,
    date: "2026-10-20T10:00:00.000Z",
  };
}
beforeEach(() => {
  values.clear();
  values.set("chilan-save", JSON.stringify({ best: 0 }));
});
describe("save compatibility and leaderboard integrity", () => {
  it("upgrades version one without losing personal bests", () => {
    const s = migrate({ version: 1, best: 200, bestDistance: 30, bestCombo: 9, muted: true });
    assert.equal(s.version, 2);
    assert.equal(s.best, 200);
    assert.deepEqual(s.runs, []);
    assert.equal(s.muted, true);
  });
  it("rejects invalid stats, identities and malformed records", () => {
    const s = migrate({
      best: Infinity,
      bestDistance: NaN,
      level: "bad",
      character: "bad",
      runs: [record("valid", 20), { score: 1000 }, record("bad", Infinity)],
    });
    assert.equal(s.best, 0);
    assert.equal(s.level, "lantern");
    assert.equal(s.runs.length, 1);
  });
  it("saves a result once, ranks by actual score and retains separate level boards", () => {
    recordRun(record("1", 100));
    recordRun(record("2", 400));
    recordRun(record("1", 999));
    recordRun(record("3", 200, "rain"));
    const s = loadSave();
    assert.equal(s.runs.length, 3);
    assert.equal(s.best, 400);
    assert.equal(s.runs[0]?.id, "2");
    assert.equal(s.runs.filter((r) => r.level === "rain").length, 1);
  });
  it("retains best 30 runs per level, preserving other levels", () => {
    recordRun(record("rain", 100, "rain"));
    for (let i = 0; i < 40; i++) recordRun(record(String(i), i));
    const s = loadSave();
    assert.equal(s.runs.filter((r) => r.level === "lantern").length, 30);
    assert.equal(s.runs[0]?.score, 39);
    assert.ok(s.runs.some((r) => r.id === "rain"));
  });
  it("remembers setup without resetting scores", () => {
    recordRun(record("a", 200));
    writeSave({ character: "qingyu", name: "阿岚" });
    assert.equal(loadSave().best, 200);
    assert.equal(loadSave().character, "qingyu");
  });
});
