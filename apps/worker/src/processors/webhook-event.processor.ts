import { handleIncomingComment, handleIncomingMessage } from "@instagram-agent/agents";
import { prisma } from "@instagram-agent/db";
import type { NormalizedWebhookEvent } from "@instagram-agent/types";

/**
 * The webhook route (apps/web/src/app/api/webhooks/instagram/route.ts) already normalizes
 * Meta's entry[].changes[]/messaging[] structure into these clean shapes before enqueueing —
 * this processor never touches Meta's raw payload format.
 */
export async function processWebhookEvent(event: NormalizedWebhookEvent): Promise<unknown> {
  switch (event.type) {
    case "NEW_COMMENT": {
      const p = event.rawPayload as {
        instagramCommentId: string;
        instagramMediaId: string;
        authorUsername: string;
        text: string;
        postCaption?: string;
      };
      return handleIncomingComment({ instagramAccountId: event.instagramAccountId, ...p });
    }
    case "NEW_MESSAGE": {
      const p = event.rawPayload as {
        instagramConversationId: string;
        instagramMessageId: string;
        participantId: string;
        participantUsername: string;
        text: string;
      };
      return handleIncomingMessage({ instagramAccountId: event.instagramAccountId, ...p });
    }
    case "MENTION": {
      // MVP: notify only, full classification is a P1 follow-up (see plan §build order note).
      const account = await prisma.instagramAccount.findUnique({ where: { id: event.instagramAccountId }, select: { userId: true } });
      if (!account) return { outcome: "SKIPPED", reason: "Unknown account" };
      return prisma.notification.create({
        data: {
          userId: account.userId,
          type: "SYSTEM_ALERT",
          title: "إشارة جديدة (Mention)",
          body: JSON.stringify(event.rawPayload),
        },
      });
    }
    case "MEDIA_EVENT": {
      const p = event.rawPayload as { mediaId: string; status: string };
      return prisma.content.updateMany({
        where: { publishedMediaId: p.mediaId },
        data: { status: p.status === "FINISHED" ? "PUBLISHED" : "FAILED" },
      });
    }
    default: {
      const _exhaustive: never = event.type;
      throw new Error(`Unhandled webhook event type: ${String(_exhaustive)}`);
    }
  }
}
