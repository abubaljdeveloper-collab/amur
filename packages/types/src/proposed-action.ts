import { z } from "zod";
import type { ActionType, AgentType } from "@instagram-agent/db";

/**
 * What every agent produces instead of ever calling the Instagram client directly.
 * The Decision Engine is the only consumer of this shape.
 */
export interface ProposedAction {
  instagramAccountId: string;
  actionType: ActionType;
  proposedBy: AgentType;
  payload: Record<string, unknown>;
  confidence?: number;
  reasoning?: string;
  relatedContentId?: string;
  relatedCommentId?: string;
  relatedConversationId?: string;
}

export const proposedActionPayloadSchemas = {
  PUBLISH_CONTENT: z.object({ contentId: z.string() }),
  REPLY_COMMENT: z.object({ instagramCommentId: z.string(), message: z.string() }),
  HIDE_COMMENT: z.object({ instagramCommentId: z.string(), hide: z.boolean() }),
  DELETE_COMMENT: z.object({ instagramCommentId: z.string() }),
  SEND_DM: z.object({ instagramConversationId: z.string(), recipientId: z.string(), message: z.string() }),
  GENERATE_CONTENT: z.object({ topic: z.string(), type: z.string() }),
  ESCALATE: z.object({ reason: z.string() }),
} as const;

export type DecisionOutcome =
  | "BLOCKED"
  | "PENDING_APPROVAL"
  | "EXECUTED"
  | "FAILED"
  | "REJECTED";

export interface DecisionResult {
  outcome: DecisionOutcome;
  actionId: string;
  approvalId?: string;
  reason?: string;
}
