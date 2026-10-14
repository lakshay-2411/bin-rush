import { auth } from "@clerk/nextjs/server";
import type { SubmitResponse } from "@/lib/api-types";
import { dailySet } from "@/lib/game/dailySet";
import { isAcceptableClientDate } from "@/lib/game/dates";
import { badgesEarned, levelFromXp, nextStreak, xpForRound } from "@/lib/game/progress";
import { scoreRound } from "@/lib/game/scoring";
import { validateAnswers } from "@/lib/game/validate";
import { db, type ProgressRow } from "@/lib/server/db";
import { error, handle, json, readJson } from "@/lib/server/http";

/**
 * POST /api/round/submit { date, answers } — the client sends only answers and timings.
 * The server rebuilds the day's set, recomputes the score, then updates progress and badges.
 */
export const POST = handle(async (req: Request) => {
  const { userId } = await auth();
  if (!userId) return error(401, "unauthorized", "Sign in to submit a round.");

  const body = await readJson(req);
  const date = body?.date;
  if (!isAcceptableClientDate(date)) return error(400, "bad_date", "Your device date looks wrong.");

  const { data: round, error: roundError } = await db()
    .from("rounds")
    .select("id, submitted_at")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (roundError) return error(500, "db_error", roundError.message);
  if (!round) return error(409, "not_started", "This round was never started.");
  if (round.submitted_at) return error(409, "already_submitted", "This round was already submitted.");

  const set = dailySet(date);
  const parsed = validateAnswers(set, body?.answers);
  if (!parsed.ok) return error(400, "invalid_answers", parsed.error);

  const summary = scoreRound(set, parsed.answers);

  // Only the first submit wins: the update is conditional on submitted_at still being null.
  const { data: updated, error: updateError } = await db()
    .from("rounds")
    .update({
      answers: parsed.answers,
      score: summary.score,
      accuracy: summary.accuracy,
      max_combo: summary.maxCombo,
      boss_correct: summary.bossCorrect,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", round.id)
    .is("submitted_at", null)
    .select("id");
  if (updateError) return error(500, "db_error", updateError.message);
  if (!updated?.length) return error(409, "already_submitted", "This round was already submitted.");

  // ----- Progress -----
  const [progressRes, badgesRes] = await Promise.all([
    db().from("user_progress").select("*").eq("user_id", userId).maybeSingle<ProgressRow>(),
    db().from("user_badges").select("badge_id").eq("user_id", userId),
  ]);
  const failed = progressRes.error ?? badgesRes.error;
  if (failed) return error(500, "db_error", failed.message);

  const prev = progressRes.data;
  const streak = nextStreak(
    { current: prev?.current_streak ?? 0, longest: prev?.longest_streak ?? 0, lastPlayed: prev?.last_played_date ?? null },
    date,
  );
  const xp = xpForRound(summary.score, summary.accuracy, streak.current);
  const xpBefore = prev?.xp ?? 0;
  const xpAfter = xpBefore + xp.total;

  const { error: progressError } = await db()
    .from("user_progress")
    .upsert(
      {
        user_id: userId,
        current_streak: streak.current,
        longest_streak: streak.longest,
        last_played_date: streak.lastPlayed,
        xp: xpAfter,
        best_score: Math.max(prev?.best_score ?? 0, summary.score),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (progressError) return error(500, "db_error", progressError.message);

  const owned = new Set((badgesRes.data ?? []).map((b) => b.badge_id as string));
  const newBadges = badgesEarned(summary, streak.current).filter((id) => !owned.has(id));
  if (newBadges.length) {
    const { error: badgeError } = await db()
      .from("user_badges")
      .upsert(
        newBadges.map((badge_id) => ({ user_id: userId, badge_id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    if (badgeError) return error(500, "db_error", badgeError.message);
  }

  const response: SubmitResponse = {
    score: summary.score,
    accuracy: summary.accuracy,
    correct: summary.correct,
    maxCombo: summary.maxCombo,
    bossCorrect: summary.bossCorrect,
    xp: { ...xp, before: xpBefore, after: xpAfter },
    levelBefore: levelFromXp(xpBefore),
    levelAfter: levelFromXp(xpAfter),
    streak: { current: streak.current, longest: streak.longest },
    newBadges,
  };
  return json(response);
});
