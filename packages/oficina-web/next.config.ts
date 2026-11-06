import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["oficina-mcp"],
  serverExternalPackages: ["pg"],
};

export default config;
