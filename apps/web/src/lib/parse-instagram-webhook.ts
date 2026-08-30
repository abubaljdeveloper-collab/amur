import type { NormalizedWebhookEvent, WebhookEventType } from "@instagram-agent/types";

export interface RawWebhookEvent {
  type: WebhookEventType;
  payload: Record<string, unknown>;
}

/**
 * Best-effort parser for Meta's real Instagram webhook payload shape (entry[].changes[]
 * for comments/mentions, entry[].messaging[] for DMs). This is the ONLY place Meta's raw
 * format is touched — everything downstream (queue, worker, agents) only sees the
 * normalized shape. Verify field names against real payloads during Meta App Review;
 * the /api/dev/simulate-event route exercises the rest of the pipeline without needing that.
 *
 * Returns one array of raw events PER top-level entry, alongside that entry's Instagram-scoped
 * user id (entry.id) so the caller can resolve which InstagramAccount owns them.
 */
export function parseInstagramWebhookEntries(body: Record<string, unknown>): Array<{ igUserId: string; events: RawWebhookEvent[] }> {
  const entries = Array.isArray(body["entry"]) ? (body["entry"] as Array<Record<string, unknown>>) : [];

  return entries.map((entry) => {
    const igUserId = String(entry["id"] ?? "");
    const events: RawWebhookEvent[] = [];

    const changes = Array.isArray(entry["changes"]) ? (entry["changes"] as Array<Record<string, unknown>>) : [];
    for (const change of changes) {
      const field = change["field"];
      const value = (change["value"] ?? {}) as Record<string, unknown>;
      if (field === "comments") {
        events.push({
          type: "NEW_COMMENT",
          payload: {
            instagramCommentId: String(value["id"] ?? ""),
            instagramMediaId: String((value["media"] as Record<string, unknown> | undefined)?.["id"] ?? ""),
            authorUsername: String((value["from"] as Record<string, unknown> | undefined)?.["username"] ?? "unknown"),
            text: String(value["text"] ?? ""),
          },
        });
      } else if (field === "mentions") {
        events.push({ type: "MENTION", payload: value });
      }
    }

    const messaging = Array.isArray(entry["messaging"]) ? (entry["messaging"] as Array<Record<string, unknown>>) : [];
    for (const item of messaging) {
      const sender = (item["sender"] ?? {}) as Record<string, unknown>;
      const message = (item["message"] ?? {}) as Record<string, unknown>;
      if (!message["text"]) continue; // ignore delivery/read receipts etc.
      events.push({
        type: "NEW_MESSAGE",
        payload: {
          instagramConversationId: String(sender["id"] ?? ""),
          instagramMessageId: String(message["mid"] ?? ""),
          participantId: String(sender["id"] ?? ""),
          participantUsername: String(sender["username"] ?? "unknown"),
          text: String(message["text"] ?? ""),
        },
      });
    }

    return { igUserId, events };
  });
}

export function toNormalizedEvent(raw: RawWebhookEvent, instagramAccountId: string): NormalizedWebhookEvent {
  return { type: raw.type, instagramAccountId, rawPayload: raw.payload, receivedAt: new Date().toISOString() };
}
