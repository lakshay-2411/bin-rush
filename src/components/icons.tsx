import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

function Solid({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </Stroke>
);

export const RanksIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Stroke>
);

export const MeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke strokeWidth={3} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Stroke>
);

export const TrophyIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8 4h8v5a4 4 0 01-8 0z" />
    <path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4" />
    <path d="M12 13v4M8 21h8M10 17h4" />
  </Stroke>
);

export const FlameIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8 0 4 3 7 7 7z" />
  </Solid>
);

export const StarIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" />
  </Solid>
);

export const PlayIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7 4l13 8-13 8z" />
  </Solid>
);

export const BackIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Stroke>
);
