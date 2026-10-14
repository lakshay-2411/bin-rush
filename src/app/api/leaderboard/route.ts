import { auth } from "@clerk/nextjs/server";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/api-types";
import { isAcceptableClientDate } from "@/lib/game/dates";
import { db } from "@/lib/server/db";
import { error, handle, json } from "@/lib/server/http";

const TOP_N = 50;

interface Row {
  user_id: string;
  score: number;
  accuracy: number;
  submitted_at: string;
  users: { display_name: string } | null;
}

/**
 * GET /api/leaderboard?date=YYYY-MM-DD — public. Top 50 for the day, plus the
 * signed-in player's own rank. Ties: higher accuracy, then earlier submission.
 */
export const GET = handle(async (req: Request) => {
  const date = new URL(req.url).searchParams.get("date");
  if (!isAcceptableClientDate(date)) return error(400, "bad_date", "Your device date looks wrong.");

  const { userId } = await auth();

  // At this scale it's simplest to load the day's submitted rounds already ordered and rank them here.
  const { data, error: dbError } = await db()
    .from("rounds")
    .select("user_id, score, accuracy, submitted_at, users(display_name)")
    .eq("date", date)
    .not("submitted_at", "is", null)
    .order("score", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("submitted_at", { ascending: true })
    .returns<Row[]>();
  if (dbError) return error(500, "db_error", dbError.message);

  const ranked: LeaderboardEntry[] = (data ?? []).map((row, i) => ({
    rank: i + 1,
    isMe: !!userId && row.user_id === userId,
    displayName: row.users?.display_name ?? "Player",
    score: row.score,
    accuracy: row.accuracy,
  }));

  const body: LeaderboardResponse = {
    date,
    top: ranked.slice(0, TOP_N),
    me: ranked.find((e) => e.isMe) ?? null,
    total: ranked.length,
  };
  return json(body);
});
