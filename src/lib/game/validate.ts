import { fallTimeMs } from "./scoring";
import { BINS, type Answer, type Bin, type DailySet } from "./types";

export const MIN_ANSWER_MS = 150;
export const MAX_ROUND_MS = 65_000;
/** Slack for frame timing when an item is answered at the very bottom. */
const FALL_SLACK_MS = 250;

/**
 * Check that submitted answers are plausible for this set.
 * Returns the parsed answers, or an error message.
 */
export function validateAnswers(
  set: DailySet,
  input: unknown,
): { ok: true; answers: Answer[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "answers must be an array" };
  if (input.length > set.items.length) return { ok: false, error: "too many answers" };

  const answers: Answer[] = [];
  let totalMs = 0;

  for (let i = 0; i < input.length; i++) {
    const raw = input[i] as Partial<Answer> | null;
    if (!raw || typeof raw !== "object") return { ok: false, error: `answer ${i} is malformed` };

    const { itemId, bin, ms } = raw;
    if (itemId !== set.items[i].id) return { ok: false, error: `answer ${i} is for the wrong item` };
    if (bin !== null && !BINS.includes(bin as Bin)) return { ok: false, error: `answer ${i} has an unknown bin` };
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
      return { ok: false, error: `answer ${i} has an invalid time` };
    }

    const fallMs = fallTimeMs(i, i === set.bossIndex);
    if (bin !== null && ms < MIN_ANSWER_MS) return { ok: false, error: `answer ${i} is impossibly fast` };
    if (ms > fallMs + FALL_SLACK_MS) return { ok: false, error: `answer ${i} took longer than the fall time` };

    totalMs += Math.min(ms, fallMs);
    answers.push({ itemId, bin: bin as Bin | null, ms });
  }

  if (totalMs > MAX_ROUND_MS) return { ok: false, error: "round took too long" };

  return { ok: true, answers };
}
