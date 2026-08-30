"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnalyticsActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; recommendations: string[] } | null>(null);

  async function sync() {
    setBusy(true);
    await fetch("/api/analytics/sync", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function getSummary() {
    setBusy(true);
    const res = await fetch("/api/analytics/summary", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setSummary(data.summary);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button disabled={busy} onClick={sync} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          مزامنة الآن
        </button>
        <button disabled={busy} onClick={getSummary} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          تحليل بالذكاء الاصطناعي
        </button>
      </div>
      {summary && (
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-4 text-right">
          <p className="text-sm">{summary.summary}</p>
          {summary.recommendations.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-neutral-600">
              {summary.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
