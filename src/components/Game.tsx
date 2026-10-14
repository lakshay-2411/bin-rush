"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { BIN_META, KEY_TO_BIN } from "@/lib/client/bins";
import { BinBuddy, type BuddyMood } from "./BinBuddy";
import { StarIcon } from "./icons";
import {
  applyAnswer,
  comboMultiplier,
  COUNTDOWN_SECONDS,
  fallTimeMs,
  initialRoundState,
  ROUND_MS,
  summarize,
  type Outcome,
  type RoundState,
  type RoundSummary,
} from "@/lib/game/scoring";
import { BINS, type Answer, type Bin, type DailySet } from "@/lib/game/types";
import { MIN_ANSWER_MS } from "@/lib/game/validate";

interface Feedback {
  id: number;
  outcome: Outcome;
  points: number;
  itemName: string;
  correctBin: Bin;
  chosenBin: Bin | null;
}

const SWIPE_THRESHOLD_PX = 30;

export function Game({
  set,
  onFinish,
  onLeave,
}: {
  set: DailySet;
  onFinish: (answers: Answer[], summary: RoundSummary) => void;
  /**
   * Daily rounds only. When set, refreshing or closing mid-round shows the browser's "Leave page?"
   * prompt, and if the player leaves anyway this receives the answers given so far.
   */
  onLeave?: (answers: Answer[]) => void;
}) {
  const [phase, setPhase] = useState<"countdown" | "playing">("countdown");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [index, setIndex] = useState(0);
  const [hud, setHud] = useState<RoundState>(initialRoundState);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Mutable game state lives in refs so the animation loop never works with stale values.
  const indexRef = useRef(0);
  const startRef = useRef(0);
  const spawnRef = useRef(0);
  const stateRef = useRef<RoundState>(initialRoundState());
  const answersRef = useRef<Answer[]>([]);
  const doneRef = useRef(false);
  const feedbackIdRef = useRef(0);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);

  // ----- Countdown -----
  useEffect(() => {
    if (phase !== "countdown") return;
    let remaining = COUNTDOWN_SECONDS;
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(id);
        const now = performance.now();
        startRef.current = now;
        spawnRef.current = now;
        setPhase("playing");
      } else {
        setCount(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onFinish(answersRef.current, summarize(stateRef.current, set));
  }, [onFinish, set]);

  /** Record an answer (or a miss when bin is null) for the current item and spawn the next one. */
  const record = useCallback(
    (bin: Bin | null, ms: number) => {
      if (doneRef.current) return;
      const i = indexRef.current;
      const item = set.items[i];
      const answer: Answer = { itemId: item.id, bin, ms: Math.round(ms) };
      const { state, result } = applyAnswer(stateRef.current, set, answer);
      stateRef.current = state;
      answersRef.current.push(answer);
      setHud(state);

      const id = ++feedbackIdRef.current;
      setFeedback({
        id,
        outcome: result.outcome,
        points: result.points,
        itemName: item.name,
        correctBin: item.bin,
        chosenBin: bin,
      });
      setTimeout(() => setFeedback((f) => (f?.id === id ? null : f)), 1100);

      const next = i + 1;
      indexRef.current = next;
      spawnRef.current = performance.now();
      if (next >= set.items.length) finish();
      else setIndex(next);
    },
    [set, finish],
  );

  const answer = useCallback(
    (bin: Bin) => {
      if (phase !== "playing" || doneRef.current) return;
      const i = indexRef.current;
      const ms = performance.now() - spawnRef.current;
      if (ms < MIN_ANSWER_MS) return; // ignore accidental double inputs; the server rejects these anyway
      record(bin, Math.min(ms, fallTimeMs(i, i === set.bossIndex)));
    },
    [phase, record, set],
  );

  // ----- Animation loop: timer, falling item, misses -----
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const tick = () => {
      if (doneRef.current) return;
      const now = performance.now();
      const elapsed = now - startRef.current;
      if (timerRef.current) {
        timerRef.current.style.transform = `scaleX(${Math.max(0, 1 - elapsed / ROUND_MS)})`;
      }
      if (secondsRef.current) {
        secondsRef.current.textContent = `${Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000))}s`;
      }
      if (elapsed >= ROUND_MS) {
        finish(); // the item on screen when time runs out counts as unseen
        return;
      }
      const i = indexRef.current;
      const fall = fallTimeMs(i, i === set.bossIndex);
      const progress = Math.max(0, (now - spawnRef.current) / fall);
      if (progress >= 1) record(null, fall);
      else itemRef.current?.style.setProperty("--p", String(progress));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, finish, record, set]);

  // ----- Leaving mid-round (daily round only) -----
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);
  const guardLeave = Boolean(onLeave);

  useEffect(() => {
    if (!guardLeave) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (doneRef.current) return;
      e.preventDefault();
      e.returnValue = ""; // older browsers need this to show the prompt
    };
    // pagehide fires only once the page is really going away (not when the prompt is cancelled).
    const onPageHide = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onLeaveRef.current?.(answersRef.current);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [guardLeave]);

  // ----- Keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const bin = KEY_TO_BIN[e.key];
      if (!bin) return;
      e.preventDefault();
      answer(bin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  // ----- Swipe -----
  const onPointerDown = (e: PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) answer(dx < 0 ? "wet" : "hazardous");
    else if (dy > 0) answer("dry");
  };

  const item = set.items[index];
  const isBoss = index === set.bossIndex;
  const boss = set.bossIndex >= 0 ? set.items[set.bossIndex] : null;
  const multiplier = comboMultiplier(hud.combo);

  const moodFor = (bin: Bin): BuddyMood => {
    if (!feedback) return "open";
    if (feedback.outcome === "correct") return feedback.chosenBin === bin ? "cheer" : "open";
    if (feedback.chosenBin === bin) return "worried";
    return "open";
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col select-none">
      {/* Timer */}
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="flex h-11 min-w-11 items-center justify-center rounded-[14px] bg-white px-2 text-sm font-bold tabular-nums shadow-chunky-sm">
          {Math.min(index + 1, set.items.length)}/{set.items.length}
        </span>
        <div className="h-5 flex-1 rounded-[10px] bg-white p-1 shadow-chunky-sm">
          <div ref={timerRef} className="h-full origin-left rounded-md bg-accent" />
        </div>
        <span ref={secondsRef} className="min-w-9 text-right text-lg font-bold tabular-nums">
          60s
        </span>
      </div>

      {/* HUD */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted">Score</span>
          <span className="text-3xl leading-none font-bold tabular-nums">{hud.score}</span>
        </div>
        {hud.combo > 0 && (
          <span
            key={hud.combo}
            className="flex animate-pop items-center gap-1.5 rounded-full bg-flame-soft px-3.5 py-2 font-bold text-flame"
          >
            <StarIcon size={18} />
            {hud.combo} combo{multiplier > 1 && ` · ×${multiplier}`}
          </span>
        )}
      </div>

      {/* Play field */}
      <div
        className="relative flex-1 touch-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeRef.current = null)}
      >
        {phase === "countdown" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div key={count} className="animate-pop text-8xl font-bold text-accent">
              {count}
            </div>
            {boss ? (
              <div className="flex flex-col items-center gap-2 text-muted">
                <span className="text-sm font-semibold">Watch out for the mystery guest</span>
                <span className="flex size-20 items-center justify-center rounded-full border-[3px] border-dashed border-[#B9B3F0] text-4xl">
                  <span className="brightness-0" aria-hidden>
                    {boss.icon}
                  </span>
                </span>
              </div>
            ) : (
              <div className="text-muted">{set.items.length} items · at least one for each bin</div>
            )}
          </div>
        ) : (
          <>
            {feedback && feedback.outcome !== "correct" && (
              <div
                key={`flash-${feedback.id}`}
                className={`pointer-events-none absolute inset-0 animate-flash ${
                  feedback.outcome === "wrong" ? "bg-hazardous" : "bg-muted"
                }`}
              />
            )}

            {item && (
              <div
                key={index}
                ref={itemRef}
                className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
                style={{ top: `calc(var(--p, 0) * (100% - ${isBoss ? 13 : 11}rem))` }}
              >
                {isBoss && (
                  <span className="rounded-full bg-ink px-3 py-0.5 text-xs font-bold tracking-wide text-white">
                    MYSTERY GUEST
                  </span>
                )}
                <span
                  className={`flex items-center justify-center rounded-full bg-white leading-none shadow-chunky ${
                    isBoss ? "size-32 text-7xl ring-4 ring-star" : "size-28 text-6xl"
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span className="max-w-[16rem] rounded-xl bg-ink px-3.5 py-1.5 text-center font-semibold text-white">
                  {item.name}
                </span>
              </div>
            )}

            {feedback && (
              <div
                key={`fb-${feedback.id}`}
                className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4"
              >
                {feedback.outcome === "correct" ? (
                  <span className="animate-float-up rounded-2xl bg-wet px-3.5 py-1.5 text-xl font-bold text-white shadow-[0_4px_0_var(--color-wet-dark)]">
                    +{feedback.points}
                  </span>
                ) : (
                  <span
                    className={`rounded-2xl bg-white px-3.5 py-2 text-center font-semibold shadow-chunky-sm ${
                      feedback.outcome === "wrong" ? "animate-shake" : ""
                    }`}
                  >
                    {feedback.outcome === "wrong" ? (
                      <span className="text-[#B4480A]">{feedback.points} · </span>
                    ) : (
                      <span className="text-muted">Missed · </span>
                    )}
                    {feedback.itemName} goes in{" "}
                    <span className={BIN_META[feedback.correctBin].text}>{BIN_META[feedback.correctBin].label}</span>
                  </span>
                )}
              </div>
            )}

            {phase === "playing" && index === 0 && !feedback && (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-muted">
                Tap a buddy or swipe the item
              </p>
            )}
          </>
        )}
      </div>

      {/* Bin buddies */}
      <div className="grid grid-cols-3 items-end gap-2 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {BINS.map((bin) => {
          const meta = BIN_META[bin];
          const highlighted = feedback !== null && feedback.outcome !== "correct" && feedback.correctBin === bin;
          const cheering = feedback?.outcome === "correct" && feedback.chosenBin === bin;
          return (
            <button
              key={bin}
              type="button"
              onClick={() => answer(bin)}
              aria-label={`${meta.label} bin`}
              className="flex min-h-11 flex-col items-center gap-0.5 rounded-3xl pb-1 font-bold transition active:scale-95"
            >
              <span key={cheering ? `cheer-${feedback?.id}` : "idle"} className={cheering ? "animate-bounce-soft" : ""}>
                <BinBuddy bin={bin} mood={moodFor(bin)} size={highlighted ? 104 : 92} glow={highlighted} />
              </span>
              <span>{meta.label}</span>
              <span className="hidden text-xs font-medium text-muted sm:block">{meta.keyHint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
