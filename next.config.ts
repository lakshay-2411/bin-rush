import type { NextConfig } from "next";

// Tailwind runs through PostCSS (see postcss.config.mjs), the setup the Next.js docs recommend.
// The scaffold's Turbopack-only Tailwind loader missed stylesheet edits in `next dev` and kept a stale theme.
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
