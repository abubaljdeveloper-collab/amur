import { NextResponse } from "next/server";
import { getEnv } from "@instagram-agent/config";
import { encryptSecret } from "@instagram-agent/crypto";
import { prisma } from "@instagram-agent/db";
import { getInstagramClient } from "@instagram-agent/instagram-client";
import { requireUserId } from "@/lib/current-account";

export async function GET(request: Request) {
  const userId = await requireUserId();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/ig_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/accounts/connect?error=invalid_state", url.origin));
  }

  const env = getEnv();
  const client = getInstagramClient();

  const tokenResult = await client.exchangeCodeForToken(code, env.INSTAGRAM_REDIRECT_URI);
  const accountInfo = await client.getAccountInfo(tokenResult.accessToken, tokenResult.instagramUserId);

  await prisma.instagramAccount.upsert({
    where: { instagramUserId: tokenResult.instagramUserId },
    update: {
      userId,
      username: accountInfo.username,
      profilePictureUrl: accountInfo.profilePictureUrl,
      accessTokenEncrypted: encryptSecret(tokenResult.accessToken, env.ENCRYPTION_KEY),
      tokenExpiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
      status: "CONNECTED",
    },
    create: {
      userId,
      instagramUserId: tokenResult.instagramUserId,
      username: accountInfo.username,
      profilePictureUrl: accountInfo.profilePictureUrl,
      accountType: accountInfo.accountType,
      accessTokenEncrypted: encryptSecret(tokenResult.accessToken, env.ENCRYPTION_KEY),
      tokenExpiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
      status: "CONNECTED",
      agentSettings: { create: {} },
    },
  });

  const res = NextResponse.redirect(new URL("/dashboard", url.origin));
  res.cookies.delete("ig_oauth_state");
  return res;
}
