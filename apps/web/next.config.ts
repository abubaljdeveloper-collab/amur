import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@instagram-agent/db",
    "@instagram-agent/config",
    "@instagram-agent/crypto",
    "@instagram-agent/types",
    "@instagram-agent/instagram-client",
    "@instagram-agent/ai-gateway",
    "@instagram-agent/agents",
    "@instagram-agent/decision-engine",
    "@instagram-agent/queue",
    "@instagram-agent/storage",
  ],
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis"],
};

export default nextConfig;
