import { getAiGateway } from "@instagram-agent/ai-gateway";
import { prisma, type Content, type ContentType } from "@instagram-agent/db";
import { evaluate } from "@instagram-agent/decision-engine";
import type { ContentIdea } from "@instagram-agent/types";
import { loadAccountContext, loadKnowledgeBase } from "./account-context";

export async function generateContentIdeas(instagramAccountId: string, count: number, focus?: string): Promise<ContentIdea[]> {
  const account = await loadAccountContext(instagramAccountId);
  return getAiGateway().generateContentIdeas({ account, count, focus });
}

/**
 * Generates a caption and creates a DRAFT Content row. This never touches Instagram —
 * it also routes through the Decision Engine (GENERATE_CONTENT) purely so the attempt
 * is policy-checked (contentEnabled toggle) and audit-logged like every other agent action.
 */
export async function generateCaption(
  instagramAccountId: string,
  input: { topic: string; contentType: ContentType },
): Promise<Content> {
  const decision = await evaluate({
    instagramAccountId,
    actionType: "GENERATE_CONTENT",
    proposedBy: "CONTENT_AGENT",
    payload: { topic: input.topic, type: input.contentType },
  });

  if (decision.outcome === "BLOCKED") {
    throw new Error(`Content generation blocked: ${decision.reason}`);
  }

  const account = await loadAccountContext(instagramAccountId);
  const knowledgeBase = await loadKnowledgeBase(instagramAccountId);
  const generated = await getAiGateway().generateCaption({
    account,
    topic: input.topic,
    contentType: input.contentType,
    knowledgeBase,
  });

  return prisma.content.create({
    data: {
      instagramAccountId,
      type: input.contentType,
      status: "DRAFT",
      topic: input.topic,
      caption: generated.caption,
      hashtags: generated.hashtags,
      hooks: generated.hooks,
      cta: generated.cta,
      generatedByAi: true,
    },
  });
}
