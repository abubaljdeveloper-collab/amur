/**
 * Per-task model selection for the AI Gateway. A config map, not hardcoded per call site,
 * so moving any task to a stronger/cheaper model later is a one-line change here.
 */
export const AI_TASK_MODELS = {
  // High-volume, cost-sensitive, structured-output tasks.
  classifyComment: "claude-haiku-4-5",
  classifyConversation: "claude-haiku-4-5",
  moderateContent: "claude-haiku-4-5",

  // Generation tasks that benefit from stronger reasoning/writing quality.
  generateContentIdeas: "claude-sonnet-5",
  generateCaption: "claude-sonnet-5",
  generateAnalyticsSummary: "claude-sonnet-5",
  handleCommand: "claude-sonnet-5",
} as const;

export type AiTask = keyof typeof AI_TASK_MODELS;
