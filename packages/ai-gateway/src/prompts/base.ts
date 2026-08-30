import type { AccountContext, KnowledgeBaseEntry } from "../types";

/**
 * PRD §32 prompt layering: SYSTEM PROMPT + PERSONALITY + KNOWLEDGE BASE + CONTEXT + USER MESSAGE.
 * Layers 1-3 are stable per account (change only when settings/KB change), so they're kept
 * as one string a caller can mark as a prompt-cache breakpoint on high-volume classification calls.
 */

export const CORE_SYSTEM_RULES = `أنت مدير حساب Instagram بالنيابة عن المستخدم (صاحب الحساب). هدفك إدارة الحساب وتنمية حضوره وتحسين التواصل مع الجمهور، مع الالتزام بهوية الحساب وقواعده وسياسات Instagram.

قواعد صارمة يجب الالتزام بها دائمًا:
1. لا تخترع معلومات. إذا لم تجد المعلومة في قاعدة المعرفة (Knowledge Base) المرفقة أدناه، أجب حرفيًا بـ "I DON'T KNOW" وحدد escalate=true. لا تحاول التخمين أبدًا.
2. لا تتخذ قرارات حساسة (استرجاع أموال، وعود قانونية أو طبية، خصومات غير معلنة) — صعّد هذه الحالات للمالك دائمًا.
3. التزم بشخصية الحساب المحددة أدناه (اللهجة، النبرة، الكلمات الممنوعة والمفضلة) في كل رد تكتبه.
4. لا تخترع أرقامًا أو إحصاءات لم تُعطَ لك.
5. عند الشك، اختر التصعيد (ESCALATE) بدل تخمين إجابة.`;

export function buildPersonalityBlock(account: AccountContext): string {
  return `شخصية الوكيل:
الاسم: ${account.agentName}
اللغة: ${account.language}${account.dialect ? ` (لهجة: ${account.dialect})` : ""}
النبرة والأسلوب: ${account.personalityPrompt || "غير محددة — استخدم أسلوبًا وديًا ومختصرًا افتراضيًا"}
صوت العلامة: ${account.brandVoice || "غير محدد"}
سياسة الرموز التعبيرية: ${account.emojiPolicy}
${account.forbiddenWords.length ? `كلمات ممنوعة: ${account.forbiddenWords.join("، ")}` : ""}
${account.preferredWords.length ? `كلمات مفضلة: ${account.preferredWords.join("، ")}` : ""}`;
}

export function buildKnowledgeBaseBlock(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return "قاعدة المعرفة: لا توجد إدخالات مطابقة. إذا احتجت معلومة غير متوفرة هنا، اتبع القاعدة رقم 1 أعلاه.";
  }
  return `قاعدة المعرفة (الإدخالات ذات الصلة):\n${entries
    .map((e) => `- [${e.category}] ${e.title}: ${e.content}`)
    .join("\n")}`;
}

/** MVP retrieval: naive keyword/substring match, no embeddings — flagged as a P1 upgrade. */
export function retrieveRelevantKnowledgeBase(
  entries: KnowledgeBaseEntry[],
  query: string,
  topK = 5,
): KnowledgeBaseEntry[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return entries.slice(0, topK);

  const scored = entries.map((entry) => {
    const haystack = `${entry.title} ${entry.content}`.toLowerCase();
    const score = terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

export function buildStableSystemPrompt(account: AccountContext, knowledgeBase: KnowledgeBaseEntry[]): string {
  return [CORE_SYSTEM_RULES, buildPersonalityBlock(account), buildKnowledgeBaseBlock(knowledgeBase)].join("\n\n");
}
