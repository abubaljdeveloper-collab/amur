"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Dev-only helper UI for /api/dev/simulate-event — lets you exercise the full webhook
 * pipeline (signature check -> queue -> worker -> agent -> Decision Engine) from the browser. */
export function DevSimulatePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function simulate(type: "NEW_COMMENT" | "NEW_MESSAGE") {
    setBusy(true);
    setResult(null);
    const body =
      type === "NEW_COMMENT"
        ? { type, text: "كيف أقدر أطلب المنتج؟", authorUsername: "curious_follower" }
        : { type, text: "السلام عليكم، كم السعر؟", participantUsername: "potential_customer" };

    const res = await fetch("/api/dev/simulate-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    setResult(res.ok ? `تم الإرسال (status ${data.webhookResponseStatus}) — راجع التعليقات/الرسائل خلال ثوانٍ` : data.error);
    setTimeout(() => router.refresh(), 3000);
  }

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4">
      <p className="mb-2 text-xs font-medium text-neutral-500">🧪 وضع تجريبي — محاكاة أحداث Instagram (Dev only)</p>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => simulate("NEW_COMMENT")} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50">
          محاكاة تعليق جديد
        </button>
        <button disabled={busy} onClick={() => simulate("NEW_MESSAGE")} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50">
          محاكاة رسالة جديدة
        </button>
      </div>
      {result && <p className="mt-2 text-xs text-neutral-500">{result}</p>}
    </div>
  );
}
