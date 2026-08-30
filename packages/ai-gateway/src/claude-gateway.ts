import Anthropic from "@anthropic-ai/sdk";
import { AI_TASK_MODELS } from "@instagram-agent/config";
import {
  AI_FAILSAFE_REASONING,
  type AnalyticsSummary,
  type CommandResult,
  type CommentClassificationResult,
  type ContentIdea,
  type ConversationClassificationResult,
  type GeneratedCaption,
  type ModerationResult,
} from "@instagram-agent/types";
import { callStructured } from "./claude-structured";
import { buildStableSystemPrompt, retrieveRelevantKnowledgeBase } from "./prompts/base";
import type {
  AiGateway,
  AnalyticsSummaryInput,
  ClassifyCommentInput,
  ClassifyConversationInput,
  CommandInput,
  GenerateCaptionInput,
  GenerateIdeasInput,
} from "./types";

/**
 * Any exception, refusal, or timeout from Claude is caught here and converted into a
 * safe default rather than propagating — callers never see a crash from an AI failure,
 * only a result that looks like a real (conservative) decision. This is what makes
 * "AI failures must fail safe" concrete rather than a policy statement.
 */
async function withFailSafe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[ai-gateway] Claude call failed, using fail-safe fallback:", err);
    return fallback;
  }
}

export class ClaudeGateway implements AiGateway {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateContentIdeas(input: GenerateIdeasInput): Promise<ContentIdea[]> {
    return withFailSafe([], async () => {
      const system = buildStableSystemPrompt(input.account, []);
      const { contentIdeaSchema } = await import("@instagram-agent/types");
      const { z } = await import("zod");
      const result = await callStructured({
        client: this.client,
        model: AI_TASK_MODELS.generateContentIdeas,
        system,
        userMessage: `اقترح ${input.count} أفكار محتوى لحساب Instagram${input.focus ? ` حول موضوع: ${input.focus}` : ""}. أعد النتيجة عبر أداة submit_ideas.`,
        toolName: "submit_ideas",
        toolDescription: "Submit the generated content ideas.",
        jsonSchema: {
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  contentType: { type: "string", enum: ["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"] },
                  rationale: { type: "string" },
                },
                required: ["topic", "contentType", "rationale"],
              },
            },
          },
          required: ["ideas"],
        },
        zodSchema: z.object({ ideas: contentIdeaSchema.array() }),
      });
      return result.ideas;
    });
  }

  async generateCaption(input: GenerateCaptionInput): Promise<GeneratedCaption> {
    const fallback: GeneratedCaption = { caption: "", hashtags: [], hooks: [] };
    return withFailSafe(fallback, async () => {
      const relevantKb = retrieveRelevantKnowledgeBase(input.knowledgeBase, input.topic);
      const system = buildStableSystemPrompt(input.account, relevantKb);
      const { generatedCaptionSchema } = await import("@instagram-agent/types");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.generateCaption,
        system,
        userMessage: `اكتب Caption لمنشور من نوع ${input.contentType} عن الموضوع: "${input.topic}". أعده عبر أداة submit_caption.`,
        toolName: "submit_caption",
        toolDescription: "Submit the generated caption, hashtags, hooks, and CTA.",
        jsonSchema: {
          properties: {
            caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            hooks: { type: "array", items: { type: "string" } },
            cta: { type: "string" },
          },
          required: ["caption", "hashtags", "hooks"],
        },
        zodSchema: generatedCaptionSchema,
      });
    });
  }

  async classifyComment(input: ClassifyCommentInput): Promise<CommentClassificationResult> {
    const fallback: CommentClassificationResult = {
      classification: "SENSITIVE",
      decision: "ESCALATE",
      confidence: 0,
      reasoning: AI_FAILSAFE_REASONING,
    };
    return withFailSafe(fallback, async () => {
      const relevantKb = retrieveRelevantKnowledgeBase(input.knowledgeBase, input.commentText);
      const system = buildStableSystemPrompt(input.account, relevantKb);
      const { commentClassificationSchema } = await import("@instagram-agent/types");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.classifyComment,
        system,
        userMessage: `صنّف هذا التعليق${input.postCaption ? ` (على منشور بعنوان: "${input.postCaption}")` : ""} وقرر الإجراء المناسب:\n\n"${input.commentText}"\n\nأعد النتيجة عبر أداة submit_classification.`,
        toolName: "submit_classification",
        toolDescription: "Submit the comment classification and decision.",
        jsonSchema: {
          properties: {
            classification: { type: "string", enum: ["QUESTION", "PRAISE", "COMPLAINT", "BUSINESS_INQUIRY", "SPAM", "ABUSIVE", "SENSITIVE"] },
            decision: { type: "string", enum: ["AUTO_REPLY", "SUGGEST_REPLY", "IGNORE", "ESCALATE"] },
            suggestedReply: { type: "string" },
            confidence: { type: "number" },
            reasoning: { type: "string" },
          },
          required: ["classification", "decision", "confidence", "reasoning"],
        },
        zodSchema: commentClassificationSchema,
      });
    });
  }

  async classifyConversation(input: ClassifyConversationInput): Promise<ConversationClassificationResult> {
    const fallback: ConversationClassificationResult = {
      classification: "IMPORTANT",
      confidence: 0,
      escalate: true,
      reasoning: AI_FAILSAFE_REASONING,
    };
    return withFailSafe(fallback, async () => {
      const relevantKb = retrieveRelevantKnowledgeBase(input.knowledgeBase, input.latestMessage);
      const system = buildStableSystemPrompt(input.account, relevantKb);
      const { conversationClassificationSchema } = await import("@instagram-agent/types");
      const history = input.recentMessages.map((m) => `${m.from === "customer" ? "العميل" : "الوكيل"}: ${m.text}`).join("\n");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.classifyConversation,
        system,
        userMessage: `سياق المحادثة:\n${history || "(لا يوجد سياق سابق)"}\n\nآخر رسالة من العميل: "${input.latestMessage}"\n\nصنّف المحادثة وقرر إن كانت تحتاج تصعيدًا للمالك. تذكّر القاعدة: إذا لم تجد إجابة في قاعدة المعرفة، escalate=true ولا تخترع إجابة. أعد النتيجة عبر أداة submit_classification.`,
        toolName: "submit_classification",
        toolDescription: "Submit the conversation classification and escalation decision.",
        jsonSchema: {
          properties: {
            classification: { type: "string", enum: ["GENERAL", "CUSTOMER", "SALES", "SUPPORT", "COMPLAINT", "COLLABORATION", "SPAM", "IMPORTANT"] },
            suggestedReply: { type: "string" },
            confidence: { type: "number" },
            escalate: { type: "boolean" },
            reasoning: { type: "string" },
          },
          required: ["classification", "confidence", "escalate", "reasoning"],
        },
        zodSchema: conversationClassificationSchema,
      });
    });
  }

  async moderateContent(text: string): Promise<ModerationResult> {
    const fallback: ModerationResult = { flagged: true, categories: ["ai_failure_conservative_flag"] };
    return withFailSafe(fallback, async () => {
      const { moderationResultSchema } = await import("@instagram-agent/types");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.moderateContent,
        system: "You are a content moderation classifier. Flag content that is abusive, illegal, sexual, violent, or otherwise unsafe to send publicly on behalf of a business account.",
        userMessage: `Moderate this text:\n\n"${text}"\n\nSubmit via submit_moderation.`,
        toolName: "submit_moderation",
        toolDescription: "Submit the moderation result.",
        jsonSchema: {
          properties: {
            flagged: { type: "boolean" },
            categories: { type: "array", items: { type: "string" } },
          },
          required: ["flagged", "categories"],
        },
        zodSchema: moderationResultSchema,
        maxTokens: 256,
      });
    });
  }

  async generateAnalyticsSummary(input: AnalyticsSummaryInput): Promise<AnalyticsSummary> {
    const fallback: AnalyticsSummary = { summary: AI_FAILSAFE_REASONING, recommendations: [] };
    return withFailSafe(fallback, async () => {
      const system = buildStableSystemPrompt(input.account, []);
      const { analyticsSummarySchema } = await import("@instagram-agent/types");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.generateAnalyticsSummary,
        system,
        userMessage: `حلل هذه البيانات وقدّم توصيات:\n\n${JSON.stringify(input.metrics, null, 2)}\n\nأعد النتيجة عبر أداة submit_summary.`,
        toolName: "submit_summary",
        toolDescription: "Submit the analytics summary and recommendations.",
        jsonSchema: {
          properties: {
            summary: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "recommendations"],
        },
        zodSchema: analyticsSummarySchema,
      });
    });
  }

  async handleCommand(input: CommandInput): Promise<CommandResult> {
    const fallback: CommandResult = { intent: "unknown", params: {}, responseText: "عذرًا، لم أستطع معالجة الأمر. حاول مرة أخرى." };
    return withFailSafe(fallback, async () => {
      const system = buildStableSystemPrompt(input.account, []);
      const { commandResultSchema } = await import("@instagram-agent/types");
      return callStructured({
        client: this.client,
        model: AI_TASK_MODELS.handleCommand,
        system,
        userMessage: `أمر المالك: "${input.command}"\n\nحدد النية (intent) والمعطيات (params) ورد نصي مناسب. أعد النتيجة عبر أداة submit_command_result.`,
        toolName: "submit_command_result",
        toolDescription: "Submit the interpreted command intent and a response for the owner.",
        jsonSchema: {
          properties: {
            intent: { type: "string" },
            params: { type: "object" },
            responseText: { type: "string" },
          },
          required: ["intent", "params", "responseText"],
        },
        zodSchema: commandResultSchema,
      });
    });
  }
}
