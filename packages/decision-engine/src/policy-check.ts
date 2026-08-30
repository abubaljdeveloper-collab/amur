import type { AgentSettings, ActionType } from "@instagram-agent/db";

/** Which AgentSettings toggle gates each action type. */
const ACTION_TO_TOGGLE: Record<ActionType, keyof AgentSettings | null> = {
  GENERATE_CONTENT: "contentEnabled",
  PUBLISH_CONTENT: "publishingEnabled",
  REPLY_COMMENT: "commentsEnabled",
  HIDE_COMMENT: "commentsEnabled",
  DELETE_COMMENT: "commentsEnabled",
  SEND_DM: "dmsEnabled",
  ESCALATE: null, // escalation is never gated — it must always be possible
};

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

export function policyCheck(actionType: ActionType, settings: AgentSettings): PolicyCheckResult {
  const toggleKey = ACTION_TO_TOGGLE[actionType];
  if (!toggleKey) return { allowed: true };

  const enabled = settings[toggleKey];
  if (!enabled) {
    return { allowed: false, reason: `Capability disabled: ${String(toggleKey)} is off for this account` };
  }
  return { allowed: true };
}
