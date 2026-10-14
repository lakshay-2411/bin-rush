import type { MeResponse } from "@/lib/api-types";
import { addDays, isAcceptableClientDate } from "@/lib/game/dates";
import { levelFromXp, liveStreak } from "@/lib/game/progress";
import { db, type ProgressRow } from "@/lib/server/db";
import { error, handle, json } from "@/lib/server/http";
import { syncUser } from "@/lib/server/user";

/** GET /api/me?date=YYYY-MM-DD — sync the Clerk user, return progress, badges and today's round state. */
export const GET = handle(async (req: Request) => {
  const user = await syncUser();
  if (!user) return error(401, "unauthorized", "Sign in to continue.");

  const date = new URL(req.url).searchParams.get("date");
  if (!isAcceptableClientDate(date)) return error(400, "bad_date", "Your device date looks wrong.");

  const [progressRes, badgesRes, roundRes, recentRes] = await Promise.all([
    db().from("user_progress").select("*").eq("user_id", user.id).maybeSingle<ProgressRow>(),
    db().from("user_badges").select("badge_id").eq("user_id", user.id),
    db().from("rounds").select("score, submitted_at").eq("user_id", user.id).eq("date", date).maybeSingle(),
    db()
      .from("rounds")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", addDays(date, -6))
      .lte("date", date)
      .not("submitted_at", "is", null),
  ]);
  const failed = progressRes.error ?? badgesRes.error ?? roundRes.error ?? recentRes.error;
  if (failed) return error(500, "db_error", failed.message);

  const p = progressRes.data;
  const round = roundRes.data;

  const body: MeResponse = {
    user,
    progress: {
      currentStreak: p ? liveStreak(p.current_streak, p.last_played_date, date) : 0,
      longestStreak: p?.longest_streak ?? 0,
      xp: p?.xp ?? 0,
      bestScore: p?.best_score ?? 0,
      level: levelFromXp(p?.xp ?? 0),
      firstTime: !p,
    },
    badges: (badgesRes.data ?? []).map((b) => b.badge_id as string),
    today: round
      ? { status: round.submitted_at ? "submitted" : "started", score: round.submitted_at ? round.score : null }
      : { status: "none", score: null },
    recentDays: (recentRes.data ?? []).map((r) => r.date as string),
  };
  return json(body);
});
