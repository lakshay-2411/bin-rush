"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { SubmitResponse } from "@/lib/api-types";
import { BIN_META } from "@/lib/client/bins";
import { BADGES_BY_ID, starsFor } from "@/lib/game/progress";
import type { RoundSummary } from "@/lib/game/scoring";
import { BinBuddy } from "./BinBuddy";
import { FlameIcon, StarIcon, TrophyIcon } from "./icons";
import { Card, PageShell, primaryButton, secondaryButton } from "./ui";

function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const HEADLINES = ["Keep practising!", "Nice work!", "Great segregating!", "Perfect round!"];

function Reveal({ children, delay, className = "" }: { children: ReactNode; delay: number; className?: string }) {
  return (
    <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

const CONFETTI = [
  "top-6 left-6 size-3 rounded-full bg-hazardous",
  "top-16 right-8 h-1.5 w-3.5 rotate-[30deg] rounded-sm bg-wet",
  "top-36 left-10 size-2.5 rotate-[20deg] rounded-[3px] bg-dry",
  "top-4 right-28 size-2 rounded-full bg-accent",
  "top-28 right-16 size-2 rounded-full bg-star",
];

/**
 * Results screen. Rewards land in sequence: stars → score counts up → XP fills → badges pop → streak → mistakes.
 * `server` is the server's verified result for a daily round; practice rounds don't have one.
 */
export function Results({
  summary,
  server,
  mode,
  banner,
  onPlayAgain,
}: {
  summary: RoundSummary;
  server?: SubmitResponse | null;
  mode: "daily" | "practice";
  banner?: ReactNode;
  onPlayAgain?: () => void;
}) {
  const score = useCountUp(server?.score ?? summary.score);
  const stars = starsFor(summary.accuracy);
  const mistakes = summary.results.filter((r) => r.outcome !== "correct");

  const leveledUp = server ? server.levelAfter.level > server.levelBefore.level : false;
  const xpFrom = server && !leveledUp ? server.levelBefore.xpIntoLevel / server.levelBefore.xpForNext : 0;
  const xpTo = server ? server.levelAfter.xpIntoLevel / server.levelAfter.xpForNext : 0;

  const facts = [
    `${pct(summary.accuracy)} right`,
    `${summary.maxCombo} combo`,
    mode === "daily" ? (summary.bossCorrect ? "boss beaten" : "boss missed") : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <div className="pointer-events-none relative" aria-hidden>
        {CONFETTI.map((c) => (
          <span key={c} className={`absolute animate-pop ${c}`} />
        ))}
      </div>

      {banner}

      <section className="flex flex-col items-center gap-1.5 pt-2 text-center">
        <div className="flex items-end gap-1.5" role="img" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="animate-pop" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
              <StarIcon size={i === 1 ? 58 : 44} className={i < stars ? "text-star" : "text-line"} />
            </span>
          ))}
        </div>
        <span className="text-lg font-semibold">{HEADLINES[stars]}</span>
        <span className="text-6xl leading-none font-bold tabular-nums">{score}</span>
        <span className="text-muted">
          {facts.join(" · ")}
          {mode === "practice" && " · practice"}
        </span>
      </section>

      {server && (
        <Reveal delay={1.2}>
          <Card className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold">
                {leveledUp ? `Level up! You're level ${server.levelAfter.level}` : `Level ${server.levelAfter.level} · ${server.levelAfter.title}`}
              </span>
              <span className="rounded-full bg-wet-soft px-2.5 py-1 font-bold text-[#0C6B41]">+{server.xp.total} XP</span>
            </div>
            <div className="h-4 rounded-lg bg-track p-[3px]">
              <div
                className="h-full animate-xp-fill rounded-[5px] bg-wet"
                style={{ "--xp-from": pct(xpFrom), "--xp-to": pct(xpTo), animationDelay: "1.4s" } as CSSProperties}
              />
            </div>
            <span className="text-xs text-muted">
              {server.xp.base} from score
              {server.xp.accuracyBonus > 0 && ` · +${server.xp.accuracyBonus} accuracy`}
              {server.xp.streakBonus > 0 && ` · +${server.xp.streakBonus} streak`}
            </span>
          </Card>
        </Reveal>
      )}

      {server && (
        <Reveal delay={2} className="grid grid-cols-2 gap-3">
          {server.newBadges.length > 0 ? (
            server.newBadges.slice(0, 1).map((id) => {
              const badge = BADGES_BY_ID.get(id);
              return (
                <Card key={id} className="flex flex-col items-center gap-1.5 text-center">
                  <span className="flex size-15 animate-pop items-center justify-center rounded-full bg-accent text-white shadow-[0_5px_0_var(--color-accent-dark)] [animation-delay:2.2s]">
                    <TrophyIcon size={30} />
                  </span>
                  <span className="font-bold">{badge?.name}</span>
                  <span className="text-[13px] text-muted">
                    New badge{server.newBadges.length > 1 && ` · +${server.newBadges.length - 1} more`}
                  </span>
                </Card>
              );
            })
          ) : (
            <Card className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex size-15 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                <TrophyIcon size={30} />
              </span>
              <span className="font-bold">Best {server.maxCombo} combo</span>
              <span className="text-[13px] text-muted">Keep it going</span>
            </Card>
          )}
          <Card className="flex flex-col items-center gap-1.5 text-center">
            <span className="flex size-15 animate-pop items-center justify-center rounded-full bg-hazardous text-white shadow-[0_5px_0_var(--color-hazardous-dark)] [animation-delay:2.4s]">
              <FlameIcon size={30} />
            </span>
            <span className="font-bold">{server.streak.current}-day streak</span>
            <span className="text-[13px] text-muted">See you tomorrow</span>
          </Card>
        </Reveal>
      )}

      {mode === "practice" && (
        <p className="text-center text-sm text-muted">Practice rounds don&apos;t earn XP or count for your streak.</p>
      )}

      <Reveal delay={server ? 2.8 : 0.8}>
        <Card className="flex flex-col gap-3">
          <span className="text-[17px] font-semibold">
            {mistakes.length ? "Your buddies want you to know" : "No mistakes. Your buddies are proud!"}
          </span>
          {mistakes.map((r) => {
            const meta = BIN_META[r.item.bin];
            return (
              <div key={r.item.id} className="flex items-start gap-3">
                <BinBuddy bin={r.item.bin} mood={r.item.bin === "hazardous" ? "worried" : "happy"} size={46} className="shrink-0" />
                <div className={`flex flex-col gap-1 rounded-[4px_16px_16px_16px] ${meta.soft} px-3 py-2.5`}>
                  <span className="font-bold">
                    <span aria-hidden>{r.item.icon} </span>
                    {r.outcome === "missed" ? `You missed ${r.item.name}. It was mine!` : `${r.item.name} was mine!`}
                    {r.isBoss && <span className="ml-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] text-white">BOSS</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {r.answer.bin ? `You picked ${BIN_META[r.answer.bin].label} · ` : ""}It goes in{" "}
                    <span className={`font-bold ${meta.text}`}>{meta.label}</span>
                  </span>
                  <span className="text-sm leading-snug text-[#3D3868]">{r.item.explanation}</span>
                  {r.item.note && <span className="text-xs italic text-muted">{r.item.note}</span>}
                </div>
              </div>
            );
          })}
          {summary.unseen.length > 0 && (
            <p className="text-sm text-muted">
              Time ran out before {summary.unseen.length} item{summary.unseen.length > 1 ? "s" : ""}. Be quicker to see the
              whole set!
            </p>
          )}
        </Card>
      </Reveal>

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {mode === "daily" ? (
          <Link href="/leaderboard" className={primaryButton}>
            See the leaderboard
          </Link>
        ) : (
          <button type="button" onClick={onPlayAgain} className={primaryButton}>
            Play again
          </button>
        )}
        <Link href="/" className={secondaryButton}>
          Back home
        </Link>
      </div>
    </PageShell>
  );
}
