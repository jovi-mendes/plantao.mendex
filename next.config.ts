import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imagem Docker enxuta: .next/standalone + public + .next/static
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
};

export default nextConfig;
