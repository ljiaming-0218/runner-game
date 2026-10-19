import { ArrowDown, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GameController, type Hud } from "@/game/controller";

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
};

function formatScore(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameController | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new GameController(canvas, setHud);
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const filled = Math.round(hud.speedT * 5);

  return (
    <div className="game-root relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="font-sans text-xs tracking-widest text-muted">分数</p>
            <p className="font-display text-2xl leading-none text-fg md:text-3xl">{formatScore(hud.score)}</p>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={i < filled ? "h-1 w-4 bg-primary" : "h-1 w-4 bg-border"}
                />
              ))}
            </div>
          </div>

          <div className="min-w-24 text-center">
            {hud.combo > 0 ? (
              <div key={hud.combo} className="combo-pop">
                <p className="font-sans text-xs tracking-widest text-accent">连击</p>
                <p className="font-display text-2xl leading-none text-accent md:text-3xl">
                  {hud.combo}
                  <span className="ml-1 text-lg">×{hud.mult}</span>
                </p>
              </div>
            ) : (
              <p className="font-sans text-xs text-muted">{hud.recording ? "新纪录" : "夜奔"}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <div className="text-right">
              <p className="font-sans text-xs tracking-widest text-muted">最高</p>
              <p className="font-display text-2xl leading-none text-fg">{formatScore(hud.best)}</p>
              <p className="mt-1 font-sans text-xs text-muted">{hud.distance} 米</p>
            </div>
            <button
              type="button"
              className="pointer-events-auto flex size-11 items-center justify-center border border-border bg-surface text-fg"
              onClick={() => gameRef.current?.toggleMute()}
              aria-label={hud.muted ? "打开声音" : "关闭声音"}
            >
              {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          </div>
        </header>

        <div className="flex flex-1 items-end justify-start md:items-center md:justify-end md:pr-12">
          {hud.phase === "menu" ? <Menu best={hud.best} onStart={() => gameRef.current?.begin()} /> : null}
          {hud.phase === "over" ? (
            <GameOver hud={hud} onRestart={() => gameRef.current?.begin()} />
          ) : null}
          {hud.paused && hud.phase === "play" ? (
            <PauseCard onResume={() => gameRef.current?.pressJump()} />
          ) : null}
        </div>

        <footer className="dock pointer-events-none flex items-end justify-between gap-3 px-4 pt-3">
          <p className="hidden pb-3 font-sans text-sm text-muted md:block">
            空格跳跃 · ↓ 滑行 · Esc 暂停
          </p>
          {hud.phase === "play" && !hud.paused ? (
            <div className="pointer-events-auto ml-auto flex gap-3">
              <ControlButton
                label="滑行"
                icon={<ArrowDown className="size-5" />}
                onDown={() => gameRef.current?.pressSlide()}
                onUp={() => gameRef.current?.releaseSlide()}
              />
              <ControlButton
                label="跳跃"
                icon={<Play className="size-5" />}
                primary
                onDown={() => gameRef.current?.pressJump()}
                onUp={() => gameRef.current?.releaseJump()}
              />
            </div>
          ) : (
            <span />
          )}
        </footer>
      </div>
    </div>
  );
}

function Menu({ best, onStart }: { best: number; onStart: () => void }) {
  return (
    <section className="panel sheet-in pointer-events-auto mx-4 mb-3 w-full max-w-md p-5 backdrop-blur-md md:mx-0 md:mb-0 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center bg-primary font-display text-xl text-fg">
          奔
        </span>
        <div>
          <h1 className="font-display text-5xl leading-none text-fg">赤岚</h1>
          <p className="mt-1 font-sans text-sm tracking-widest text-accent">夜奔屋脊</p>
        </div>
      </div>
      <p className="max-w-sm font-sans text-base leading-relaxed text-muted">
        跳过箱笼，滑过横幡，跃过断瓦。跑得越远，夜风越急，障碍越密。
      </p>
      <p className="mt-4 font-sans text-sm text-muted">
        最高纪录 <span className="font-display text-xl text-fg">{formatScore(best)}</span>
      </p>
      <button
        type="button"
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-primary font-sans text-base text-fg"
        onClick={onStart}
      >
        <Play className="size-5" />
        出发
      </button>
      <p className="mt-3 font-sans text-xs leading-relaxed text-muted">
        点击或空格跳跃，向下滑或按 ↓ 滑行。擦肩而过会叠连击。
      </p>
    </section>
  );
}

function GameOver({ hud, onRestart }: { hud: Hud; onRestart: () => void }) {
  return (
    <section className="panel sheet-in pointer-events-auto mx-4 mb-3 w-full max-w-md p-5 backdrop-blur-md md:mx-0 md:mb-0 md:p-6">
      <p className="font-sans text-xs tracking-widest text-primary">失足</p>
      <h2 className="mt-1 font-display text-4xl leading-none text-fg">
        {hud.newBest ? "新纪录" : "夜色未尽"}
      </h2>
      <p className="mt-4 font-display text-6xl leading-none text-accent">{formatScore(hud.score)}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 font-sans">
        <div>
          <dt className="text-xs text-muted">距离</dt>
          <dd className="mt-1 text-lg text-fg">{hud.distance} 米</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">最高连击</dt>
          <dd className="mt-1 text-lg text-fg">{hud.maxCombo}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">纪录</dt>
          <dd className="mt-1 text-lg text-fg">{formatScore(hud.best)}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-primary font-sans text-base text-fg"
        onClick={onRestart}
      >
        <RotateCcw className="size-5" />
        再跑一次
      </button>
    </section>
  );
}

function PauseCard({ onResume }: { onResume: () => void }) {
  return (
    <section className="panel sheet-in pointer-events-auto mx-auto mb-8 w-fit px-6 py-5 text-center backdrop-blur-md">
      <h2 className="font-display text-3xl text-fg">已暂停</h2>
      <button
        type="button"
        className="mt-4 flex h-12 items-center justify-center bg-primary px-6 font-sans text-fg"
        onClick={onResume}
      >
        继续
      </button>
    </section>
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
      className={
        primary
          ? "flex h-14 min-w-28 items-center justify-center gap-2 bg-primary px-4 font-sans text-base text-fg"
          : "flex h-14 min-w-28 items-center justify-center gap-2 border border-border bg-surface px-4 font-sans text-base text-fg"
      }
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDown();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        onUp();
      }}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      aria-label={label}
    >
      {icon}
      {label}
    </button>
  );
}
