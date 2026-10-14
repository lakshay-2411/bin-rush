import type { Answer, DailySet, Item } from "./types";

export const ROUND_MS = 60_000;
export const COUNTDOWN_SECONDS = 3;
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50;
export const BOSS_BONUS = 300;
export const WRONG_PENALTY = 50;

/** How long an item takes to fall, by its 0-based position in the set. */
export function fallTimeMs(index: number, isBoss: boolean): number {
  if (isBoss) return 4000;
  const position = index + 1;
  if (position <= 5) return 4000;
  if (position <= 12) return 3000;
  return 2200;
}

/** Multiplier is based on the combo *before* this item is segregated. */
export function comboMultiplier(comboBefore: number): number {
  if (comboBefore >= 10) return 2;
  if (comboBefore >= 5) return 1.5;
  return 1;
}

export function speedBonus(ms: number, fallMs: number): number {
  const raw = Math.round(MAX_SPEED_BONUS * (1 - ms / fallMs));
  return Math.min(MAX_SPEED_BONUS, Math.max(0, raw));
}

export type Outcome = "correct" | "wrong" | "missed";

export interface ItemResult {
  item: Item;
  index: number;
  isBoss: boolean;
  answer: Answer;
  outcome: Outcome;
  points: number;
}

export interface RoundState {
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  bossCorrect: boolean;
  results: ItemResult[];
}

export function initialRoundState(): RoundState {
  return { score: 0, combo: 0, maxCombo: 0, correct: 0, bossCorrect: false, results: [] };
}

/** Apply the next answer. Pure: returns a new state plus the result for that item. */
export function applyAnswer(
  state: RoundState,
  set: DailySet,
  answer: Answer,
): { state: RoundState; result: ItemResult } {
  const index = state.results.length;
  const item = set.items[index];
  if (!item) throw new Error("No more items in this set");
  const isBoss = index === set.bossIndex;

  let outcome: Outcome;
  let points = 0;
  let combo = state.combo;

  if (answer.bin === null) {
    outcome = "missed";
    combo = 0;
  } else if (answer.bin === item.bin) {
    outcome = "correct";
    const multiplier = comboMultiplier(combo);
    const bonus = speedBonus(answer.ms, fallTimeMs(index, isBoss));
    points = Math.round((BASE_POINTS + bonus) * multiplier + (isBoss ? BOSS_BONUS * multiplier : 0));
    combo += 1;
  } else {
    outcome = "wrong";
    points = -WRONG_PENALTY;
    combo = 0;
  }

  const result: ItemResult = { item, index, isBoss, answer, outcome, points };
  return {
    result,
    state: {
      score: state.score + points,
      combo,
      maxCombo: Math.max(state.maxCombo, combo),
      correct: state.correct + (outcome === "correct" ? 1 : 0),
      bossCorrect: state.bossCorrect || (isBoss && outcome === "correct"),
      results: [...state.results, result],
    },
  };
}

export interface RoundSummary {
  score: number;
  /** correct ÷ all items in the set (unseen items count against it), 0..1 */
  accuracy: number;
  correct: number;
  total: number;
  maxCombo: number;
  bossCorrect: boolean;
  /** Average ms per correct item, or null if none were correct. */
  avgCorrectMs: number | null;
  results: ItemResult[];
  /** Items that were never shown because time ran out. */
  unseen: Item[];
}

export function summarize(state: RoundState, set: DailySet): RoundSummary {
  const correctResults = state.results.filter((r) => r.outcome === "correct");
  const avgCorrectMs = correctResults.length
    ? correctResults.reduce((sum, r) => sum + r.answer.ms, 0) / correctResults.length
    : null;
  return {
    score: Math.max(0, state.score),
    accuracy: state.correct / set.items.length,
    correct: state.correct,
    total: set.items.length,
    maxCombo: state.maxCombo,
    bossCorrect: state.bossCorrect,
    avgCorrectMs,
    results: state.results,
    unseen: set.items.slice(state.results.length),
  };
}

/** Score a whole round. Used by the server to recompute what the client played. */
export function scoreRound(set: DailySet, answers: readonly Answer[]): RoundSummary {
  let state = initialRoundState();
  for (const answer of answers) {
    state = applyAnswer(state, set, answer).state;
  }
  return summarize(state, set);
}
