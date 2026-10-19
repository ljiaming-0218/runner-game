import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Flag,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GameController, type Hud } from "@/game/controller";
import {
  CHARACTERS,
  LEVELS,
  getCharacter,
  getLevel,
  type CharacterId,
  type LevelId,
} from "@/game/content";
import { loadSave, writeSave, type RunRecord } from "@/game/save";

const INITIAL: Hud = {
  phase: "menu",
  score: 0,
  best: 0,
  distance: 0,
  combo: 0,
  mult: 1,
  maxCombo: 0,
  newBest: false,
  muted: false,
  paused: false,
  speedT: 0,
  recording: false,
  level: "lantern",
  character: "chilan",
  cleared: false,
  coins: 0,
  shield: 0,
  magnet: 0,
  double: 0,
  records: [],
};
const number = new Intl.NumberFormat("zh-CN");
type Tab = "levels" | "characters" | "leaderboard";
const TABS: { id: Tab; name: string }[] = [
  { id: "levels", name: "关卡" },
  { id: "characters", name: "角色" },
  { id: "leaderboard", name: "排行" },
];

export function RunnerGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<GameController | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL);
  const [tab, setTab] = useState<Tab>("levels");
  const [name, setName] = useState("夜行客");
  useEffect(() => {
    if (!canvas.current) return;
    const game = new GameController(canvas.current, setHud);
    controller.current = game;
    setName(loadSave().name);
    game.start();
    return () => {
      game.destroy();
      controller.current = null;
    };
  }, []);
  const level = getLevel(hud.level);
  const character = getCharacter(hud.character);
  const inMenu = hud.phase === "menu";
  const playing = hud.phase === "play";
  const configure = (levelId: LevelId, characterId: CharacterId) =>
    controller.current?.configure(levelId, characterId);
  return (
    <div className={`game-root theme-${hud.level} ${inMenu ? "is-menu" : ""}`}>
      <canvas ref={canvas} className="game-canvas" aria-label="屋脊跑酷游戏画面" />
      <header className="topbar">
        <button
          className="seal"
          aria-label={inMenu ? "赤岚主页" : "打开暂停菜单"}
          onClick={() => {
            if (inMenu) return;
            controller.current?.togglePause();
          }}
        >
          赤<span>岚</span>
        </button>
        {inMenu ? (
          <span className="topbar-note">长夜漫漫，步履不停。</span>
        ) : (
          <div className="scoreboard">
            <span>
              分数 <strong>{number.format(hud.score)}</strong>
            </span>
            <span className="secondary-stat">
              最高 <b>{number.format(hud.best)}</b>
            </span>
          </div>
        )}
        <div className="top-actions">
          <button
            className="icon-button"
            aria-label={hud.muted ? "打开声音" : "关闭声音"}
            title="声音 · M"
            onClick={() => controller.current?.toggleMute()}
          >
            {hud.muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            className="icon-button"
            aria-label={inMenu ? "查看排行榜" : "暂停游戏"}
            onClick={() => (inMenu ? setTab("leaderboard") : controller.current?.togglePause())}
          >
            {inMenu ? <Trophy /> : <Pause />}
          </button>
        </div>
      </header>

      {inMenu ? (
        <main className="menu-layout">
          <section className="menu-intro sheet-in">
            <h1>赤岚</h1>
            <h2>
              <span />
              夜奔屋脊
              <span />
            </h2>
            <p className="intro-copy">穿过灯火，奔向天明。</p>
            <button className="start-button" onClick={() => controller.current?.begin()}>
              出发 <ChevronRight size={21} />
            </button>
            <p className="recent-score">
              最高纪录 <strong>{number.format(hud.best)}</strong>
            </p>
          </section>
          <section className="journey-panel sheet-in" aria-label="今夜行程">
            <div className="panel-heading">
              <h2>今夜行程</h2>
              <span>{getCharacter(hud.character).title}</span>
            </div>
            <div className="journey-tabs" role="tablist" aria-label="行程设置">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div
              className="tab-content"
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "levels" ? (
                <div className="level-list">
                  {LEVELS.map((l, i) => (
                    <button
                      key={l.id}
                      className={`level-row ${hud.level === l.id ? "selected" : ""}`}
                      aria-pressed={hud.level === l.id}
                      onClick={() => configure(l.id, hud.character)}
                    >
                      <span className={`level-art art-${l.id}`}>
                        <span>0{i + 1}</span>
                      </span>
                      <span className="level-description">
                        <strong>{l.name}</strong>
                        <span>
                          {l.target} 米 <i>{i === 0 ? "初行" : i === 1 ? "进阶" : "挑战"}</i>
                        </span>
                      </span>
                      <span className="selection-mark">
                        {hud.level === l.id ? <Check size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {tab === "characters" ? (
                <div className="character-list">
                  {CHARACTERS.map((c) => (
                    <button
                      key={c.id}
                      className={`character-row ${hud.character === c.id ? "selected" : ""}`}
                      aria-pressed={hud.character === c.id}
                      onClick={() => configure(hud.level, c.id)}
                    >
                      <span className={`character-portrait portrait-${c.id}`} aria-hidden="true" />
                      <span>
                        <strong>
                          {c.name}
                          <small>{c.title}</small>
                        </strong>
                        <span>{c.description}</span>
                      </span>
                      {hud.character === c.id ? <Check size={17} /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {tab === "leaderboard" ? (
                <Leaderboard
                  records={hud.records}
                  level={hud.level}
                  onLevel={(id) => configure(id, hud.character)}
                />
              ) : null}
            </div>
            {tab === "leaderboard" ? (
              <label className="player-name">
                上榜名号
                <input
                  aria-label="上榜名号"
                  maxLength={12}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    writeSave({ name: e.target.value });
                  }}
                  onBlur={() => setName(loadSave().name)}
                />
              </label>
            ) : (
              <div className="power-legend">
                <span title="抵挡一次碰撞或坠落">
                  <Shield />
                  护盾
                </span>
                <span title="自动吸取附近铜钱，持续 8 秒">
                  <Magnet />
                  磁吸
                </span>
                <span title="所有局内得分翻倍，持续 8 秒">
                  <Sparkles />
                  双倍
                </span>
              </div>
            )}
            <p className="panel-caption">
              {tab === "characters"
                ? `已选 ${character.name} · ${level.name}`
                : tab === "leaderboard"
                  ? "成绩仅保存在此浏览器，不与其他设备同步。"
                  : "拾取途中道具，助你穿越长夜。"}
            </p>
          </section>
        </main>
      ) : null}

      {playing ? (
        <>
          <section className="run-progress" aria-label="关卡进度">
            <div>
              <span>
                <Flag size={13} />
                {level.name}
              </span>
              <span>
                {hud.distance} / {level.target} 米
              </span>
            </div>
            <progress max={level.target} value={hud.distance} />
          </section>
          <div className="run-effects" aria-live="polite">
            {hud.shield > 0 ? (
              <span className="effect shield">
                <Shield size={15} />
                护盾 ×1
              </span>
            ) : null}
            {hud.magnet > 0 ? (
              <span className="effect magnet">
                <Magnet size={15} />
                磁吸 {Math.ceil(hud.magnet)}s
              </span>
            ) : null}
            {hud.double > 0 ? (
              <span className="effect double">
                <Sparkles size={15} />
                双倍 {Math.ceil(hud.double)}s
              </span>
            ) : null}
          </div>
          {hud.combo > 1 ? (
            <div className="combo-meter" key={hud.mult}>
              <strong>{hud.combo}</strong> 连击 <span>×{hud.mult}</span>
            </div>
          ) : null}
          {hud.paused ? (
            <div className="modal-backdrop">
              <section className="result-panel sheet-in" aria-label="已暂停">
                <span className="result-symbol">
                  <Pause />
                </span>
                <h2>歇一歇，再出发</h2>
                <p>风还在等你，今夜的旅程尚未结束。</p>
                <button className="start-button" onClick={() => controller.current?.togglePause()}>
                  <Play size={18} />
                  继续夜奔
                </button>
                <button className="text-button" onClick={() => controller.current?.menu()}>
                  返回行程
                </button>
              </section>
            </div>
          ) : null}
        </>
      ) : null}
      {hud.phase === "over" ? (
        <div className="modal-backdrop">
          <section className="result-panel sheet-in" aria-label="本局结算">
            <span className="result-symbol">{hud.cleared ? <Flag /> : <RotateCcw />}</span>
            <h2>{hud.cleared ? "此程已过，天光在前" : hud.newBest ? "长夜新纪录" : "夜色未尽"}</h2>
            <p>
              {hud.cleared
                ? `${level.name} · 通关奖励 +${500 + level.target * 2}`
                : "每一次出发，都比上一次更远。"}
            </p>
            <strong className="result-score">{number.format(hud.score)}</strong>
            <span className="result-score-label">本局得分 · 已记入本机排行</span>
            <dl className="result-stats">
              <div>
                <dt>距离</dt>
                <dd>
                  {hud.distance}
                  <small> 米</small>
                </dd>
              </div>
              <div>
                <dt>铜钱</dt>
                <dd>{hud.coins}</dd>
              </div>
              <div>
                <dt>最高连击</dt>
                <dd>{hud.maxCombo}</dd>
              </div>
            </dl>
            <button
              className="start-button"
              onClick={() => {
                if (hud.cleared) {
                  const next =
                    LEVELS[(LEVELS.findIndex((l) => l.id === hud.level) + 1) % LEVELS.length]!;
                  configure(next.id, hud.character);
                }
                controller.current?.begin();
              }}
            >
              {hud.cleared ? "奔赴下一程" : "再跑一次"}
              <ChevronRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                controller.current?.menu();
                setTab("leaderboard");
              }}
            >
              查看排行与行程
            </button>
          </section>
        </div>
      ) : null}
      <footer className={`game-footer ${playing ? "in-play" : ""}`}>
        <p className="keyboard-hints">
          <kbd>空格</kbd> 跳跃 <span>/</span> <kbd>↓</kbd> 滑行 <span>/</span> <kbd>Esc</kbd> 暂停
        </p>
        <p className="touch-hint">轻点跳跃 · 下滑滑行 · 长按跳得更高</p>
        {playing && !hud.paused ? (
          <div className="touch-controls">
            <ControlButton
              label="滑行"
              icon={<ArrowDown />}
              onDown={() => controller.current?.pressSlide()}
              onUp={() => controller.current?.releaseSlide()}
            />
            <ControlButton
              label="跳跃"
              primary
              icon={<ArrowUp />}
              onDown={() => controller.current?.pressJump()}
              onUp={() => controller.current?.releaseJump()}
            />
          </div>
        ) : null}
      </footer>
    </div>
  );
}

function Leaderboard({
  records,
  level,
  onLevel,
}: {
  records: RunRecord[];
  level: LevelId;
  onLevel: (id: LevelId) => void;
}) {
  const rows = records
    .filter((r) => r.level === level)
    .sort((a, b) => b.score - a.score || b.distance - a.distance)
    .slice(0, 5);
  return (
    <div className="leaderboard">
      <div className="board-heading">
        <span>本机排行</span>
        <select
          aria-label="排行榜关卡"
          value={level}
          onChange={(e) => onLevel(e.target.value as LevelId)}
        >
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      {rows.length ? (
        <ol>
          {rows.map((r, i) => (
            <li key={r.id}>
              <span className={`rank rank-${i}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="rank-player">
                <strong>{r.name}</strong>
                <small>
                  {getCharacter(r.character).name} · {r.distance} 米{r.cleared ? " · 通关" : ""}
                </small>
              </span>
              <strong className="rank-score">{number.format(r.score)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-board">
          <Trophy />
          <strong>今夜，等你留名</strong>
          <p>完成一局，写下你的第一条纪录。</p>
        </div>
      )}
    </div>
  );
}
function ControlButton({
  label,
  icon,
  primary,
  onDown,
  onUp,
}: {
  label: string;
  icon: ReactNode;
  primary?: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      className={`touch-control ${primary ? "primary" : ""}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp();
      }}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          onDown();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUp();
        }
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
