import type { Bin } from "@/lib/game/types";

const COLORS: Record<Bin, { body: string; lid: string; glow: string }> = {
  wet: { body: "#22B573", lid: "#17985F", glow: "#C9F2DD" },
  dry: { body: "#3B82F6", lid: "#2563EB", glow: "#D3E3FE" },
  hazardous: { body: "#FF7A1A", lid: "#E0600A", glow: "#FFD9BD" },
};

const INK = "#1E1B4B";

export type BuddyMood = "happy" | "open" | "worried" | "cheer";

/**
 * One of the three bin characters. Purely decorative unless `label` is given.
 * - happy: lid on, smiling (home screen)
 * - open: lid flipped open, mouth open, waiting for an item (game)
 * - worried: raised brows (the hazardous buddy's default personality)
 * - cheer: lid open, big smile (correct answer / results)
 */
export function BinBuddy({
  bin,
  mood = "happy",
  size = 96,
  glow = false,
  label,
  className = "",
}: {
  bin: Bin;
  mood?: BuddyMood;
  size?: number;
  glow?: boolean;
  label?: string;
  className?: string;
}) {
  const c = COLORS[bin];
  const lidOpen = mood === "open" || mood === "cheer";
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  return (
    <svg width={size} height={size * (148 / 120)} viewBox="0 -14 120 148" className={className} {...a11y}>
      {glow && <circle cx="60" cy="86" r="58" fill={c.glow} />}
      <rect x="18" y="38" width="84" height="96" rx="22" fill={c.body} />
      {lidOpen ? (
        <rect x="12" y="24" width="100" height="20" rx="10" fill={c.lid} transform="rotate(-24 18 40)" />
      ) : (
        <>
          <rect x="10" y="22" width="100" height="22" rx="11" fill={c.lid} />
          <rect x="48" y="12" width="24" height="14" rx="7" fill={c.lid} />
        </>
      )}

      {/* eyes */}
      <circle cx="46" cy="72" r={mood === "worried" ? 10 : 9} fill="#fff" />
      <circle cx="74" cy="72" r={mood === "worried" ? 10 : 9} fill="#fff" />
      <circle cx="48" cy={mood === "open" ? 70 : 73} r="4.5" fill={INK} />
      <circle cx="76" cy={mood === "open" ? 70 : 73} r="4.5" fill={INK} />
      {mood === "worried" && (
        <path d="M36 61 L50 55 M84 61 L70 55" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      )}

      {/* mouth */}
      {mood === "open" && <ellipse cx="60" cy="104" rx="14" ry="10" fill={INK} />}
      {mood === "happy" && (
        <path d="M48 96 Q60 108 72 96" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
      {mood === "cheer" && <path d="M44 94 Q60 116 76 94 Z" fill={INK} />}
      {mood === "worried" && (
        <path d="M50 102 Q60 96 70 102" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
