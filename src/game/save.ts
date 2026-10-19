import { CHARACTERS, LEVELS, type CharacterId, type LevelId } from "./content.ts";
export const SAVE_VERSION = 2 as const;
export interface RunRecord {
  id: string;
  name: string;
  score: number;
  distance: number;
  combo: number;
  level: LevelId;
  character: CharacterId;
  cleared: boolean;
  date: string;
}
export interface SaveData {
  version: typeof SAVE_VERSION;
  best: number;
  bestDistance: number;
  bestCombo: number;
  muted: boolean;
  name: string;
  level: LevelId;
  character: CharacterId;
  runs: RunRecord[];
}
const KEY = "chilan-save";
const DEFAULTS: SaveData = {
  version: SAVE_VERSION,
  best: 0,
  bestDistance: 0,
  bestCombo: 0,
  muted: false,
  name: "夜行客",
  level: "lantern",
  character: "chilan",
  runs: [],
};
const natural = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
export function migrate(raw: unknown): SaveData {
  const s = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const runs: RunRecord[] = Array.isArray(s.runs)
    ? s.runs
        .filter(
          (r): r is RunRecord =>
            r &&
            typeof r === "object" &&
            typeof r.id === "string" &&
            typeof r.name === "string" &&
            typeof r.score === "number" &&
            Number.isFinite(r.score) &&
            r.score >= 0 &&
            typeof r.distance === "number" &&
            Number.isFinite(r.distance) &&
            r.distance >= 0 &&
            typeof r.combo === "number" &&
            Number.isFinite(r.combo) &&
            r.combo >= 0 &&
            LEVELS.some((l) => l.id === r.level) &&
            CHARACTERS.some((c) => c.id === r.character) &&
            typeof r.cleared === "boolean" &&
            typeof r.date === "string" &&
            Number.isFinite(Date.parse(r.date)),
        )
        .slice(0, 100)
    : [];
  return {
    version: SAVE_VERSION,
    best: natural(s.best),
    bestDistance: natural(s.bestDistance),
    bestCombo: natural(s.bestCombo),
    muted: s.muted === true,
    name: typeof s.name === "string" && s.name.trim() ? s.name.trim().slice(0, 12) : DEFAULTS.name,
    level: LEVELS.find((l) => l.id === s.level)?.id ?? DEFAULTS.level,
    character: CHARACTERS.find((c) => c.id === s.character)?.id ?? DEFAULTS.character,
    runs,
  };
}
let storageUnavailable = false;
let memory: SaveData = { ...DEFAULTS, runs: [] };
export function loadSave(): SaveData {
  try {
    if (storageUnavailable) return { ...memory, runs: [...memory.runs] };
    const text = localStorage.getItem(KEY);
    if (text) memory = migrate(JSON.parse(text));
  } catch {
    storageUnavailable = true; /* Storage unavailable: retain this session's progress. */
  }
  return { ...memory, runs: [...memory.runs] };
}
export function writeSave(patch: Partial<SaveData>): SaveData {
  const current = loadSave();
  memory = migrate({ ...current, ...patch });
  try {
    localStorage.setItem(`${KEY}.bak`, JSON.stringify(current));
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    storageUnavailable = true; /* Quota/private mode must not prevent play. */
  }
  return { ...memory, runs: [...memory.runs] };
}
export function recordRun(record: RunRecord): SaveData {
  const current = loadSave();
  if (current.runs.some((r) => r.id === record.id)) return current;
  // Keep the best 30 per level, so repeated runs never erase another level's board.
  const all = [...current.runs, record];
  const runs = LEVELS.flatMap((l) =>
    all
      .filter((r) => r.level === l.id)
      .sort((a, b) => b.score - a.score || b.distance - a.distance || b.date.localeCompare(a.date))
      .slice(0, 30),
  );
  return writeSave({
    runs,
    best: Math.max(current.best, record.score),
    bestDistance: Math.max(current.bestDistance, record.distance),
    bestCombo: Math.max(current.bestCombo, record.combo),
  });
}
