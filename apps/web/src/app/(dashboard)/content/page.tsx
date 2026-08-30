import Link from "next/link";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";

const STATUS_LABELS: Record<string, string> = {
  IDEA: "فكرة",
  DRAFT: "مسودة",
  REVIEW: "قيد المراجعة",
  PENDING_APPROVAL: "بانتظار الموافقة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  SCHEDULED: "مجدول",
  PUBLISHING: "قيد النشر",
  PUBLISHED: "منشور",
  FAILED: "فشل",
  ARCHIVED: "مؤرشف",
};

export default async function ContentListPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const items = await prisma.content.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">المحتوى</h1>
        <Link href="/content/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          + محتوى جديد
        </Link>
      </div>

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.length === 0 && <p className="p-4 text-sm text-neutral-500">لا يوجد محتوى بعد.</p>}
        {items.map((item) => (
          <Link key={item.id} href={`/content/${item.id}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
            <div>
              <p className="font-medium">{item.topic ?? item.caption?.slice(0, 60) ?? "بدون عنوان"}</p>
              <p className="text-xs text-neutral-500">{item.type}</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">{STATUS_LABELS[item.status] ?? item.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
