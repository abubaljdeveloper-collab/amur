import { prisma } from "@instagram-agent/db";
import { getCurrentAccount } from "@/lib/current-account";
import { AgentSettingsForm } from "./agent-settings-form";

export default async function AgentSettingsPage() {
  const account = await getCurrentAccount();
  if (!account) return <p className="text-sm text-neutral-500">لا يوجد حساب مرتبط.</p>;

  const settings = await prisma.agentSettings.findUniqueOrThrow({ where: { instagramAccountId: account.id } });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">إعدادات الوكيل</h1>
      <AgentSettingsForm settings={settings} />
    </div>
  );
}
