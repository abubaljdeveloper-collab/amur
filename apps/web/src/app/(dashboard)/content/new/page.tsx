"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONTENT_TYPES = [
  { value: "IMAGE", label: "صورة" },
  { value: "VIDEO", label: "فيديو" },
  { value: "REEL", label: "ريل" },
  { value: "CAROUSEL", label: "كاروسيل" },
  { value: "STORY", label: "ستوري" },
];

export default function NewContentPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("IMAGE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, contentType }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "فشل التوليد");
      return;
    }
    router.push(`/content/${body.content.id}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">محتوى جديد بالذكاء الاصطناعي</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="topic">الموضوع</label>
          <input
            id="topic"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="مثال: إطلاق منتج جديد"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="contentType">نوع المحتوى</label>
          <select
            id="contentType"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "جارٍ التوليد..." : "توليد المحتوى"}
        </button>
      </form>
    </div>
  );
}
