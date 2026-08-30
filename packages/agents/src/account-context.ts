import { prisma } from "@instagram-agent/db";
import type { AccountContext, KnowledgeBaseEntry } from "@instagram-agent/ai-gateway";

export async function loadAccountContext(instagramAccountId: string): Promise<AccountContext> {
  const settings = await prisma.agentSettings.findUniqueOrThrow({ where: { instagramAccountId } });
  return {
    agentName: settings.agentName,
    personalityPrompt: settings.personalityPrompt,
    brandVoice: settings.brandVoice,
    language: settings.language,
    dialect: settings.dialect,
    forbiddenWords: settings.forbiddenWords,
    preferredWords: settings.preferredWords,
    emojiPolicy: settings.emojiPolicy,
  };
}

export async function loadKnowledgeBase(instagramAccountId: string): Promise<KnowledgeBaseEntry[]> {
  const entries = await prisma.knowledgeBase.findMany({
    where: { instagramAccountId, isActive: true },
    select: { title: true, content: true, category: true },
  });
  return entries;
}
