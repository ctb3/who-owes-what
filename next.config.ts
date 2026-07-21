import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone: a self-contained `node server.js`. Same artifact
  // runs under docker run, under Lambda via the Web Adapter, or on ECS.
  output: "standalone",
};

export default nextConfig;
