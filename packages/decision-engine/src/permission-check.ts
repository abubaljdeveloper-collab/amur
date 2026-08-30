import { ACTION_RISK, AUTONOMY_AUTO_EXECUTE_RISK } from "@instagram-agent/config";
import type { AgentSettings, ActionType } from "@instagram-agent/db";

const AUTONOMY_LEVEL_TO_INT: Record<string, number> = {
  LEVEL_0_MANUAL: 0,
  LEVEL_1_ASSISTED: 1,
  LEVEL_2_APPROVAL_REQUIRED: 2,
  LEVEL_3_AUTO_LOW_RISK: 3,
  LEVEL_4_FULL_AUTO: 4,
};

export interface PermissionCheckResult {
  requiresApproval: boolean;
}

export function permissionCheck(actionType: ActionType, settings: AgentSettings): PermissionCheckResult {
  // ESCALATE always executes immediately — escalating to a human is never something
  // that itself needs human approval. GENERATE_CONTENT only creates a DRAFT row in our
  // own DB (nothing reaches Instagram) — review happens via the Content.status workflow
  // itself (DRAFT -> PENDING_APPROVAL -> APPROVED), so gating it here too would be a
  // redundant approval prompt for an action that touches nothing external.
  if (actionType === "ESCALATE" || actionType === "GENERATE_CONTENT") return { requiresApproval: false };

  const level = AUTONOMY_LEVEL_TO_INT[settings.autonomyLevel] ?? 2;
  const risk = ACTION_RISK[actionType] ?? "high";
  const autoExecuteRisks = AUTONOMY_AUTO_EXECUTE_RISK[level] ?? [];
  const canAutoExecute = autoExecuteRisks.includes(risk);

  return { requiresApproval: !canAutoExecute };
}
