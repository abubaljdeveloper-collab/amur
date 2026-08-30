import type { ActionType } from "@instagram-agent/db";
import { executeDeleteComment, executeHideComment } from "./executors/hide-comment";
import { executeEscalate } from "./executors/escalate";
import { executePublishContent } from "./executors/publish-content";
import { executeReplyComment } from "./executors/reply-comment";
import { executeSendMessage } from "./executors/send-message";

export interface ExecuteContext {
  instagramAccountId: string;
  payload: Record<string, unknown>;
  relatedCommentId?: string;
  relatedConversationId?: string;
}

/**
 * The single dispatch point every execution path (autonomous or human-approved) goes
 * through. Adding a new ActionType means adding one case here — nowhere else calls
 * an executor directly.
 */
export async function dispatchExecute(actionType: ActionType, ctx: ExecuteContext): Promise<unknown> {
  switch (actionType) {
    case "PUBLISH_CONTENT":
      return executePublishContent(ctx.instagramAccountId, ctx.payload as { contentId: string });
    case "REPLY_COMMENT":
      return executeReplyComment(ctx.instagramAccountId, ctx.payload as { instagramCommentId: string; message: string });
    case "HIDE_COMMENT":
      return executeHideComment(ctx.instagramAccountId, ctx.payload as { instagramCommentId: string; hide: boolean });
    case "DELETE_COMMENT":
      return executeDeleteComment(ctx.instagramAccountId, ctx.payload as { instagramCommentId: string });
    case "SEND_DM":
      return executeSendMessage(
        ctx.instagramAccountId,
        ctx.payload as { instagramConversationId: string; recipientId: string; message: string },
      );
    case "ESCALATE":
      return executeEscalate(ctx.instagramAccountId, ctx.payload as { reason: string }, {
        relatedCommentId: ctx.relatedCommentId,
        relatedConversationId: ctx.relatedConversationId,
      });
    case "GENERATE_CONTENT":
      // Content generation writes its own Content row directly (see packages/agents/content-agent) —
      // it reaches the Decision Engine only for audit-trail purposes, nothing to execute here.
      return {};
    default: {
      const _exhaustive: never = actionType;
      throw new Error(`Unhandled action type: ${String(_exhaustive)}`);
    }
  }
}
