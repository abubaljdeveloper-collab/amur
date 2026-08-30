"use client";

import { useRouter } from "next/navigation";

export function NotificationRow({
  id,
  title,
  body,
  typeLabel,
  isRead,
}: {
  id: string;
  title: string;
  body: string;
  typeLabel: string;
  isRead: boolean;
}) {
  const router = useRouter();

  async function markRead() {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className={`flex items-start justify-between p-4 ${isRead ? "" : "bg-blue-50/50"}`}>
      <div>
        <p className="text-xs text-neutral-400">{typeLabel}</p>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-neutral-600">{body}</p>
      </div>
      {!isRead && (
        <button onClick={markRead} className="whitespace-nowrap text-xs text-blue-600 underline">
          تمييز كمقروء
        </button>
      )}
    </div>
  );
}
