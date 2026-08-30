import { prisma } from "@instagram-agent/db";
import { evaluate } from "@instagram-agent/decision-engine";
import type { DecisionResult } from "@instagram-agent/types";

/**
 * Fired by the worker's publish-schedule job when a ContentCalendar entry's scheduled
 * time arrives. Re-validates the content is still APPROVED — the owner may have rejected
 * it, or the schedule entry may be stale — before ever proposing PUBLISH_CONTENT.
 */
export async function publishScheduledContent(contentCalendarId: string): Promise<DecisionResult | { outcome: "SKIPPED"; reason: string }> {
  const calendarEntry = await prisma.contentCalendar.findUnique({
    where: { id: contentCalendarId },
    include: { content: true },
  });

  if (!calendarEntry) {
    return { outcome: "SKIPPED", reason: "Content calendar entry no longer exists" };
  }
  if (calendarEntry.publishedAt) {
    return { outcome: "SKIPPED", reason: "Already published" };
  }
  if (calendarEntry.content.status !== "APPROVED" && calendarEntry.content.status !== "SCHEDULED") {
    return { outcome: "SKIPPED", reason: `Content status is ${calendarEntry.content.status}, expected APPROVED/SCHEDULED` };
  }

  return evaluate({
    instagramAccountId: calendarEntry.content.instagramAccountId,
    actionType: "PUBLISH_CONTENT",
    proposedBy: "PUBLISHING_AGENT",
    payload: { contentId: calendarEntry.content.id },
    relatedContentId: calendarEntry.content.id,
  });
}

/** Called directly from the dashboard's "Publish now" action, bypassing the schedule. */
export async function publishContentNow(contentId: string): Promise<DecisionResult> {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });
  return evaluate({
    instagramAccountId: content.instagramAccountId,
    actionType: "PUBLISH_CONTENT",
    proposedBy: "PUBLISHING_AGENT",
    payload: { contentId },
    relatedContentId: contentId,
  });
}
