"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Entry {
  id: string;
  title: string;
  content: string;
  category: string;
}

export function KnowledgeBaseManager({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category }),
    });
    setTitle("");
    setContent("");
    setBusy(false);
    router.refresh();
  }

  async function removeEntry(id: string) {
    setBusy(true);
    await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addEntry} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="المحتوى" required rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="التصنيف" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={busy} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          + إضافة
        </button>
      </form>

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {entries.length === 0 && <p className="p-4 text-sm text-neutral-500">لا توجد إدخالات بعد.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start justify-between p-4">
            <div>
              <p className="text-sm font-medium">{entry.title} <span className="text-xs text-neutral-400">[{entry.category}]</span></p>
              <p className="text-sm text-neutral-600">{entry.content}</p>
            </div>
            <button disabled={busy} onClick={() => removeEntry(entry.id)} className="text-xs text-red-600 disabled:opacity-50">حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}
