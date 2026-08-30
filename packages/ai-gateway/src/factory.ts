import { getEnv } from "@instagram-agent/config";
import { ClaudeGateway } from "./claude-gateway";
import type { AiGateway } from "./types";

let cached: AiGateway | undefined;

export function getAiGateway(): AiGateway {
  if (cached) return cached;
  const env = getEnv();
  cached = new ClaudeGateway(env.ANTHROPIC_API_KEY);
  return cached;
}
