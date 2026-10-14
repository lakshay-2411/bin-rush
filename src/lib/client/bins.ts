import type { Bin } from "@/lib/game/types";

export interface BinMeta {
  label: string;
  keyHint: string;
  swipeHint: string;
  /** What goes in it, in a few words. */
  holds: string;
  /** Full Tailwind class strings (kept static so Tailwind can see them). */
  bg: string;
  soft: string;
  text: string;
}

export const BIN_META: Record<Bin, BinMeta> = {
  wet: {
    label: "Wet",
    keyHint: "← or 1",
    swipeHint: "Swipe left",
    holds: "Food and garden waste",
    bg: "bg-wet",
    soft: "bg-wet-soft",
    text: "text-wet-dark",
  },
  dry: {
    label: "Dry",
    keyHint: "↓ or 2",
    swipeHint: "Swipe down",
    holds: "Paper, plastic, metal, glass, cloth",
    bg: "bg-dry",
    soft: "bg-dry-soft",
    text: "text-dry-dark",
  },
  hazardous: {
    label: "Hazardous",
    keyHint: "→ or 3",
    swipeHint: "Swipe right",
    holds: "Batteries, bulbs, medicines, chemicals",
    bg: "bg-hazardous",
    soft: "bg-hazardous-soft",
    text: "text-[#B4480A]",
  },
};

export const KEY_TO_BIN: Record<string, Bin> = {
  ArrowLeft: "wet",
  "1": "wet",
  ArrowDown: "dry",
  "2": "dry",
  ArrowRight: "hazardous",
  "3": "hazardous",
};
