import { getAiGateway } from "@instagram-agent/ai-gateway";
import { prisma } from "@instagram-agent/db";
import { evaluate } from "@instagram-agent/decision-engine";
import type { DecisionResult } from "@instagram-agent/types";
import { loadAccountContext, loadKnowledgeBase } from "./account-context";

export interface IncomingMessage {
  instagramAccountId: string;
  instagramConversationId: string;
  instagramMessageId: string;
  participantId: string;
  participantUsername: string;
  text: string;
}

const HISTORY_LIMIT = 10;

export async function handleIncomingMessage(incoming: IncomingMessage): Promise<DecisionResult> {
  const conversation = await prisma.conversation.upsert({
    where: { instagramConversationId: incoming.instagramConversationId },
    update: { lastMessageAt: new Date(), status: "OPEN" },
    create: {
      instagramAccountId: incoming.instagramAccountId,
      instagramConversationId: incoming.instagramConversationId,
      participantId: incoming.participantId,
      participantUsername: incoming.participantUsername,
      status: "OPEN",
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      instagramMessageId: incoming.instagramMessageId,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      text: incoming.text,
    },
  });

  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });

  const account = await loadAccountContext(incoming.instagramAccountId);
  const knowledgeBase = await loadKnowledgeBase(incoming.instagramAccountId);
  const classification = await getAiGateway().classifyConversation({
    account,
    knowledgeBase,
    recentMessages: recentMessages
      .reverse()
      .map((m) => ({ from: m.senderType === "CUSTOMER" ? ("customer" as const) : ("agent" as const), text: m.text })),
    latestMessage: incoming.text,
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { classification: classification.classification },
  });

  if (classification.escalate || !classification.suggestedReply) {
    return evaluate({
      instagramAccountId: incoming.instagramAccountId,
      actionType: "ESCALATE",
      proposedBy: "DM_AGENT",
      payload: { reason: classification.reasoning },
      reasoning: classification.reasoning,
      relatedConversationId: conversation.id,
    });
  }

  return evaluate({
    instagramAccountId: incoming.instagramAccountId,
    actionType: "SEND_DM",
    proposedBy: "DM_AGENT",
    payload: {
      instagramConversationId: incoming.instagramConversationId,
      recipientId: incoming.participantId,
      message: classification.suggestedReply,
    },
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    relatedConversationId: conversation.id,
  });
}
