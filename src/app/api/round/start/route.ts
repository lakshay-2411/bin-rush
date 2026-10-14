import { isAcceptableClientDate } from "@/lib/game/dates";
import { db } from "@/lib/server/db";
import { error, handle, json, readJson } from "@/lib/server/http";
import { syncUser } from "@/lib/server/user";

/**
 * POST /api/round/start { date } — claim today's scored round.
 * Inserting the row up front means a refresh or abandon still uses up the day.
 */
export const POST = handle(async (req: Request) => {
  const user = await syncUser();
  if (!user) return error(401, "unauthorized", "Sign in to play today's round.");

  const body = await readJson(req);
  const date = body?.date;
  if (!isAcceptableClientDate(date)) return error(400, "bad_date", "Your device date looks wrong.");

  const { error: insertError } = await db().from("rounds").insert({ user_id: user.id, date });
  if (insertError) {
    if (insertError.code === "23505") {
      return error(409, "already_played", "You've already played today's round. Try Practice mode!");
    }
    return error(500, "db_error", insertError.message);
  }
  return json({ date });
});
