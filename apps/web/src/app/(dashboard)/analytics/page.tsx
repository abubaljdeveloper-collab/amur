import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";
import { AnalyticsActions } from "./analytics-actions";

export default async function AnalyticsPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const metrics = await prisma.analytics.findMany({
    where: { instagramAccountId: account.id },
    orderBy: { metricDate: "desc" },
    take: 14,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">📈 التحليلات</h1>
        <AnalyticsActions />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-right text-xs text-neutral-500">
              <th className="p-3">التاريخ</th>
              <th className="p-3">المتابعون</th>
              <th className="p-3">الوصول</th>
              <th className="p-3">الظهور</th>
              <th className="p-3">مشاهدات الملف</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100">
                <td className="p-3">{m.metricDate.toLocaleDateString("ar")}</td>
                <td className="p-3">{m.followersCount}</td>
                <td className="p-3">{m.reach}</td>
                <td className="p-3">{m.impressions}</td>
                <td className="p-3">{m.profileViews}</td>
              </tr>
            ))}
            {metrics.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-neutral-500">لا توجد بيانات بعد — اضغط &quot;مزامنة الآن&quot;</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
