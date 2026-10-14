export type Bin = "wet" | "dry" | "hazardous";

export const BINS: readonly Bin[] = ["wet", "dry", "hazardous"] as const;

export type Tier = 1 | 2 | 3;

export interface Item {
  id: string;
  name: string;
  icon: string;
  bin: Bin;
  tier: Tier;
  explanation: string;
  note?: string;
}

export interface DailySet {
  seed: string;
  items: Item[];
  /** 0-based index of the boss item inside `items`, or -1 when the set has no boss (practice). */
  bossIndex: number;
}

/** One entry per item that was shown, in order. `bin: null` means the item fell to the bottom. */
export interface Answer {
  itemId: string;
  bin: Bin | null;
  ms: number;
}
