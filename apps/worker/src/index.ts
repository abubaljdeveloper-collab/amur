import { Worker, type Job } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, ensureRepeatingJobs } from "@instagram-agent/queue";
import type { AnalyticsSyncJob, PublishScheduleJob, TokenRefreshJob } from "@instagram-agent/queue";
import type { NormalizedWebhookEvent } from "@instagram-agent/types";
import { processWebhookEvent } from "./processors/webhook-event.processor";
import { processPublishSchedule } from "./processors/publish-content.processor";
import { processAnalyticsSync } from "./processors/analytics-sync.processor";
import { processTokenRefresh } from "./processors/token-refresh.processor";

// Loads .env from cwd (apps/worker/.env, symlinked to the repo-root .env) when present —
// local dev only. Hosting platforms (Railway, etc.) inject env vars directly with no .env
// file on disk, so a missing file here is expected, not an error. Must run before any
// getEnv()/getRedisConnection() call below; safe since no imported workspace package reads
// env vars at its own module-load time.
try {
  process.loadEnvFile();
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

const connection = getRedisConnection();

function logJobResult(queueName: string) {
  return (job: Job, result: unknown) => {
    console.log(`[worker] ${queueName} job ${job.id} completed:`, result);
  };
}

function logJobFailure(queueName: string) {
  return (job: Job | undefined, err: Error) => {
    console.error(`[worker] ${queueName} job ${job?.id} FAILED (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`, err.message);
  };
}

const webhookWorker = new Worker<NormalizedWebhookEvent>(QUEUE_NAMES.webhookEvents, (job) => processWebhookEvent(job.data), {
  connection,
  concurrency: 5,
});
webhookWorker.on("completed", logJobResult(QUEUE_NAMES.webhookEvents));
webhookWorker.on("failed", logJobFailure(QUEUE_NAMES.webhookEvents));

const publishWorker = new Worker<PublishScheduleJob>(QUEUE_NAMES.publishSchedule, (job) => processPublishSchedule(job.data), {
  connection,
  concurrency: 2,
});
publishWorker.on("completed", logJobResult(QUEUE_NAMES.publishSchedule));
publishWorker.on("failed", logJobFailure(QUEUE_NAMES.publishSchedule));

const analyticsWorker = new Worker<AnalyticsSyncJob>(QUEUE_NAMES.analyticsSync, () => processAnalyticsSync(), {
  connection,
  concurrency: 1,
});
analyticsWorker.on("completed", logJobResult(QUEUE_NAMES.analyticsSync));
analyticsWorker.on("failed", logJobFailure(QUEUE_NAMES.analyticsSync));

const tokenRefreshWorker = new Worker<TokenRefreshJob>(QUEUE_NAMES.tokenRefresh, () => processTokenRefresh(), {
  connection,
  concurrency: 1,
});
tokenRefreshWorker.on("completed", logJobResult(QUEUE_NAMES.tokenRefresh));
tokenRefreshWorker.on("failed", logJobFailure(QUEUE_NAMES.tokenRefresh));

await ensureRepeatingJobs();
console.log("[worker] All BullMQ workers started. Waiting for jobs...");

async function shutdown() {
  console.log("[worker] Shutting down...");
  await Promise.all([webhookWorker.close(), publishWorker.close(), analyticsWorker.close(), tokenRefreshWorker.close()]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
