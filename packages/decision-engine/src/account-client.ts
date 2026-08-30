import { getEnv } from "@instagram-agent/config";
import { decryptSecret } from "@instagram-agent/crypto";
import { getDecryptedAccessToken, prisma } from "@instagram-agent/db";
import { getInstagramClient } from "@instagram-agent/instagram-client";

/** Resolves the InstagramClient (mock or real, per env) plus this account's decrypted token. */
export async function getClientForAccount(instagramAccountId: string) {
  const env = getEnv();
  const client = getInstagramClient();
  const accessToken = await getDecryptedAccessToken(instagramAccountId, decryptSecret, env.ENCRYPTION_KEY);
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: instagramAccountId },
    select: { instagramUserId: true },
  });
  return { client, accessToken, igUserId: account.instagramUserId };
}
