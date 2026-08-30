import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton client shared across hot-reloads in dev (Next.js) and across the
 * worker process. Both apps import this instead of instantiating their own.
 */
export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}

export * from "@prisma/client";

/**
 * Every field on InstagramAccount EXCEPT accessTokenEncrypted. Import this everywhere
 * an account is read for API responses or UI so a future `select: undefined` (which
 * returns all columns) can't silently leak the encrypted token onto the wire.
 * The raw token is only ever read via `getDecryptedAccessToken` below, server-side,
 * immediately before a Graph API call.
 */
export const INSTAGRAM_ACCOUNT_SAFE_SELECT = {
  id: true,
  userId: true,
  instagramUserId: true,
  username: true,
  profilePictureUrl: true,
  accountType: true,
  tokenExpiresAt: true,
  status: true,
  connectedAt: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getDecryptedAccessToken(
  instagramAccountId: string,
  decrypt: (payload: string, key: string) => string,
  encryptionKey: string,
): Promise<string> {
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: instagramAccountId },
    select: { accessTokenEncrypted: true },
  });
  return decrypt(account.accessTokenEncrypted, encryptionKey);
}
