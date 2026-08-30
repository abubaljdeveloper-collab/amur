import { getRedisConnection } from "@instagram-agent/queue";
import { getAiGateway } from "@instagram-agent/ai-gateway";
import type { ProposedAction } from "@instagram-agent/types";

const MAX_REPLIES_PER_HOUR = 60;
const DUPLICATE_SEND_WINDOW_SECONDS = 300; // 5 minutes

export interface SafetyCheckResult {
  passed: boolean;
  reason?: string;
}

function outboundText(action: ProposedAction): string | undefined {
  const payload = action.payload as Record<string, unknown>;
  return typeof payload["message"] === "string" ? payload["message"] : undefined;
}

function outboundRecipientKey(action: ProposedAction): string | undefined {
  const payload = action.payload as Record<string, unknown>;
  if (typeof payload["instagramCommentId"] === "string") return `comment:${payload["instagramCommentId"]}`;
  if (typeof payload["recipientId"] === "string") return `dm:${payload["recipientId"]}`;
  return undefined;
}

/**
 * Redis-backed guards against the failure modes explicitly called out in PRD §28:
 * excessive sending, repeated replies, reply loops, duplicate sends. Every check here
 * runs BEFORE anything is sent to Instagram.
 */
export async function safetyCheck(action: ProposedAction): Promise<SafetyCheckResult> {
  if (action.actionType === "REPLY_COMMENT" || action.actionType === "SEND_DM") {
    // Reply-loop guard: never let the agent reply to a message it authored itself.
    const payload = action.payload as Record<string, unknown>;
    if (payload["senderType"] === "AI_AGENT") {
      return { passed: false, reason: "Refusing to reply to the agent's own message (reply-loop guard)" };
    }

    const redis = getRedisConnection();

    // Rate limit: max outbound replies/messages per hour per account.
    const rateLimitKey = `rate:${action.actionType}:${action.instagramAccountId}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);
    if (count > MAX_REPLIES_PER_HOUR) {
      return { passed: false, reason: `Rate limit exceeded: >${MAX_REPLIES_PER_HOUR} ${action.actionType} in the last hour` };
    }

    // Duplicate-send guard: same recipient + same generated text within the window.
    const text = outboundText(action);
    const recipientKey = outboundRecipientKey(action);
    if (text && recipientKey) {
      const dedupeKey = `dedupe:${action.instagramAccountId}:${recipientKey}:${hashText(text)}`;
      const wasSet = await redis.set(dedupeKey, "1", "EX", DUPLICATE_SEND_WINDOW_SECONDS, "NX");
      if (wasSet === null) {
        return { passed: false, reason: "Duplicate send suppressed: identical message to the same recipient within 5 minutes" };
      }
    }

    // Moderation on outbound text before it ever reaches Instagram.
    if (text) {
      const moderation = await getAiGateway().moderateContent(text);
      if (moderation.flagged) {
        return { passed: false, reason: `Outbound message flagged by moderation: ${moderation.categories.join(", ")}` };
      }
    }
  }

  return { passed: true };
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}
