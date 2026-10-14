"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { BIN_META } from "@/lib/client/bins";
import { useToday } from "@/lib/client/useToday";
import { dailySet } from "@/lib/game/dailySet";
import type { LevelInfo } from "@/lib/game/progress";
import { BINS } from "@/lib/game/types";
import { BinBuddy } from "./BinBuddy";
import { BackIcon, HomeIcon, MeIcon, RanksIcon } from "./icons";

// ---------- Buttons ----------

export const primaryButton =
  "flex w-full min-h-16 items-center justify-center gap-2.5 rounded-[26px] bg-accent text-xl font-bold text-white shadow-press transition active:translate-y-1 active:shadow-[0_3px_0_var(--color-accent-dark)] disabled:opacity-60";
export const secondaryButton =
  "flex w-full min-h-13 items-center justify-center gap-2 rounded-[22px] bg-white font-semibold text-ink shadow-chunky transition active:translate-y-1 active:shadow-chunky-sm";

// ---------- Layout ----------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-4 shadow-chunky ${className}`}>{children}</section>;
}

export type NavTab = "home" | "ranks" | "me";

export function PageShell({ children, nav }: { children: ReactNode; nav?: NavTab }) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
      <main className={`flex flex-1 flex-col gap-4 px-5 pt-6 ${nav ? "pb-28" : "pb-8"}`}>{children}</main>
      {nav && <BottomNav active={nav} />}
    </div>
  );
}

export function PageHeader({ title, back = "/" }: { title: string; back?: string }) {
  return (
    <header className="flex items-center gap-3">
      <Link
        href={back}
        aria-label="Back"
        className="flex size-11 items-center justify-center rounded-2xl bg-white shadow-chunky-sm"
      >
        <BackIcon />
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}

const NAV: { tab: NavTab; href: string; label: string; Icon: typeof HomeIcon; signedInOnly?: boolean }[] = [
  { tab: "home", href: "/", label: "Home", Icon: HomeIcon },
  { tab: "ranks", href: "/leaderboard", label: "Ranks", Icon: RanksIcon },
  { tab: "me", href: "/profile", label: "Me", Icon: MeIcon, signedInOnly: true },
];

export function BottomNav({ active }: { active: NavTab }) {
  // "Me" only makes sense with an account, so signed-out visitors (and the first paint, before Clerk loads) see Home and Ranks.
  const { isSignedIn } = useAuth();
  const items = NAV.filter((item) => !item.signedInOnly || isSignedIn);
  return (
    <nav
      aria-label="Main"
      className={`fixed inset-x-0 bottom-0 z-10 mx-auto grid w-full max-w-[480px] ${
        items.length === 3 ? "grid-cols-3" : "grid-cols-2"
      } gap-1 rounded-t-[28px] bg-white px-3 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_0_var(--color-line)]`}
    >
      {items.map(({ tab, href, label, Icon }) => {
        const isActive = tab === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold ${
              isActive ? "bg-accent-soft text-accent-dark" : "text-muted"
            }`}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// ---------- Game pieces ----------

/** Today's boss item as a silhouette in a dashed circle: the "mystery guest". */
export function BossTeaser({ compact = false }: { compact?: boolean }) {
  const today = useToday();
  const boss = useMemo(() => {
    if (!today) return null;
    const set = dailySet(today);
    return set.items[set.bossIndex];
  }, [today]);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-[#B9B3F0] ${
          compact ? "size-13" : "size-16"
        }`}
      >
        <span className={`brightness-0 ${compact ? "text-2xl" : "text-3xl"}`} aria-label="Hidden boss item" role="img">
          {boss?.icon ?? ""}
        </span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">Mystery guest</span>
        <span className="text-sm text-muted">Today&apos;s boss · +300</span>
      </div>
    </div>
  );
}

export function HowToPlay() {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">How to play</h2>
      <p className="text-muted">
        20 items fall one at a time. Segregate each into the right bin before it lands. You have 60 seconds. A wrong bin
        costs 50 points and breaks your combo, so accuracy beats speed.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {BINS.map((bin) => (
          <div key={bin} className={`flex flex-col items-center rounded-2xl ${BIN_META[bin].soft} px-1.5 pt-2 pb-2.5 text-center`}>
            <BinBuddy bin={bin} mood={bin === "hazardous" ? "worried" : "happy"} size={52} />
            <span className="mt-1 font-bold">{BIN_META[bin].label}</span>
            <span className="text-[11px] leading-tight text-muted">{BIN_META[bin].holds}</span>
            <span className="mt-1 text-[11px] font-semibold text-muted">{BIN_META[bin].swipeHint}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function XpBar({ level }: { level: LevelInfo }) {
  const width = `${Math.round((level.xpIntoLevel / level.xpForNext) * 100)}%`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">
          Level {level.level} · {level.title}
        </span>
        <span className="text-xs tabular-nums text-muted">
          {level.xpIntoLevel} / {level.xpForNext} XP
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-wet transition-[width] duration-700" style={{ width }} />
      </div>
    </div>
  );
}

/** Pre-round screen shared by Play and Practice. */
export function RoundIntro({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action: ReactNode;
  children?: ReactNode;
}) {
  return (
    <PageShell>
      <PageHeader title={title} />
      <p className="text-muted">{subtitle}</p>
      {children}
      <HowToPlay />
      <div className="mt-auto">{action}</div>
    </PageShell>
  );
}
