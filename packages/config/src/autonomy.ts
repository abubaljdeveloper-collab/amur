/**
 * Risk tiers for proposed actions, used by the Decision Engine's permissionCheck
 * to decide whether an action needs human approval at a given autonomy level.
 */
export type ActionRisk = "low" | "medium" | "high";

export const ACTION_RISK: Record<string, ActionRisk> = {
  GENERATE_CONTENT: "low",
  PUBLISH_CONTENT: "high",
  REPLY_COMMENT: "medium",
  HIDE_COMMENT: "medium",
  DELETE_COMMENT: "high",
  SEND_DM: "medium",
  ESCALATE: "low",
};

/**
 * Autonomy level -> which risk tiers may execute without human approval.
 * Level 2 (approval required for everything) is the safe MVP default in AgentSettings.
 */
export const AUTONOMY_AUTO_EXECUTE_RISK: Record<number, ActionRisk[]> = {
  0: [], // suggestions only
  1: [], // AI drafts, owner approves everything
  2: [], // approval required for everything (MVP default)
  3: ["low", "medium"], // auto-execute low/medium risk within defined rules
  4: ["low", "medium", "high"], // fully autonomous
};
