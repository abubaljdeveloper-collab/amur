"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DmReplyActions({
  approvalId,
  instagramConversationId,
  recipientId,
  initialMessage,
}: {
  approvalId: string;
  instagramConversationId: string;
  recipientId: string;
  initialMessage: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    await fetch(`/api/approvals/${approvalId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        editedPayload: decision === "APPROVED" ? { instagramConversationId, recipientId, message } : undefined,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
      <p className="text-sm font-medium">الرد المقترح (قابل للتعديل)</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => decide("APPROVED")} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          ✓ إرسال
        </button>
        <button disabled={busy} onClick={() => decide("REJECTED")} className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium disabled:opacity-50">
          عدم الإرسال
        </button>
      </div>
    </div>
  );
}
