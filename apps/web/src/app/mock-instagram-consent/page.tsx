"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function MockConsentForm() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";

  function authorize() {
    const code = `mock_auth_code_${Math.random().toString(36).slice(2)}`;
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <p className="mb-1 text-xs font-medium text-neutral-400">وضع تجريبي (Mock) — ليس Instagram الحقيقي</p>
      <h1 className="mb-4 text-lg font-semibold">السماح لـ &quot;Instagram AI Agent&quot; بالوصول لحسابك؟</h1>
      <ul className="mb-6 space-y-1 text-right text-sm text-neutral-600">
        <li>• قراءة معلومات الحساب الأساسية</li>
        <li>• نشر المحتوى</li>
        <li>• إدارة التعليقات</li>
        <li>• إدارة الرسائل</li>
      </ul>
      <button onClick={authorize} className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
        السماح
      </button>
    </div>
  );
}

export default function MockInstagramConsentPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <MockConsentForm />
      </Suspense>
    </div>
  );
}
