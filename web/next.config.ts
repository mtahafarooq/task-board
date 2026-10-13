import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the tracing root to this repo so the standalone build is not affected by
  // unrelated lockfiles elsewhere in the developer's home directory.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
