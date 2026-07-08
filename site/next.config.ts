import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static, frontend-only build — deployable to any static host.
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
