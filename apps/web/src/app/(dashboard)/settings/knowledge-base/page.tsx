import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";
import { KnowledgeBaseManager } from "./knowledge-base-manager";

export default async function KnowledgeBasePage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const entries = await prisma.knowledgeBase.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">قاعدة المعرفة</h1>
      <KnowledgeBaseManager entries={entries.map((e) => ({ id: e.id, title: e.title, content: e.content, category: e.category }))} />
    </div>
  );
}
