"use client";

import { useState } from "react";

interface ChatMessage {
  role: "owner" | "agent";
  text: string;
}

const SUGGESTIONS = [
  "أنشئ لي خطة محتوى لهذا الأسبوع",
  "ما أفضل نوع محتوى عندي؟",
  "لماذا انخفض التفاعل هذا الأسبوع؟",
];

export default function CommandCenterPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(command: string) {
    if (!command.trim()) return;
    setMessages((m) => [...m, { role: "owner", text: command }]);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/command-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setBusy(false);
    setMessages((m) => [...m, { role: "agent", text: res.ok ? data.result.responseText : (data.error ?? "حدث خطأ") }]);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col space-y-4">
      <h1 className="text-xl font-semibold">مركز الأوامر</h1>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100">
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        {messages.length === 0 && <p className="text-sm text-neutral-400">اكتب أمرًا للوكيل، مثل &quot;راجع المنشورات المجدولة&quot;.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "owner" ? "mr-0 ml-auto bg-neutral-900 text-white" : "bg-neutral-100"}`}>
            {m.text}
          </div>
        ))}
        {busy && <p className="text-xs text-neutral-400">الوكيل يكتب...</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب أمرك هنا..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          إرسال
        </button>
      </form>
    </div>
  );
}
