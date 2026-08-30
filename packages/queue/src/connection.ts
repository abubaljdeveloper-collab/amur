import { Redis } from "ioredis";
import { getEnv } from "@instagram-agent/config";

let cachedConnection: Redis | undefined;

/** Shared ioredis connection, required by BullMQ (maxRetriesPerRequest must be null). */
export function getRedisConnection(): Redis {
  if (cachedConnection) return cachedConnection;
  const env = getEnv();
  cachedConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return cachedConnection;
}
