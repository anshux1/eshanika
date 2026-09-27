import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev VM is reached over Tailscale, not localhost.
  allowedDevOrigins: ["t3box.taild2d775.ts.net", "100.107.237.6"],
};

export default nextConfig;
