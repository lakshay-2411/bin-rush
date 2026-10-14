"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, PageShell, secondaryButton, XpBar } from "@/components/ui";
import type { MeResponse } from "@/lib/api-types";
import { api } from "@/lib/client/api";
import { useToday } from "@/lib/client/useToday";
import { BADGES } from "@/lib/game/progress";

export default function ProfilePage() {
  const today = useToday();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    api<MeResponse>(`/api/me?date=${today}`)
      .then((d) => !cancelled && setMe(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [today]);

  return (
    <PageShell nav="me">
      {error && <Card className="text-[#B4480A]">{error}</Card>}
      {!me && !error && <div className="h-72 animate-pulse rounded-3xl bg-white/70" />}

      {me && (
        <>
          <header className="flex items-center gap-3">
            <UserButton appearance={{ elements: { avatarBox: { width: 52, height: 52 } } }} />
            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-2xl leading-tight font-bold">{me.user.displayName}</h1>
              <span className="truncate text-muted">{me.user.email}</span>
            </div>
          </header>

          <Card>
            <XpBar level={me.progress.level} />
          </Card>

          <section className="grid grid-cols-3 gap-2.5 text-center">
            <Stat label="Best score" value={me.progress.bestScore} />
            <Stat label="Streak" value={me.progress.currentStreak} />
            <Stat label="Longest" value={me.progress.longestStreak} />
          </section>

          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">
              Badges{" "}
              <span className="text-sm font-normal text-muted">
                {me.badges.length}/{BADGES.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {BADGES.map((badge) => {
                const earned = me.badges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-0.5 rounded-2xl p-3 text-center ${
                      earned ? "bg-accent-soft" : "bg-ground opacity-60 grayscale"
                    }`}
                  >
                    <span className="text-3xl" aria-hidden>
                      {badge.icon}
                    </span>
                    <span className="font-semibold">{badge.name}</span>
                    <span className="text-[11px] leading-tight text-muted">{badge.description}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <SignOutButton>
            <button type="button" className={secondaryButton}>
              Sign out
            </button>
          </SignOutButton>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-3xl bg-white py-3 shadow-chunky-sm">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
