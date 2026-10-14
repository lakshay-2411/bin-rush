"use client";

import { useEffect, useState } from "react";
import { BinBuddy } from "@/components/BinBuddy";
import { Card, PageShell } from "@/components/ui";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/api-types";
import { api } from "@/lib/client/api";
import { useToday } from "@/lib/client/useToday";

const PODIUM = ["bg-star text-ink", "bg-[#C9CDE8] text-ink", "bg-[#F2B98C] text-ink"];

export default function LeaderboardPage() {
  const today = useToday();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    api<LeaderboardResponse>(`/api/leaderboard?date=${today}`)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [today]);

  const meOutsideTop = data?.me && !data.top.some((e) => e.isMe) ? data.me : null;

  return (
    <PageShell nav="ranks">
      <header className="flex flex-col">
        <span className="text-muted">Everyone gets the same 20 items</span>
        <h1 className="text-[28px] leading-tight font-bold">Today&apos;s leaderboard</h1>
      </header>

      {error && <Card className="text-[#B4480A]">{error}</Card>}
      {!data && !error && <div className="h-72 animate-pulse rounded-3xl bg-white/70" />}

      {data && data.top.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <BinBuddy bin="dry" mood="open" size={80} />
          <span className="text-lg font-semibold">No scores yet today</span>
          <span className="text-muted">Be the first on the board!</span>
        </Card>
      )}

      {data && data.top.length > 0 && (
        <ol className="flex flex-col gap-2">
          {data.top.map((entry) => (
            <Row key={entry.rank} entry={entry} />
          ))}
        </ol>
      )}

      {meOutsideTop && (
        <div className="flex flex-col gap-1">
          <span className="text-center text-muted" aria-hidden>
            · · ·
          </span>
          <ol>
            <Row entry={meOutsideTop} />
          </ol>
        </div>
      )}

      {data && (
        <p className="text-center text-sm text-muted">
          {data.total} player{data.total === 1 ? "" : "s"} today · ties go to higher accuracy, then who finished first
        </p>
      )}
    </PageShell>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const podium = PODIUM[entry.rank - 1];
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
        entry.isMe ? "bg-accent text-white shadow-press" : "bg-white shadow-chunky-sm"
      }`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${
          podium ?? (entry.isMe ? "bg-white/20" : "bg-track")
        }`}
      >
        {entry.rank}
      </span>
      <span className="flex-1 truncate font-semibold">
        {entry.displayName}
        {entry.isMe && " (you)"}
      </span>
      <span className={`text-sm tabular-nums ${entry.isMe ? "text-white/85" : "text-muted"}`}>
        {Math.round(entry.accuracy * 100)}%
      </span>
      <span className="w-16 text-right text-lg font-bold tabular-nums">{entry.score}</span>
    </li>
  );
}
