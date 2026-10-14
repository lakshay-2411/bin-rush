import { describe, expect, it } from "vitest";
import { dailySet, generatePracticeSet, generateSet, ITEMS, ROUND_SIZE } from "./dailySet";
import { addDays, isAcceptableClientDate, isDateString } from "./dates";
import { badgesEarned, levelFromXp, liveStreak, nextStreak, starsFor, xpForRound, xpToNextLevel } from "./progress";
import { applyAnswer, comboMultiplier, fallTimeMs, initialRoundState, scoreRound, speedBonus } from "./scoring";
import type { Answer, DailySet } from "./types";
import { validateAnswers } from "./validate";

const perfectAnswers = (set: DailySet, ms = 0): Answer[] =>
  set.items.map((item) => ({ itemId: item.id, bin: item.bin, ms }));

describe("item pool", () => {
  it("has unique ids, valid fields and short explanations", () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const item of ITEMS) {
      expect(["wet", "dry", "hazardous"]).toContain(item.bin);
      expect([1, 2, 3]).toContain(item.tier);
      expect(item.explanation.length, item.id).toBeLessThanOrEqual(120);
    }
  });
});

describe("daily set", () => {
  it("is identical for the same date", () => {
    expect(dailySet("2026-10-14")).toEqual(dailySet("2026-10-14"));
  });

  it("differs between dates", () => {
    const a = dailySet("2026-10-14").items.map((i) => i.id);
    const b = dailySet("2026-10-15").items.map((i) => i.id);
    expect(a).not.toEqual(b);
  });

  it("has 20 unique items in a 12/5/3 mix with a tier-3 boss at position 10-18", () => {
    for (let d = 0; d < 60; d++) {
      const set = dailySet(addDays("2026-01-01", d));
      expect(set.items).toHaveLength(ROUND_SIZE);
      expect(new Set(set.items.map((i) => i.id)).size).toBe(ROUND_SIZE);
      const count = (t: number) => set.items.filter((i) => i.tier === t).length;
      expect([count(1), count(2), count(3)]).toEqual([12, 5, 3]);
      expect(set.bossIndex).toBeGreaterThanOrEqual(9);
      expect(set.bossIndex).toBeLessThanOrEqual(17);
      expect(set.items[set.bossIndex].tier).toBe(3);
    }
  });

  it("any seed produces a valid 20-item set", () => {
    expect(generateSet("anything:123").items).toHaveLength(20);
  });
});

describe("practice set", () => {
  it("has 3 to 5 unique items, at least one per bin, and no boss", () => {
    const sizes = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const set = generatePracticeSet(`practice:${i}`);
      sizes.add(set.items.length);
      expect(set.items.length).toBeGreaterThanOrEqual(3);
      expect(set.items.length).toBeLessThanOrEqual(5);
      expect(new Set(set.items.map((item) => item.id)).size).toBe(set.items.length);
      for (const bin of ["wet", "dry", "hazardous"]) {
        expect(set.items.some((item) => item.bin === bin)).toBe(true);
      }
      expect(set.bossIndex).toBe(-1);
    }
    expect([...sizes].sort()).toEqual([3, 4, 5]);
  });

  it("scores without a boss bonus", () => {
    const set = generatePracticeSet("practice:fixed");
    const summary = scoreRound(set, perfectAnswers(set));
    expect(summary.bossCorrect).toBe(false);
    expect(summary.accuracy).toBe(1);
    expect(summary.score).toBe(150 * set.items.length);
  });
});

describe("scoring", () => {
  it("matches the PRD worked example: 6-combo, 1.0 s of 4.0 s = 207", () => {
    expect(speedBonus(1000, 4000)).toBe(38);
    expect(Math.round((100 + speedBonus(1000, 4000)) * comboMultiplier(6))).toBe(207);
  });

  it("builds combos item by item", () => {
    const set = dailySet("2026-10-14");
    let state = initialRoundState();
    for (let i = 0; i < 6; i++) {
      state = applyAnswer(state, set, { itemId: set.items[i].id, bin: set.items[i].bin, ms: 1000 }).state;
    }
    expect(state.combo).toBe(6);
    expect(state.correct).toBe(6);
  });

  it("gives 5,475 for a perfect instant round", () => {
    const set = dailySet("2026-10-14");
    const summary = scoreRound(set, perfectAnswers(set));
    expect(summary.score).toBe(5475);
    expect(summary.accuracy).toBe(1);
    expect(summary.maxCombo).toBe(20);
    expect(summary.bossCorrect).toBe(true);
  });

  it("penalises wrong bins, resets combo, and floors the final score at 0", () => {
    const set = dailySet("2026-10-14");
    const wrong = set.items.slice(0, 3).map((item) => ({
      itemId: item.id,
      bin: item.bin === "wet" ? ("dry" as const) : ("wet" as const),
      ms: 500,
    }));
    const summary = scoreRound(set, wrong);
    expect(summary.score).toBe(0);
    expect(summary.correct).toBe(0);
    expect(summary.unseen).toHaveLength(17);
  });

  it("uses the PRD fall times and a fixed 4 s for the boss", () => {
    expect([0, 4, 5, 11, 12, 19].map((i) => fallTimeMs(i, false))).toEqual([4000, 4000, 3000, 3000, 2200, 2200]);
    expect(fallTimeMs(15, true)).toBe(4000);
  });
});

describe("validation", () => {
  const set = dailySet("2026-10-14");

  it("accepts a plausible round", () => {
    expect(validateAnswers(set, perfectAnswers(set, 900)).ok).toBe(true);
  });

  it("rejects answers faster than 150 ms", () => {
    expect(validateAnswers(set, perfectAnswers(set, 100)).ok).toBe(false);
  });

  it("rejects answers for the wrong item, unknown bins and extra answers", () => {
    const answers = perfectAnswers(set, 900);
    expect(validateAnswers(set, [{ ...answers[0], itemId: "nope" }]).ok).toBe(false);
    expect(validateAnswers(set, [{ ...answers[0], bin: "compost" }]).ok).toBe(false);
    expect(validateAnswers(set, [...answers, answers[0]]).ok).toBe(false);
    expect(validateAnswers(set, "nope").ok).toBe(false);
  });

  it("rejects answers slower than the fall time", () => {
    expect(validateAnswers(set, [{ itemId: set.items[0].id, bin: "wet", ms: 9000 }]).ok).toBe(false);
  });
});

describe("dates", () => {
  it("validates and shifts dates", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("only accepts client dates within a day of server UTC", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(isAcceptableClientDate("2026-10-13", now)).toBe(true);
    expect(isAcceptableClientDate("2026-10-15", now)).toBe(true);
    expect(isAcceptableClientDate("2026-10-16", now)).toBe(false);
  });
});

describe("progress", () => {
  it("extends, resets and records streaks", () => {
    let s = nextStreak({ current: 0, longest: 0, lastPlayed: null }, "2026-10-01");
    s = nextStreak(s, "2026-10-02");
    s = nextStreak(s, "2026-10-03");
    expect(s).toEqual({ current: 3, longest: 3, lastPlayed: "2026-10-03" });
    s = nextStreak(s, "2026-10-06");
    expect(s).toEqual({ current: 1, longest: 3, lastPlayed: "2026-10-06" });
  });

  it("shows a broken streak as 0", () => {
    expect(liveStreak(5, "2026-10-13", "2026-10-14")).toBe(5);
    expect(liveStreak(5, "2026-10-12", "2026-10-14")).toBe(0);
  });

  it("computes XP with accuracy and capped streak bonuses", () => {
    expect(xpForRound(3000, 0.9, 3)).toEqual({ base: 300, accuracyBonus: 50, streakBonus: 15, total: 365 });
    expect(xpForRound(3000, 1, 20).total).toBe(300 + 100 + 50);
  });

  it("uses 100 × n^1.5 per level", () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(3)).toBe(520);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(100 + 283 + 520).title).toBe("Segregator");
  });

  it("gives 0-3 stars by accuracy", () => {
    expect([0.4, 0.5, 0.79, 0.8, 0.95, 1].map(starsFor)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it("awards badges from round stats and streak", () => {
    const set = dailySet("2026-10-14");
    const summary = scoreRound(set, perfectAnswers(set, 500));
    expect(badgesEarned(summary, 7).sort()).toEqual(
      ["boss-slayer", "combo-king", "first-sort", "flawless", "lightning-hands", "week-warrior"].sort(),
    );
  });
});
