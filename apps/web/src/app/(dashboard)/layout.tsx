import Link from "next/link";
import { getCurrentAccount } from "@/lib/current-account";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/notifications", label: "التنبيهات" },
  { href: "/content", label: "المحتوى" },
  { href: "/approvals", label: "الموافقات" },
  { href: "/comments", label: "التعليقات" },
  { href: "/conversations", label: "الرسائل" },
  { href: "/analytics", label: "التحليلات" },
  { href: "/command-center", label: "مركز الأوامر" },
  { href: "/settings/agent", label: "إعدادات الوكيل" },
  { href: "/settings/knowledge-base", label: "قاعدة المعرفة" },
  { href: "/settings/audit-log", label: "سجل التدقيق" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 border-l border-neutral-200 bg-white p-4 md:block">
        <div className="mb-6">
          <p className="text-sm font-semibold">Instagram AI Agent</p>
          {account ? (
            <p className="mt-1 text-xs text-neutral-500">@{account.username}</p>
          ) : (
            <Link href="/accounts/connect" className="mt-1 block text-xs text-blue-600 underline">
              ربط حساب Instagram
            </Link>
          )}
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
