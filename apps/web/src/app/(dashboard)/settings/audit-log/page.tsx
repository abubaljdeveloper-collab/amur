import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";

export default async function AuditLogPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const entries = await prisma.auditLog.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">سجل التدقيق</h1>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-right text-xs text-neutral-500">
              <th className="p-3">الوقت</th>
              <th className="p-3">الجهة</th>
              <th className="p-3">النوع</th>
              <th className="p-3">الحدث</th>
              <th className="p-3">تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 align-top">
                <td className="whitespace-nowrap p-3 text-xs">{e.createdAt.toLocaleString("ar")}</td>
                <td className="p-3 text-xs">{e.actorType}</td>
                <td className="p-3 text-xs">{e.entityType}</td>
                <td className="p-3 text-xs">{e.eventType}</td>
                <td className="max-w-xs p-3 text-xs text-neutral-500">
                  {e.metadata ? <pre className="whitespace-pre-wrap">{JSON.stringify(e.metadata)}</pre> : "—"}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-neutral-500">لا توجد إدخالات بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
