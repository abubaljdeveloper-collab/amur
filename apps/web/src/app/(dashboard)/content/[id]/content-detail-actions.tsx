"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContentDetailActions({
  contentId,
  status,
  scheduledAt,
}: {
  contentId: string;
  status: string;
  scheduledAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState(scheduledAt?.slice(0, 16) ?? "");

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "حدث خطأ");
      return;
    }
    setMessage("تم بنجاح");
    router.refresh();
  }

  async function uploadFile(file: File) {
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/content/${contentId}/media`, { method: "POST", body: formData });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm">{message}</p>}

      {(status === "DRAFT" || status === "REVIEW") && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium">رفع وسائط</p>
          <input
            type="file"
            accept="image/*,video/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
            className="text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(status === "DRAFT" || status === "REVIEW") && (
          <>
            <button disabled={busy} onClick={() => call(`/api/content/${contentId}/approve`)} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              ✓ موافقة
            </button>
            <button disabled={busy} onClick={() => call(`/api/content/${contentId}/reject`)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              ❌ رفض
            </button>
          </>
        )}

        {status === "APPROVED" && (
          <button disabled={busy} onClick={() => call(`/api/content/${contentId}/publish-now`)} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            نشر الآن
          </button>
        )}
      </div>

      {status === "APPROVED" && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium">جدولة النشر</p>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              disabled={busy || !scheduleValue}
              onClick={() => call(`/api/content/${contentId}/schedule`, { scheduledAt: new Date(scheduleValue).toISOString() })}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              جدولة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
