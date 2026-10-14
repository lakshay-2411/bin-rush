"use client";

import { useState } from "react";
import { Game } from "@/components/Game";
import { Results } from "@/components/Results";
import { primaryButton, RoundIntro } from "@/components/ui";
import { generatePracticeSet } from "@/lib/game/dailySet";
import type { RoundSummary } from "@/lib/game/scoring";
import type { DailySet } from "@/lib/game/types";

type Phase = { name: "intro" } | { name: "playing"; set: DailySet } | { name: "results"; summary: RoundSummary };

const newPracticeSet = () => generatePracticeSet(`practice:${Date.now()}:${Math.random()}`);

/** Unlimited practice. Runs entirely in the browser (works offline) and earns nothing. */
export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const play = () => setPhase({ name: "playing", set: newPracticeSet() });

  if (phase.name === "playing") {
    return (
      <Game key={phase.set.seed} set={phase.set} onFinish={(_, summary) => setPhase({ name: "results", summary })} />
    );
  }

  if (phase.name === "results") {
    return <Results mode="practice" summary={phase.summary} onPlayAgain={play} />;
  }

  return (
    <RoundIntro
      title="Practice"
      subtitle="A quick warm-up of 3 to 5 random items, with at least one for each bin. Play as often as you like. No points, XP or streak, just learning."
      action={
        <button type="button" className={primaryButton} onClick={play}>
          Start practice
        </button>
      }
    />
  );
}
