import pool from "./items.json";
import { createRng, shuffle } from "./rng";
import { BINS, type DailySet, type Item, type Tier } from "./types";

export const ITEMS = pool as Item[];
export const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export const ROUND_SIZE = 20;
export const TIER_MIX: Record<Tier, number> = { 1: 12, 2: 5, 3: 3 };
/** Boss lands at 1-indexed positions 10..18 (0-based 9..17). */
const BOSS_MIN_INDEX = 9;
const BOSS_MAX_INDEX = 17;

/** Build a 20-item set from a seed. Same seed always gives the same items in the same order. */
export function generateSet(seed: string, items: readonly Item[] = ITEMS): DailySet {
  const rand = createRng(seed);
  const pick = (tier: Tier) => {
    const tierItems = items.filter((item) => item.tier === tier);
    if (tierItems.length < TIER_MIX[tier]) {
      throw new Error(`Item pool needs at least ${TIER_MIX[tier]} tier-${tier} items`);
    }
    return shuffle(tierItems, rand).slice(0, TIER_MIX[tier]);
  };

  const tricky = pick(3);
  const easy = pick(1);
  const medium = pick(2);
  const [boss, ...otherTricky] = tricky;

  const rest = shuffle([...easy, ...medium, ...otherTricky], rand);
  const bossIndex = BOSS_MIN_INDEX + Math.floor(rand() * (BOSS_MAX_INDEX - BOSS_MIN_INDEX + 1));
  rest.splice(bossIndex, 0, boss);

  return { seed, items: rest, bossIndex };
}

export const PRACTICE_MIN_ITEMS = 3;
export const PRACTICE_MAX_ITEMS = 5;

/**
 * A short practice set: 3 to 5 random items, with at least one item for each bin.
 * Practice has no boss, so `bossIndex` is -1.
 */
export function generatePracticeSet(seed: string, items: readonly Item[] = ITEMS): DailySet {
  const rand = createRng(seed);
  const count = PRACTICE_MIN_ITEMS + Math.floor(rand() * (PRACTICE_MAX_ITEMS - PRACTICE_MIN_ITEMS + 1));

  const onePerBin = BINS.map((bin) => {
    const binItems = items.filter((item) => item.bin === bin);
    if (!binItems.length) throw new Error(`Item pool has no ${bin} items`);
    return shuffle(binItems, rand)[0];
  });
  const chosen = new Set(onePerBin.map((item) => item.id));
  const extras = shuffle(
    items.filter((item) => !chosen.has(item.id)),
    rand,
  ).slice(0, count - onePerBin.length);

  return { seed, items: shuffle([...onePerBin, ...extras], rand), bossIndex: -1 };
}

/** Today's shared set. Every player on the same date gets the same 20 items. */
export function dailySet(date: string): DailySet {
  return generateSet(`bin-rush:${date}`);
}
