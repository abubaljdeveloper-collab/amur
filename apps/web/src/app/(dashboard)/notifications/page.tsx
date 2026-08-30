import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";
import { NotificationRow } from "./notification-row";

const TYPE_LABELS: Record<string, string> = {
  APPROVAL_NEEDED: "بانتظار موافقتك",
  ESCALATION: "⚠️ تصعيد",
  PUBLISH_SUCCESS: "تم النشر",
  PUBLISH_FAILED: "فشل النشر",
  TOKEN_EXPIRING: "انتهاء صلاحية الرمز",
  SYSTEM_ALERT: "تنبيه نظام",
};

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">التنبيهات</h1>
      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {notifications.length === 0 && <p className="p-4 text-sm text-neutral-500">لا توجد تنبيهات.</p>}
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            id={n.id}
            title={n.title}
            body={n.body}
            typeLabel={TYPE_LABELS[n.type] ?? n.type}
            isRead={n.isRead}
          />
        ))}
      </div>
    </div>
  );
}
