import type { SubmitResponse } from "@/lib/api-types";
import { dailySet } from "@/lib/game/dailySet";
import { badgesEarned, levelFromXp, nextStreak, xpForRound } from "@/lib/game/progress";
import { scoreRound } from "@/lib/game/scoring";
import type { Answer } from "@/lib/game/types";
import { db, type ProgressRow } from "./db";

/**
 * A round left unfinished (refresh, closed tab, crash) is finalised with score 0 once it is
 * safely past the 60-second round plus the client's 65-second limit. 90 s leaves room for latency.
 */
export const STALE_ROUND_MS = 90_000;

export type CompleteResult = { ok: true; response: SubmitResponse } | { ok: false; code: "already_submitted" };

/**
 * Score a started round, mark it submitted, then update streak, XP, best score and badges.
 * Answers must already be validated. Only the first completion of a round wins: the update is
 * conditional on `submitted_at` still being null, so a racing submit and finalise can't both count.
 */
export async function completeRound(
  userId: string,
  round: { id: number; date: string },
  answers: Answer[],
): Promise<CompleteResult> {
  const summary = scoreRound(dailySet(round.date), answers);

  const { data: updated, error: updateError } = await db()
    .from("rounds")
    .update({
      answers,
      score: summary.score,
      accuracy: summary.accuracy,
      max_combo: summary.maxCombo,
      boss_correct: summary.bossCorrect,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", round.id)
    .is("submitted_at", null)
    .select("id");
  if (updateError) throw new Error(updateError.message);
  if (!updated?.length) return { ok: false, code: "already_submitted" };

  const [progressRes, badgesRes] = await Promise.all([
    db().from("user_progress").select("*").eq("user_id", userId).maybeSingle<ProgressRow>(),
    db().from("user_badges").select("badge_id").eq("user_id", userId),
  ]);
  const failed = progressRes.error ?? badgesRes.error;
  if (failed) throw new Error(failed.message);

  const prev = progressRes.data;
  const streak = nextStreak(
    { current: prev?.current_streak ?? 0, longest: prev?.longest_streak ?? 0, lastPlayed: prev?.last_played_date ?? null },
    round.date,
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
  if (progressError) throw new Error(progressError.message);

  const owned = new Set((badgesRes.data ?? []).map((b) => b.badge_id as string));
  const newBadges = badgesEarned(summary, streak.current).filter((id) => !owned.has(id));
  if (newBadges.length) {
    const { error: badgeError } = await db()
      .from("user_badges")
      .upsert(
        newBadges.map((badge_id) => ({ user_id: userId, badge_id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    if (badgeError) throw new Error(badgeError.message);
  }

  return {
    ok: true,
    response: {
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
    },
  };
}

/**
 * Fallback for rounds whose answers never reached the server (the page was refreshed or closed and
 * the save-on-leave request was lost). They are finalised with no answers: score 0, but the day
 * still counts for the streak and the week strip shows it as played. Oldest first, so streaks
 * are rebuilt in order.
 */
export async function finalizeStaleRounds(userId: string, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - STALE_ROUND_MS).toISOString();
  const { data, error } = await db()
    .from("rounds")
    .select("id, date")
    .eq("user_id", userId)
    .is("submitted_at", null)
    .lt("started_at", cutoff)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  for (const round of data ?? []) {
    await completeRound(userId, { id: round.id as number, date: round.date as string }, []);
  }
}
