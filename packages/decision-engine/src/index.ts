import { prisma } from "@instagram-agent/db";
import type { DecisionResult, ProposedAction } from "@instagram-agent/types";
import { createApprovalRequest } from "./approval-check";
import { writeAuditLog } from "./audit";
import { dispatchExecute } from "./execute";
import { permissionCheck } from "./permission-check";
import { policyCheck } from "./policy-check";
import { safetyCheck } from "./safety-check";
import { summarizeAction } from "./summary";

/**
 * The single entry point every agent uses instead of ever calling instagram-client
 * directly. Pipeline: policyCheck -> permissionCheck -> safetyCheck -> approvalCheck
 * -> execute -> audit. Every step's outcome is logged unconditionally, including
 * BLOCKED/FAILED/PENDING_APPROVAL, so the audit trail is never partial.
 */
export async function evaluate(proposed: ProposedAction): Promise<DecisionResult> {
  const action = await prisma.action.create({
    data: {
      instagramAccountId: proposed.instagramAccountId,
      actionType: proposed.actionType,
      proposedBy: proposed.proposedBy,
      payload: proposed.payload as never,
      reasoning: proposed.reasoning,
      relatedContentId: proposed.relatedContentId,
      relatedCommentId: proposed.relatedCommentId,
      relatedConversationId: proposed.relatedConversationId,
      status: "PROPOSED",
    },
  });

  const auditBase = {
    actorType: "AI_AGENT" as const,
    actorId: proposed.proposedBy,
    instagramAccountId: proposed.instagramAccountId,
    entityType: "Action",
    entityId: action.id,
  };

  const settings = await prisma.agentSettings.findUnique({ where: { instagramAccountId: proposed.instagramAccountId } });
  if (!settings) {
    await prisma.action.update({ where: { id: action.id }, data: { status: "BLOCKED", errorMessage: "No AgentSettings for account" } });
    await writeAuditLog({ ...auditBase, eventType: "BLOCKED", metadata: { reason: "missing_agent_settings" } });
    return { outcome: "BLOCKED", actionId: action.id, reason: "No AgentSettings for account" };
  }

  // 1. Policy check
  const policy = policyCheck(proposed.actionType, settings);
  if (!policy.allowed) {
    await prisma.action.update({ where: { id: action.id }, data: { status: "BLOCKED", errorMessage: policy.reason } });
    await writeAuditLog({ ...auditBase, eventType: "BLOCKED", metadata: { step: "policyCheck", reason: policy.reason } });
    return { outcome: "BLOCKED", actionId: action.id, reason: policy.reason };
  }

  // 2. Safety check (rate limits, duplicate-send guard, reply-loop guard, moderation)
  const safety = await safetyCheck(proposed);
  if (!safety.passed) {
    await prisma.action.update({ where: { id: action.id }, data: { status: "BLOCKED", errorMessage: safety.reason } });
    await writeAuditLog({ ...auditBase, eventType: "BLOCKED", metadata: { step: "safetyCheck", reason: safety.reason } });
    return { outcome: "BLOCKED", actionId: action.id, reason: safety.reason };
  }

  // 3. Permission check (autonomy level vs action risk)
  const permission = permissionCheck(proposed.actionType, settings);
  if (permission.requiresApproval) {
    const { approvalId } = await createApprovalRequest(action.id, proposed.instagramAccountId, summarizeAction(proposed.actionType, proposed.payload));
    await prisma.action.update({ where: { id: action.id }, data: { status: "PENDING_APPROVAL" } });
    await writeAuditLog({ ...auditBase, eventType: "PENDING_APPROVAL", metadata: { approvalId } });
    return { outcome: "PENDING_APPROVAL", actionId: action.id, approvalId };
  }

  // 4. Execute (autonomous path — no approval required at this autonomy level/risk tier)
  return executeAndFinalize(action.id, proposed);
}

/** Owner approves/rejects in the dashboard; approve re-enters here — the ONLY other path to execute. */
export async function resumeAfterApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  decidedById: string,
  editedPayload?: Record<string, unknown>,
): Promise<DecisionResult> {
  const approval = await prisma.approval.findUniqueOrThrow({ where: { id: approvalId }, include: { action: true } });

  if (approval.status !== "PENDING") {
    return { outcome: approval.status === "APPROVED" ? "EXECUTED" : "REJECTED", actionId: approval.actionId, approvalId };
  }

  await prisma.approval.update({
    where: { id: approvalId },
    data: { status: decision, decidedById, decidedAt: new Date(), editedPayload: editedPayload as never },
  });

  const auditBase = {
    actorType: "HUMAN" as const,
    actorId: decidedById,
    instagramAccountId: approval.action.instagramAccountId,
    entityType: "Action",
    entityId: approval.actionId,
  };

  if (decision === "REJECTED") {
    await prisma.action.update({ where: { id: approval.actionId }, data: { status: "REJECTED" } });
    await writeAuditLog({ ...auditBase, eventType: "REJECTED" });
    return { outcome: "REJECTED", actionId: approval.actionId, approvalId };
  }

  await prisma.action.update({ where: { id: approval.actionId }, data: { status: "APPROVED" } });
  await writeAuditLog({ ...auditBase, eventType: "APPROVED" });

  const proposed: ProposedAction = {
    instagramAccountId: approval.action.instagramAccountId,
    actionType: approval.action.actionType,
    proposedBy: approval.action.proposedBy,
    payload: (editedPayload ?? (approval.action.payload as Record<string, unknown>)),
    relatedContentId: approval.action.relatedContentId ?? undefined,
    relatedCommentId: approval.action.relatedCommentId ?? undefined,
    relatedConversationId: approval.action.relatedConversationId ?? undefined,
  };

  return executeAndFinalize(approval.actionId, proposed, { approvalId });
}

async function executeAndFinalize(
  actionId: string,
  proposed: ProposedAction,
  extra?: { approvalId?: string },
): Promise<DecisionResult> {
  const auditBase = {
    actorType: "AI_AGENT" as const,
    actorId: proposed.proposedBy,
    instagramAccountId: proposed.instagramAccountId,
    entityType: "Action",
    entityId: actionId,
  };

  try {
    await dispatchExecute(proposed.actionType, {
      instagramAccountId: proposed.instagramAccountId,
      payload: proposed.payload,
      relatedCommentId: proposed.relatedCommentId,
      relatedConversationId: proposed.relatedConversationId,
    });
    await prisma.action.update({ where: { id: actionId }, data: { status: "EXECUTED", executedAt: new Date() } });
    await writeAuditLog({ ...auditBase, eventType: "EXECUTED" });
    return { outcome: "EXECUTED", actionId, approvalId: extra?.approvalId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.action.update({ where: { id: actionId }, data: { status: "FAILED", errorMessage } });
    await writeAuditLog({ ...auditBase, eventType: "FAILED", metadata: { error: errorMessage } });
    await notifyOwnerOfFailure(proposed.instagramAccountId, actionId, errorMessage);
    return { outcome: "FAILED", actionId, approvalId: extra?.approvalId, reason: errorMessage };
  }
}

async function notifyOwnerOfFailure(instagramAccountId: string, actionId: string, errorMessage: string): Promise<void> {
  const account = await prisma.instagramAccount.findUnique({ where: { id: instagramAccountId }, select: { userId: true } });
  if (!account) return;
  await prisma.notification.create({
    data: {
      userId: account.userId,
      type: "SYSTEM_ALERT",
      title: "فشل تنفيذ إجراء",
      body: errorMessage,
      relatedActionId: actionId,
    },
  });
}

export type { ProposedAction, DecisionResult } from "@instagram-agent/types";
