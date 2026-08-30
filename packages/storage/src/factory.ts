import { getEnv } from "@instagram-agent/config";
import { LocalStorageAdapter } from "./local";
import { S3StorageAdapter } from "./s3";
import type { StorageAdapter } from "./types";

let cachedAdapter: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (cachedAdapter) return cachedAdapter;

  const env = getEnv();
  if (env.STORAGE_ADAPTER === "s3") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_ADAPTER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
    }
    cachedAdapter = new S3StorageAdapter({
      endpoint: env.S3_ENDPOINT || undefined,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region: env.S3_REGION || "us-east-1",
    });
  } else {
    cachedAdapter = new LocalStorageAdapter();
  }
  return cachedAdapter;
}
