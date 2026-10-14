import { addDays } from "./dates";
import type { RoundSummary } from "./scoring";

// ---------- Streak ----------

export interface StreakState {
  current: number;
  longest: number;
  lastPlayed: string | null;
}

/** Streak after completing a scored round on `date`. */
export function nextStreak(prev: StreakState, date: string): StreakState {
  let current: number;
  if (!prev.lastPlayed) current = 1;
  else if (date <= prev.lastPlayed) current = Math.max(prev.current, 1); // out-of-order date: leave it alone
  else if (prev.lastPlayed === addDays(date, -1)) current = prev.current + 1;
  else current = 1;
  const lastPlayed = prev.lastPlayed && prev.lastPlayed > date ? prev.lastPlayed : date;
  return { current, longest: Math.max(prev.longest, current), lastPlayed };
}

/** The streak to show today: it is broken if the last round was before yesterday. */
export function liveStreak(current: number, lastPlayed: string | null, today: string): number {
  if (!lastPlayed) return 0;
  return lastPlayed === today || lastPlayed === addDays(today, -1) ? current : 0;
}

// ---------- XP ----------

export interface XpBreakdown {
  base: number;
  accuracyBonus: number;
  streakBonus: number;
  total: number;
}

export function xpForRound(score: number, accuracy: number, streak: number): XpBreakdown {
  const base = Math.floor(score / 10);
  const accuracyBonus = accuracy >= 1 ? 100 : accuracy >= 0.9 ? 50 : 0;
  const streakBonus = Math.min(50, 5 * streak);
  return { base, accuracyBonus, streakBonus, total: base + accuracyBonus + streakBonus };
}

// ---------- Levels ----------

export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  return { level, title: titleForLevel(level), xpIntoLevel: remaining, xpForNext: xpToNextLevel(level) };
}

const TITLES: [number, string][] = [
  [20, "Zero-Waste Legend"],
  [15, "Eco Warrior"],
  [10, "Composter"],
  [5, "Recycler"],
  [3, "Segregator"],
  [1, "Litter Picker"],
];

export function titleForLevel(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? "Litter Picker";
}

// ---------- Badges ----------

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const BADGES: Badge[] = [
  { id: "first-sort", name: "First Segregation", icon: "🎉", description: "Finish your first scored round" },
  { id: "boss-slayer", name: "Boss Slayer", icon: "⚔️", description: "Segregate the boss item correctly" },
  { id: "flawless", name: "Flawless", icon: "💎", description: "100% accuracy in a round" },
  { id: "combo-king", name: "Combo King", icon: "👑", description: "Reach a 15-item combo" },
  { id: "lightning-hands", name: "Lightning Hands", icon: "⚡", description: "Average under 1 s per correct item, with 15+ correct" },
  { id: "week-warrior", name: "Week Warrior", icon: "🔥", description: "Reach a 7-day streak" },
  { id: "monthly-hero", name: "Monthly Hero", icon: "🏆", description: "Reach a 30-day streak" },
];

export const BADGES_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

/** Every badge whose condition this round meets. The caller removes ones already owned. */
export function badgesEarned(summary: RoundSummary, streak: number): string[] {
  const earned = ["first-sort"];
  if (summary.bossCorrect) earned.push("boss-slayer");
  if (summary.accuracy >= 1) earned.push("flawless");
  if (summary.maxCombo >= 15) earned.push("combo-king");
  if (summary.correct >= 15 && summary.avgCorrectMs !== null && summary.avgCorrectMs < 1000) {
    earned.push("lightning-hands");
  }
  if (streak >= 7) earned.push("week-warrior");
  if (streak >= 30) earned.push("monthly-hero");
  return earned;
}

// ---------- Stars ----------

/** 0–3 stars for a round: 1 at 50% accuracy, 2 at 80%, 3 for a perfect round. */
export function starsFor(accuracy: number): number {
  if (accuracy >= 1) return 3;
  if (accuracy >= 0.8) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}
