import { publishScheduledContent } from "@instagram-agent/agents";
import type { PublishScheduleJob } from "@instagram-agent/queue";

export async function processPublishSchedule(job: PublishScheduleJob): Promise<unknown> {
  return publishScheduledContent(job.contentCalendarId);
}
