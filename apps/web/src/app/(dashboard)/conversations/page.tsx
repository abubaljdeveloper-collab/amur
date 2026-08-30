import Link from "next/link";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";

export default async function ConversationsPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const conversations = await prisma.conversation.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">الرسائل</h1>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {conversations.length === 0 && <p className="p-4 text-sm text-neutral-500">لا توجد محادثات بعد.</p>}
        {conversations.map((c) => (
          <Link key={c.id} href={`/conversations/${c.id}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
            <div>
              <p className="text-sm font-medium">@{c.participantUsername}</p>
              {c.classification && <p className="text-xs text-neutral-500">{c.classification}</p>}
            </div>
            {c.status === "ESCALATED" && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">⚠️ يحتاج تدخل</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
