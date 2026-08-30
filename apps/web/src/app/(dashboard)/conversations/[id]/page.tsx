import { notFound } from "next/navigation";
import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";
import { DmReplyActions } from "./dm-reply-actions";

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const conversation = await prisma.conversation.findFirst({
    where: { id, instagramAccount: { userId } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  const pendingAction = await prisma.action.findFirst({
    where: { relatedConversationId: conversation.id, status: "PENDING_APPROVAL" },
    include: { approval: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">محادثة مع @{conversation.participantUsername}</h1>

      {conversation.status === "ESCALATED" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ تحتاج إلى تدخل — راجع الرسائل وتواصل مباشرة إذا لزم الأمر</p>
      )}

      <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
        {conversation.messages.map((m) => (
          <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "INBOUND" ? "bg-neutral-100" : "mr-auto ml-0 bg-blue-100"}`}>
            <p>{m.text}</p>
            <p className="mt-1 text-[10px] text-neutral-400">{m.senderType}</p>
          </div>
        ))}
      </div>

      {pendingAction && (
        <DmReplyActions
          approvalId={pendingAction.approval?.id ?? ""}
          instagramConversationId={conversation.instagramConversationId}
          recipientId={conversation.participantId}
          initialMessage={(pendingAction.payload as { message?: string }).message ?? ""}
        />
      )}
    </div>
  );
}
