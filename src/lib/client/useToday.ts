"use client";

import { useSyncExternalStore } from "react";
import { localDateString } from "@/lib/game/dates";

const subscribe = () => () => {};

/** The player's local date (YYYY-MM-DD). Null during server rendering, so there is no hydration mismatch. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => localDateString(), () => null);
}
