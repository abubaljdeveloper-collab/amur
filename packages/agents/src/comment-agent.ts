import { getAiGateway } from "@instagram-agent/ai-gateway";
import { prisma } from "@instagram-agent/db";
import { evaluate } from "@instagram-agent/decision-engine";
import type { DecisionResult } from "@instagram-agent/types";
import { loadAccountContext, loadKnowledgeBase } from "./account-context";

export interface IncomingComment {
  instagramAccountId: string;
  instagramCommentId: string;
  instagramMediaId: string;
  authorUsername: string;
  text: string;
  postCaption?: string;
}

export async function handleIncomingComment(incoming: IncomingComment): Promise<DecisionResult | { outcome: "IGNORED" }> {
  const comment = await prisma.comment.upsert({
    where: { instagramCommentId: incoming.instagramCommentId },
    update: {},
    create: {
      instagramAccountId: incoming.instagramAccountId,
      instagramCommentId: incoming.instagramCommentId,
      instagramMediaId: incoming.instagramMediaId,
      authorUsername: incoming.authorUsername,
      text: incoming.text,
      status: "NEW",
    },
  });

  const account = await loadAccountContext(incoming.instagramAccountId);
  const knowledgeBase = await loadKnowledgeBase(incoming.instagramAccountId);
  const classification = await getAiGateway().classifyComment({
    account,
    knowledgeBase,
    commentText: incoming.text,
    postCaption: incoming.postCaption,
  });

  await prisma.comment.update({
    where: { id: comment.id },
    data: {
      classification: classification.classification,
      decision: classification.decision,
      suggestedReply: classification.suggestedReply,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      status: classification.decision === "IGNORE" ? "IGNORED" : "PROCESSED",
    },
  });

  if (classification.decision === "IGNORE") {
    return { outcome: "IGNORED" };
  }

  if (classification.decision === "ESCALATE") {
    return evaluate({
      instagramAccountId: incoming.instagramAccountId,
      actionType: "ESCALATE",
      proposedBy: "COMMENT_AGENT",
      payload: { reason: classification.reasoning },
      reasoning: classification.reasoning,
      relatedCommentId: comment.id,
    });
  }

  // AUTO_REPLY and SUGGEST_REPLY both propose the same REPLY_COMMENT action — the
  // Decision Engine's permissionCheck (autonomy level + risk) is what actually decides
  // whether it auto-executes or waits for approval, not the classification itself.
  if (!classification.suggestedReply) {
    return evaluate({
      instagramAccountId: incoming.instagramAccountId,
      actionType: "ESCALATE",
      proposedBy: "COMMENT_AGENT",
      payload: { reason: "Classifier returned no suggested reply" },
      relatedCommentId: comment.id,
    });
  }

  return evaluate({
    instagramAccountId: incoming.instagramAccountId,
    actionType: "REPLY_COMMENT",
    proposedBy: "COMMENT_AGENT",
    payload: { instagramCommentId: incoming.instagramCommentId, message: classification.suggestedReply },
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    relatedCommentId: comment.id,
  });
}
