import { getAiGateway } from "@instagram-agent/ai-gateway";
import { getEnv } from "@instagram-agent/config";
import { decryptSecret } from "@instagram-agent/crypto";
import { getDecryptedAccessToken, prisma } from "@instagram-agent/db";
import { getInstagramClient } from "@instagram-agent/instagram-client";
import type { AnalyticsSummary } from "@instagram-agent/types";
import { loadAccountContext } from "./account-context";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function syncAccountAnalytics(instagramAccountId: string): Promise<void> {
  const env = getEnv();
  const client = getInstagramClient();
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: instagramAccountId },
    select: { instagramUserId: true },
  });
  const accessToken = await getDecryptedAccessToken(instagramAccountId, decryptSecret, env.ENCRYPTION_KEY);

  const insights = await client.getAccountInsights(account.instagramUserId, accessToken);
  const metricDate = startOfDay(new Date());

  await prisma.analytics.upsert({
    where: { instagramAccountId_metricDate: { instagramAccountId, metricDate } },
    update: {
      followersCount: insights.followersCount,
      reach: insights.reach,
      impressions: insights.impressions,
      profileViews: insights.profileViews,
      raw: insights as never,
    },
    create: {
      instagramAccountId,
      metricDate,
      followersCount: insights.followersCount,
      reach: insights.reach,
      impressions: insights.impressions,
      profileViews: insights.profileViews,
      raw: insights as never,
    },
  });

  await prisma.instagramAccount.update({ where: { id: instagramAccountId }, data: { lastSyncedAt: new Date() } });
}

export async function generateWeeklySummary(instagramAccountId: string): Promise<AnalyticsSummary> {
  const account = await loadAccountContext(instagramAccountId);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMetrics = await prisma.analytics.findMany({
    where: { instagramAccountId, metricDate: { gte: sevenDaysAgo } },
    orderBy: { metricDate: "asc" },
  });

  return getAiGateway().generateAnalyticsSummary({
    account,
    metrics: { last7Days: recentMetrics },
  });
}
