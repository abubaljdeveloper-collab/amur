import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().min(1).default("http://localhost:3000"),

  ENCRYPTION_KEY: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1),

  INSTAGRAM_CLIENT_MODE: z.enum(["mock", "real"]).default("mock"),
  INSTAGRAM_APP_ID: z.string().optional().default(""),
  INSTAGRAM_APP_SECRET: z.string().optional().default(""),
  INSTAGRAM_REDIRECT_URI: z.string().optional().default("http://localhost:3000/api/instagram/oauth/callback"),
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().min(1),

  STORAGE_ADAPTER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_REGION: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Lazily parsed & cached. Called at each process's entrypoint, not at import time,
 * so a package can be imported by tooling (e.g. Prisma CLI) without every var being set.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck your .env against .env.example.`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
