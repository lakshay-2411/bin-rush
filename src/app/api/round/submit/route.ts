import { auth } from "@clerk/nextjs/server";
import { dailySet } from "@/lib/game/dailySet";
import { isAcceptableClientDate } from "@/lib/game/dates";
import { validateAnswers } from "@/lib/game/validate";
import { db } from "@/lib/server/db";
import { error, handle, json, readJson } from "@/lib/server/http";
import { completeRound } from "@/lib/server/rounds";

/**
 * POST /api/round/submit { date, answers } — the client sends only answers and timings.
 * The server rebuilds the day's set, recomputes the score, then updates progress and badges.
 * Also receives a partial round sent when the player leaves the page mid-round.
 */
export const POST = handle(async (req: Request) => {
  const { userId } = await auth();
  if (!userId) return error(401, "unauthorized", "Sign in to submit a round.");

  const body = await readJson(req);
  const date = body?.date;
  if (!isAcceptableClientDate(date)) return error(400, "bad_date", "Your device date looks wrong.");

  const { data: round, error: roundError } = await db()
    .from("rounds")
    .select("id, date, submitted_at")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (roundError) return error(500, "db_error", roundError.message);
  if (!round) return error(409, "not_started", "This round was never started.");
  if (round.submitted_at) return error(409, "already_submitted", "This round was already submitted.");

  const parsed = validateAnswers(dailySet(date), body?.answers);
  if (!parsed.ok) return error(400, "invalid_answers", parsed.error);

  const result = await completeRound(userId, { id: round.id, date }, parsed.answers);
  if (!result.ok) return error(409, "already_submitted", "This round was already submitted.");
  return json(result.response);
});
