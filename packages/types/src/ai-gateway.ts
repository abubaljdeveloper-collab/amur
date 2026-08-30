import { z } from "zod";

export const contentIdeaSchema = z.object({
  topic: z.string(),
  contentType: z.enum(["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"]),
  rationale: z.string(),
});
export type ContentIdea = z.infer<typeof contentIdeaSchema>;

export const generatedCaptionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  hooks: z.array(z.string()),
  cta: z.string().optional(),
});
export type GeneratedCaption = z.infer<typeof generatedCaptionSchema>;

export const commentClassificationSchema = z.object({
  classification: z.enum(["QUESTION", "PRAISE", "COMPLAINT", "BUSINESS_INQUIRY", "SPAM", "ABUSIVE", "SENSITIVE"]),
  decision: z.enum(["AUTO_REPLY", "SUGGEST_REPLY", "IGNORE", "ESCALATE"]),
  suggestedReply: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type CommentClassificationResult = z.infer<typeof commentClassificationSchema>;

export const conversationClassificationSchema = z.object({
  classification: z.enum(["GENERAL", "CUSTOMER", "SALES", "SUPPORT", "COMPLAINT", "COLLABORATION", "SPAM", "IMPORTANT"]),
  suggestedReply: z.string().optional(),
  confidence: z.number().min(0).max(1),
  escalate: z.boolean(),
  reasoning: z.string(),
});
export type ConversationClassificationResult = z.infer<typeof conversationClassificationSchema>;

export const moderationResultSchema = z.object({
  flagged: z.boolean(),
  categories: z.array(z.string()),
});
export type ModerationResult = z.infer<typeof moderationResultSchema>;

export const analyticsSummarySchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const commandResultSchema = z.object({
  intent: z.string(),
  params: z.record(z.string(), z.unknown()),
  responseText: z.string(),
});
export type CommandResult = z.infer<typeof commandResultSchema>;

/** Safe fallback used whenever a Claude call throws, refuses, or times out — see AiGateway fail-safe policy. */
export const AI_FAILSAFE_REASONING = "AI error - failed safe";
