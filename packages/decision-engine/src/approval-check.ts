import { prisma } from "@instagram-agent/db";

const APPROVAL_EXPIRY_HOURS = 48;

/** Creates the Approval + owner Notification and returns their ids. Caller (index.ts) stops here. */
export async function createApprovalRequest(actionId: string, instagramAccountId: string, summary: string): Promise<{ approvalId: string }> {
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: instagramAccountId },
    select: { userId: true },
  });

  const approval = await prisma.approval.create({
    data: {
      actionId,
      status: "PENDING",
      expiresAt: new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: account.userId,
      type: "APPROVAL_NEEDED",
      title: "إجراء بانتظار موافقتك",
      body: summary,
      relatedActionId: actionId,
    },
  });

  return { approvalId: approval.id };
}
