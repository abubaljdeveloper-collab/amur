import { getEnv } from "@instagram-agent/config";

export default async function ConnectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const env = getEnv();

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <h1 className="mb-2 text-xl font-semibold">ربط حساب Instagram</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {env.INSTAGRAM_CLIENT_MODE === "mock"
          ? "الوضع الحالي: تجريبي (Mock) — لا حاجة لحساب Meta حقيقي أثناء التطوير."
          : "سيتم توجيهك إلى Instagram لتسجيل الدخول والموافقة على الصلاحيات."}
      </p>
      {params.error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">تعذر إتمام الربط، حاول مرة أخرى.</p>}
      <a href="/api/instagram/oauth/start" className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
        ربط الحساب
      </a>
    </div>
  );
}
