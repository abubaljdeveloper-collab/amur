import Link from "next/link";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  PROCESSED: "تمت المعالجة",
  REPLIED: "تم الرد",
  IGNORED: "تم التجاهل",
  ESCALATED: "مُصعّد",
};

export default async function CommentsPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const comments = await prisma.comment.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">التعليقات</h1>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {comments.length === 0 && <p className="p-4 text-sm text-neutral-500">لا توجد تعليقات بعد.</p>}
        {comments.map((c) => (
          <Link key={c.id} href={`/comments/${c.id}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
            <div>
              <p className="text-sm font-medium">@{c.authorUsername}</p>
              <p className="text-sm text-neutral-600">{c.text}</p>
            </div>
            <div className="flex items-center gap-2">
              {c.classification && <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{c.classification}</span>}
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">{STATUS_LABELS[c.status] ?? c.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
