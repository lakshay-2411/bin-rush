"use client";

import Link from "next/link";
import { useState } from "react";
import { Game } from "@/components/Game";
import { Results } from "@/components/Results";
import { BinBuddy } from "@/components/BinBuddy";
import { BossTeaser, Card, primaryButton, RoundIntro, secondaryButton } from "@/components/ui";
import type { SubmitResponse } from "@/lib/api-types";
import { api, ApiRequestError } from "@/lib/client/api";
import { dailySet } from "@/lib/game/dailySet";
import { localDateString } from "@/lib/game/dates";
import type { RoundSummary } from "@/lib/game/scoring";
import type { Answer, DailySet } from "@/lib/game/types";

type Phase =
  | { name: "intro"; error?: string }
  | { name: "starting" }
  | { name: "blocked"; message: string }
  | { name: "playing"; date: string; set: DailySet }
  | { name: "submitting"; summary: RoundSummary }
  | { name: "results"; summary: RoundSummary; server: SubmitResponse | null; error?: string; retry?: () => void };

async function submitRound(
  date: string,
  answers: Answer[],
  summary: RoundSummary,
  setPhase: (phase: Phase) => void,
): Promise<void> {
  setPhase({ name: "submitting", summary });
  try {
    const server = await api<SubmitResponse>("/api/round/submit", { date, answers });
    setPhase({ name: "results", summary, server });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save your round.";
    // Only offer a retry for network/server errors; a rejected round won't succeed on retry.
    const canRetry = !(e instanceof ApiRequestError) || e.status >= 500;
    setPhase({
      name: "results",
      summary,
      server: null,
      error: message,
      retry: canRetry ? () => void submitRound(date, answers, summary, setPhase) : undefined,
    });
  }
}

export default function PlayPage() {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });

  const start = async () => {
    // The round belongs to the local date it started on, even if it crosses midnight.
    const date = localDateString();
    setPhase({ name: "starting" });
    try {
      await api("/api/round/start", { date });
      setPhase({ name: "playing", date, set: dailySet(date) });
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 409) setPhase({ name: "blocked", message: e.message });
      else setPhase({ name: "intro", error: e instanceof Error ? e.message : "Could not start the round." });
    }
  };


  if (phase.name === "playing") {
    const { date, set } = phase;
    return <Game set={set} onFinish={(answers, summary) => void submitRound(date, answers, summary, setPhase)} />;
  }

  if (phase.name === "submitting") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex items-end gap-1.5">
          <BinBuddy bin="wet" mood="open" size={64} className="animate-bounce-soft" />
          <BinBuddy bin="dry" mood="open" size={72} className="animate-bounce-soft [animation-delay:0.15s]" />
          <BinBuddy bin="hazardous" mood="open" size={64} className="animate-bounce-soft [animation-delay:0.3s]" />
        </div>
        <p className="text-lg font-semibold text-muted">Checking your segregation…</p>
      </main>
    );
  }

  if (phase.name === "results") {
    return (
      <Results
        mode="daily"
        summary={phase.summary}
        server={phase.server}
        banner={
          phase.error && (
            <div className="rounded-3xl bg-hazardous-soft p-4 shadow-chunky-sm">
              <p className="font-semibold text-[#8A3A06]">Your score couldn&apos;t be saved: {phase.error}</p>
              {phase.retry && (
                <button type="button" onClick={phase.retry} className="mt-2 min-h-11 rounded-2xl bg-hazardous px-4 font-bold text-ink">
                  Try again
                </button>
              )}
            </div>
          )
        }
      />
    );
  }

  if (phase.name === "blocked") {
    return (
      <RoundIntro
        title="Today's round"
        subtitle={phase.message}
        action={
          <div className="flex flex-col gap-3">
            <Link href="/practice" className={primaryButton}>
              Practice instead
            </Link>
            <Link href="/leaderboard" className={secondaryButton}>
              See leaderboard
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <RoundIntro
      title="Today's round"
      subtitle="One scored round per day. Everyone gets the same 20 items. Once you start, today's attempt is used, so get comfortable first!"
      action={
        <div className="flex flex-col gap-2">
          {phase.name === "intro" && phase.error && <p className="text-sm font-semibold text-[#B4480A]">{phase.error}</p>}
          <button type="button" className={primaryButton} disabled={phase.name === "starting"} onClick={start}>
            {phase.name === "starting" ? "Starting…" : "Start today's round"}
          </button>
        </div>
      }
    >
      <Card className="p-3">
        <BossTeaser />
      </Card>
    </RoundIntro>
  );
}
