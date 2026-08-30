"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentSettings } from "@instagram-agent/db";

const AUTONOMY_LEVELS: Array<{ value: string; label: string }> = [
  { value: "LEVEL_0_MANUAL", label: "المستوى 0 — اقتراحات فقط" },
  { value: "LEVEL_1_ASSISTED", label: "المستوى 1 — الوكيل ينشئ، المالك يوافق" },
  { value: "LEVEL_2_APPROVAL_REQUIRED", label: "المستوى 2 — موافقة مطلوبة لكل إجراء (الافتراضي)" },
  { value: "LEVEL_3_AUTO_LOW_RISK", label: "المستوى 3 — تنفيذ تلقائي للمخاطر المنخفضة/المتوسطة" },
  { value: "LEVEL_4_FULL_AUTO", label: "المستوى 4 — استقلالية كاملة" },
];

const TOGGLE_FIELDS: Array<{ key: keyof AgentSettings; label: string }> = [
  { key: "contentEnabled", label: "المحتوى" },
  { key: "publishingEnabled", label: "النشر" },
  { key: "commentsEnabled", label: "التعليقات" },
  { key: "dmsEnabled", label: "الرسائل الخاصة" },
  { key: "analyticsEnabled", label: "التحليلات" },
];

export function AgentSettingsForm({ settings }: { settings: AgentSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    autonomyLevel: settings.autonomyLevel,
    contentEnabled: settings.contentEnabled,
    publishingEnabled: settings.publishingEnabled,
    commentsEnabled: settings.commentsEnabled,
    dmsEnabled: settings.dmsEnabled,
    analyticsEnabled: settings.analyticsEnabled,
    agentName: settings.agentName,
    personalityPrompt: settings.personalityPrompt,
    brandVoice: settings.brandVoice,
    language: settings.language,
    dialect: settings.dialect ?? "",
    emojiPolicy: settings.emojiPolicy,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">تم الحفظ</p>}

      <div>
        <label className="mb-1 block text-sm font-medium">مستوى الاستقلالية</label>
        <select
          value={form.autonomyLevel}
          onChange={(e) => setForm((f) => ({ ...f, autonomyLevel: e.target.value as AgentSettings["autonomyLevel"] }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {AUTONOMY_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">القدرات المفعّلة</p>
        <div className="grid grid-cols-2 gap-2">
          {TOGGLE_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[f.key as keyof typeof form] as boolean}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">اسم الوكيل</label>
          <input value={form.agentName} onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الشخصية / النبرة</label>
          <textarea value={form.personalityPrompt} onChange={(e) => setForm((f) => ({ ...f, personalityPrompt: e.target.value }))} rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">صوت العلامة</label>
          <input value={form.brandVoice} onChange={(e) => setForm((f) => ({ ...f, brandVoice: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">اللغة</label>
            <input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">اللهجة</label>
            <input value={form.dialect} onChange={(e) => setForm((f) => ({ ...f, dialect: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">سياسة الرموز التعبيرية</label>
          <select value={form.emojiPolicy} onChange={(e) => setForm((f) => ({ ...f, emojiPolicy: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="none">بدون</option>
            <option value="moderate">محدود</option>
            <option value="frequent">متكرر</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={busy} className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
