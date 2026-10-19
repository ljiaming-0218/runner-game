export const LEVELS = [
  {
    id: "lantern",
    name: "灯市初夜",
    subtitle: "灯火可亲，初试身手",
    target: 200,
    difficulty: 0,
    color: "#e96b3b",
    sky: "#101b2b",
    horizon: "#51342e",
  },
  {
    id: "rain",
    name: "雨巷疾行",
    subtitle: "雨落青瓦，步步惊心",
    target: 350,
    difficulty: 0.22,
    color: "#77c5cf",
    sky: "#101e2b",
    horizon: "#304956",
  },
  {
    id: "dawn",
    name: "云海破晓",
    subtitle: "踏过长夜，追逐晨光",
    target: 500,
    difficulty: 0.42,
    color: "#efbd72",
    sky: "#3d3549",
    horizon: "#c38665",
  },
] as const;
export const CHARACTERS = [
  {
    id: "chilan",
    name: "赤岚",
    title: "追风客",
    description: "连击更从容，连击保持时间延长至 3.5 秒。",
    color: "#e96b3b",
    outfit: "#eee3ce",
    glyph: "岚",
  },
  {
    id: "qingyu",
    name: "青羽",
    title: "飞燕",
    description: "起跳高度提升约 20%，轻巧跨过高箱与断瓦。",
    color: "#7acac6",
    outfit: "#8cbbb8",
    glyph: "羽",
  },
  {
    id: "jinmo",
    name: "金墨",
    title: "守夜人",
    description: "自带一次护盾，抵挡碰撞或从屋脊裂隙中脱险。",
    color: "#e7bf68",
    outfit: "#d8b566",
    glyph: "墨",
  },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];
export type CharacterId = (typeof CHARACTERS)[number]["id"];
export type PowerKind = "shield" | "magnet" | "double";
export const POWER_LABELS: Record<PowerKind, string> = {
  shield: "护盾",
  magnet: "磁吸",
  double: "双倍",
};
export const getLevel = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
