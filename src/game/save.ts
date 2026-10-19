export const SAVE_VERSION = 1 as const;

export interface SaveData {
  version: typeof SAVE_VERSION;
  best: number;
  bestDistance: number;
  bestCombo: number;
  muted: boolean;
}

const KEY = "chilan-save";

const DEFAULTS: SaveData = {
  version: SAVE_VERSION,
  best: 0,
  bestDistance: 0,
  bestCombo: 0,
  muted: false,
};

function migrate(raw: unknown): SaveData {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next: SaveData = {
    ...DEFAULTS,
    best: typeof source.best === "number" && source.best > 0 ? Math.floor(source.best) : 0,
    bestDistance:
      typeof source.bestDistance === "number" && source.bestDistance > 0
        ? Math.floor(source.bestDistance)
        : 0,
    bestCombo:
      typeof source.bestCombo === "number" && source.bestCombo > 0
        ? Math.floor(source.bestCombo)
        : 0,
    muted: source.muted === true,
    version: SAVE_VERSION,
  };
  return next;
}

export function loadSave(): SaveData {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { ...DEFAULTS };
    return migrate(JSON.parse(text) as unknown);
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(patch: Partial<SaveData>): SaveData {
  const current = loadSave();
  const next: SaveData = { ...current, ...patch, version: SAVE_VERSION };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.setItem(`${KEY}.bak`, JSON.stringify(current));
  } catch {
    // private mode / quota — keep playing in memory
  }
  return next;
}
