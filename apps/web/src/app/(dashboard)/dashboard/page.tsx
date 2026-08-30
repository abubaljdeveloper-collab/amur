import Link from "next/link";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";
import { DevSimulatePanel } from "@/components/dev-simulate-panel";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const account = await getCurrentAccount();

  if (!account) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
        <p className="mb-4 text-neutral-600">لم يتم ربط أي حساب Instagram بعد.</p>
        <Link href="/accounts/connect" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          ربط حساب Instagram
        </Link>
      </div>
    );
  }

  const [settings, latestAnalytics, pendingApprovals, unreadNotifications] = await Promise.all([
    prisma.agentSettings.findUnique({ where: { instagramAccountId: account.id } }),
    prisma.analytics.findFirst({ where: { instagramAccountId: account.id }, orderBy: { metricDate: "desc" } }),
    prisma.approval.count({ where: { status: "PENDING", action: { instagramAccountId: account.id } } }),
    prisma.notification.count({ where: { userId: account.userId, isRead: false } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">📊 أداء الحساب @{account.username}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.status === "CONNECTED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {account.status === "CONNECTED" ? "🟢 متصل" : account.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="المتابعون" value={latestAnalytics?.followersCount ?? "—"} />
        <StatCard label="الوصول" value={latestAnalytics?.reach ?? "—"} />
        <StatCard label="نسبة التفاعل" value={latestAnalytics ? `${latestAnalytics.engagementRate}%` : "—"} />
        <StatCard label="مشاهدات الملف" value={latestAnalytics?.profileViews ?? "—"} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">🤖 حالة الوكيل</h2>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          <span>المحتوى: {settings?.contentEnabled ? "مفعّل" : "متوقف"}</span>
          <span>النشر: {settings?.publishingEnabled ? "مفعّل" : "متوقف"}</span>
          <span>التعليقات: {settings?.commentsEnabled ? "مفعّل" : "متوقف"}</span>
          <span>الرسائل: {settings?.dmsEnabled ? "مفعّل" : "متوقف"}</span>
          <span>التحليلات: {settings?.analyticsEnabled ? "مفعّل" : "متوقف"}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">مستوى الاستقلالية: {settings?.autonomyLevel}</p>
        <Link href="/settings/agent" className="mt-3 inline-block text-sm text-blue-600 underline">تعديل الإعدادات</Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/approvals" className="rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50">
          <p className="text-sm text-neutral-500">بانتظار الموافقة</p>
          <p className="mt-1 text-2xl font-semibold">{pendingApprovals}</p>
        </Link>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">تنبيهات غير مقروءة</p>
          <p className="mt-1 text-2xl font-semibold">{unreadNotifications}</p>
        </div>
      </div>

      {process.env.NODE_ENV !== "production" && <DevSimulatePanel />}
    </div>
  );
}
