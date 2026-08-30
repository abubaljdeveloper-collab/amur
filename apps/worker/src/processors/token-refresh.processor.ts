import { getEnv } from "@instagram-agent/config";
import { decryptSecret, encryptSecret } from "@instagram-agent/crypto";
import { prisma } from "@instagram-agent/db";
import { getInstagramClient } from "@instagram-agent/instagram-client";

const REFRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // refresh tokens expiring within 3 days

export async function processTokenRefresh(): Promise<{ refreshed: number; failed: number }> {
  const env = getEnv();
  const client = getInstagramClient();

  const accounts = await prisma.instagramAccount.findMany({
    where: {
      status: "CONNECTED",
      tokenExpiresAt: { lte: new Date(Date.now() + REFRESH_WINDOW_MS) },
    },
    select: { id: true, userId: true, accessTokenEncrypted: true },
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const currentToken = decryptSecret(account.accessTokenEncrypted, env.ENCRYPTION_KEY);
      const { accessToken, expiresIn } = await client.refreshLongLivedToken(currentToken);
      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptSecret(accessToken, env.ENCRYPTION_KEY),
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      });
      refreshed++;
    } catch (err) {
      failed++;
      console.error(`[token-refresh] Failed for account ${account.id}:`, err);
      await prisma.instagramAccount.update({ where: { id: account.id }, data: { status: "TOKEN_EXPIRED" } });
      await prisma.notification.create({
        data: {
          userId: account.userId,
          type: "TOKEN_EXPIRING",
          title: "⚠️ يحتاج الحساب إلى إعادة المصادقة",
          body: "فشل تجديد رمز الوصول تلقائيًا. الرجاء إعادة ربط حساب Instagram.",
        },
      });
    }
  }

  return { refreshed, failed };
}
