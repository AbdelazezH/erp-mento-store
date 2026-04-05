import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // enables minimal Docker image (~150MB vs 800MB)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
