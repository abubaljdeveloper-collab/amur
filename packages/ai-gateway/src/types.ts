import type {
  AnalyticsSummary,
  CommandResult,
  CommentClassificationResult,
  ContentIdea,
  ConversationClassificationResult,
  GeneratedCaption,
  ModerationResult,
} from "@instagram-agent/types";

export interface AccountContext {
  agentName: string;
  personalityPrompt: string;
  brandVoice: string;
  language: string;
  dialect?: string | null;
  forbiddenWords: string[];
  preferredWords: string[];
  emojiPolicy: string;
}

export interface KnowledgeBaseEntry {
  title: string;
  content: string;
  category: string;
}

export interface GenerateIdeasInput {
  account: AccountContext;
  count: number;
  focus?: string;
}

export interface GenerateCaptionInput {
  account: AccountContext;
  topic: string;
  contentType: string;
  knowledgeBase: KnowledgeBaseEntry[];
}

export interface ClassifyCommentInput {
  account: AccountContext;
  knowledgeBase: KnowledgeBaseEntry[];
  commentText: string;
  postCaption?: string;
}

export interface ClassifyConversationInput {
  account: AccountContext;
  knowledgeBase: KnowledgeBaseEntry[];
  recentMessages: Array<{ from: "customer" | "agent"; text: string }>;
  latestMessage: string;
}

export interface AnalyticsSummaryInput {
  account: AccountContext;
  metrics: Record<string, unknown>;
}

export interface CommandInput {
  account: AccountContext;
  command: string;
}

/**
 * Every task an agent can ask the AI Gateway to perform. The single Claude implementation
 * is the only implementation — this interface exists so provider could change later without
 * touching agent code, not to support swapping providers today.
 */
export interface AiGateway {
  generateContentIdeas(input: GenerateIdeasInput): Promise<ContentIdea[]>;
  generateCaption(input: GenerateCaptionInput): Promise<GeneratedCaption>;
  classifyComment(input: ClassifyCommentInput): Promise<CommentClassificationResult>;
  classifyConversation(input: ClassifyConversationInput): Promise<ConversationClassificationResult>;
  moderateContent(text: string): Promise<ModerationResult>;
  generateAnalyticsSummary(input: AnalyticsSummaryInput): Promise<AnalyticsSummary>;
  handleCommand(input: CommandInput): Promise<CommandResult>;
}
