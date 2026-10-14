"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MeResponse } from "@/lib/api-types";
import { api } from "@/lib/client/api";
import { useToday } from "@/lib/client/useToday";
import { addDays } from "@/lib/game/dates";
import { BuddiesCard } from "./BuddiesCard";
import { CheckIcon, FlameIcon, PlayIcon } from "./icons";
import { Card, HowToPlay, primaryButton, secondaryButton, XpBar } from "./ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buddyMessage(me: MeResponse): string {
  const { currentStreak } = me.progress;
  if (me.today.status === "submitted") return "Thanks for today's round! Come back tomorrow for a new set.";
  if (me.today.status === "started") return "Your round was interrupted, but today still counts. See you tomorrow!";
  if (me.progress.firstTime) return "Hi! We're the bin buddies. Help us segregate today's waste.";
  if (currentStreak > 0) return `${currentStreak} day${currentStreak > 1 ? "s" : ""} in a row! Play today to keep it going.`;
  return "We missed you! Start a new streak today.";
}

export function HomeDashboard() {
  const today = useToday();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    api<MeResponse>(`/api/me?date=${today}`)
      .then((data) => !cancelled && setMe(data))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [today]);

  if (error) return <Card className="text-[#B4480A]">Couldn&apos;t load your progress: {error}</Card>;
  if (!me || !today) return <HomeSkeleton />;

  const { progress, today: round } = me;
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return {
      date,
      label: i === 6 ? "Today" : WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      // A started round counts too: if it was interrupted, the server saves it shortly after.
      played: me.recentDays.includes(date) || (i === 6 && round.status !== "none"),
      isToday: i === 6,
    };
  });

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-muted">
            {greeting()}, {me.user.displayName}
          </span>
          <span className="text-[28px] leading-tight font-bold">
            {round.status === "none" ? "Ready to segregate?" : "Nice work today!"}
          </span>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3 pl-1.5 shadow-chunky-sm"
          aria-label={`${progress.currentStreak} day streak`}
        >
          <span className="flex size-[30px] items-center justify-center rounded-full bg-flame-soft text-flame">
            <FlameIcon size={18} />
          </span>
          <span className="text-lg font-bold">{progress.currentStreak}</span>
        </span>
      </header>

      <BuddiesCard message={buddyMessage(me)} />

      <Card className="grid grid-cols-7 gap-1.5 p-3">
        {week.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            {d.played ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-wet text-white">
                <CheckIcon size={16} />
              </span>
            ) : d.isToday ? (
              <span className="size-8 rounded-full border-[3px] border-dashed border-accent" />
            ) : (
              <span className="size-8 rounded-full bg-track" />
            )}
            <span className={`text-xs ${d.isToday ? "font-bold" : "text-muted"}`}>{d.label}</span>
          </div>
        ))}
      </Card>

      <Card>
        <XpBar level={progress.level} />
      </Card>

      {round.status === "none" && (
        <Link href="/play" className={primaryButton}>
          <PlayIcon size={22} />
          Play today&apos;s round
        </Link>
      )}
      {round.status === "started" && (
        <Card className="flex items-center gap-2 font-bold text-[#0C6B41]">
          <span className="flex size-8 items-center justify-center rounded-full bg-wet text-white">
            <CheckIcon size={16} />
          </span>
          Played today · interrupted round saved
        </Card>
      )}
      {round.status === "submitted" && (
        <Card className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold text-[#0C6B41]">
            <span className="flex size-8 items-center justify-center rounded-full bg-wet text-white">
              <CheckIcon size={16} />
            </span>
            Played today
          </span>
          <span className="text-2xl font-bold tabular-nums">{round.score}</span>
        </Card>
      )}
      {round.status !== "none" && (
        <Link href="/practice" className={secondaryButton}>
          Warm up with practice
        </Link>
      )}

      {progress.firstTime && <HowToPlay />}
    </>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-14 animate-pulse rounded-2xl bg-white/70" />
      <div className="h-52 animate-pulse rounded-[28px] bg-white/70" />
      <div className="h-20 animate-pulse rounded-3xl bg-white/70" />
      <div className="h-16 animate-pulse rounded-[26px] bg-accent/30" />
    </div>
  );
}
