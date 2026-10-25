import type { NextConfig } from "next";

// This is a client-side admin app: every page runs in the browser against the
// API, so the scaffold's `cacheComponents` / `partialPrefetching` (server
// caching features) are left off.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
