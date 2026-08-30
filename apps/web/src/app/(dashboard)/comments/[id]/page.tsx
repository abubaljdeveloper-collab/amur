import { notFound } from "next/navigation";
import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";
import { CommentReplyActions } from "./comment-reply-actions";

export default async function CommentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const comment = await prisma.comment.findFirst({
    where: { id, instagramAccount: { userId } },
  });
  if (!comment) notFound();

  const pendingAction = await prisma.action.findFirst({
    where: { relatedCommentId: comment.id, status: "PENDING_APPROVAL" },
    include: { approval: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">تعليق من @{comment.authorUsername}</h1>

      {comment.status === "ESCALATED" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ هذا التعليق يحتاج إلى تدخل</p>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-3">
        <p className="text-sm">{comment.text}</p>
        {comment.classification && <p className="text-xs text-neutral-500">التصنيف: {comment.classification} — القرار المقترح: {comment.decision}</p>}
        {comment.reasoning && <p className="text-xs text-neutral-400">{comment.reasoning}</p>}
      </div>

      {pendingAction && (
        <CommentReplyActions
          approvalId={pendingAction.approval?.id ?? ""}
          instagramCommentId={comment.instagramCommentId}
          initialMessage={(pendingAction.payload as { message?: string }).message ?? ""}
        />
      )}
    </div>
  );
}
