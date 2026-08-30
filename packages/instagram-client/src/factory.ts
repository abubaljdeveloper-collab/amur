import { getEnv } from "@instagram-agent/config";
import { GraphApiInstagramClient } from "./graph";
import { MockInstagramClient } from "./mock";
import type { InstagramClient } from "./types";

let cachedClient: InstagramClient | undefined;

export function getInstagramClient(): InstagramClient {
  if (cachedClient) return cachedClient;

  const env = getEnv();
  if (env.INSTAGRAM_CLIENT_MODE === "real") {
    if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
      throw new Error(
        "INSTAGRAM_CLIENT_MODE=real requires INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to be set.",
      );
    }
    cachedClient = new GraphApiInstagramClient({ appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET });
  } else {
    cachedClient = new MockInstagramClient();
  }
  return cachedClient;
}
