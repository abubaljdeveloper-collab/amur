import { prisma } from "@instagram-agent/db";

export async function executeEscalate(
  instagramAccountId: string,
  payload: { reason: string },
  related: { relatedCommentId?: string; relatedConversationId?: string },
) {
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: instagramAccountId },
    select: { userId: true },
  });

  if (related.relatedCommentId) {
    await prisma.comment.update({ where: { id: related.relatedCommentId }, data: { status: "ESCALATED" } });
  }
  if (related.relatedConversationId) {
    await prisma.conversation.update({ where: { id: related.relatedConversationId }, data: { status: "ESCALATED" } });
  }

  await prisma.notification.create({
    data: {
      userId: account.userId,
      type: "ESCALATION",
      title: "⚠️ تحتاج إلى تدخل",
      body: payload.reason,
      relatedConversationId: related.relatedConversationId,
    },
  });
}
