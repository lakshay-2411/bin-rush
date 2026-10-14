import type { LevelInfo, XpBreakdown } from "./game/progress";

/** Shapes returned by the API routes, shared with the client. */

export interface MeResponse {
  user: { id: string; email: string; displayName: string };
  progress: {
    currentStreak: number;
    longestStreak: number;
    xp: number;
    bestScore: number;
    level: LevelInfo;
    firstTime: boolean;
  };
  badges: string[];
  today: { status: "none" | "started" | "submitted"; score: number | null };
  /** Dates (YYYY-MM-DD) in the last 7 days, including today, with a submitted round. */
  recentDays: string[];
}

export interface SubmitResponse {
  score: number;
  accuracy: number;
  correct: number;
  maxCombo: number;
  bossCorrect: boolean;
  xp: XpBreakdown & { before: number; after: number };
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  streak: { current: number; longest: number };
  newBadges: string[];
}

export interface LeaderboardEntry {
  rank: number;
  isMe: boolean;
  displayName: string;
  score: number;
  accuracy: number;
}

export interface LeaderboardResponse {
  date: string;
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
}
