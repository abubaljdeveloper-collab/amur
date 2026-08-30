import { syncAccountAnalytics } from "@instagram-agent/agents";
import { prisma } from "@instagram-agent/db";

export async function processAnalyticsSync(): Promise<{ synced: number; failed: number }> {
  const accounts = await prisma.instagramAccount.findMany({
    where: { status: "CONNECTED" },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  for (const account of accounts) {
    try {
      await syncAccountAnalytics(account.id);
      synced++;
    } catch (err) {
      failed++;
      console.error(`[analytics-sync] Failed for account ${account.id}:`, err);
    }
  }
  return { synced, failed };
}
