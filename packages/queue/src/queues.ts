import { Queue } from "bullmq";
import type { NormalizedWebhookEvent } from "@instagram-agent/types";
import { getRedisConnection } from "./connection";

export const QUEUE_NAMES = {
  webhookEvents: "webhook-events",
  publishSchedule: "publish-schedule",
  analyticsSync: "analytics-sync",
  tokenRefresh: "token-refresh",
} as const;

export interface PublishScheduleJob {
  contentCalendarId: string;
}

export interface AnalyticsSyncJob {
  // empty: the processor fans out to every connected account on each tick
  triggeredAt: string;
}

export interface TokenRefreshJob {
  triggeredAt: string;
}

let queues: {
  webhookEvents: Queue<NormalizedWebhookEvent>;
  publishSchedule: Queue<PublishScheduleJob>;
  analyticsSync: Queue<AnalyticsSyncJob>;
  tokenRefresh: Queue<TokenRefreshJob>;
} | undefined;

function getQueues() {
  if (queues) return queues;
  const connection = getRedisConnection();
  queues = {
    webhookEvents: new Queue<NormalizedWebhookEvent>(QUEUE_NAMES.webhookEvents, { connection }),
    publishSchedule: new Queue<PublishScheduleJob>(QUEUE_NAMES.publishSchedule, { connection }),
    analyticsSync: new Queue<AnalyticsSyncJob>(QUEUE_NAMES.analyticsSync, { connection }),
    tokenRefresh: new Queue<TokenRefreshJob>(QUEUE_NAMES.tokenRefresh, { connection }),
  };
  return queues;
}

/** Idempotent per-event enqueue: a stable jobId (caller-derived hash of the event) dedupes webhook retries. */
export async function enqueueWebhookEvent(event: NormalizedWebhookEvent, jobId: string): Promise<void> {
  await getQueues().webhookEvents.add("process", event, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: false,
  });
}

export async function enqueuePublishAt(job: PublishScheduleJob, scheduledAt: Date, jobId: string): Promise<void> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await getQueues().publishSchedule.add("publish", job, {
    jobId,
    delay,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: false,
  });
}

export async function cancelScheduledPublish(jobId: string): Promise<void> {
  const job = await getQueues().publishSchedule.getJob(jobId);
  if (job) await job.remove();
}

export async function ensureRepeatingJobs(): Promise<void> {
  const q = getQueues();
  await q.analyticsSync.upsertJobScheduler(
    "analytics-sync-recurring",
    { every: 6 * 60 * 60 * 1000 }, // ~6h
    { name: "sync", data: { triggeredAt: new Date().toISOString() } },
  );
  await q.tokenRefresh.upsertJobScheduler(
    "token-refresh-recurring",
    { every: 24 * 60 * 60 * 1000 }, // daily
    { name: "refresh", data: { triggeredAt: new Date().toISOString() } },
  );
}
