import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@instagram-agent/config";
import { getInstagramClient } from "@instagram-agent/instagram-client";
import { requireUserId } from "@/lib/current-account";

export async function GET() {
  await requireUserId(); // throws (500) if not authenticated — middleware already guards this route's page, this guards the API call itself

  const env = getEnv();
  const client = getInstagramClient();
  const state = randomUUID();

  const url = client.getOAuthUrl(env.INSTAGRAM_REDIRECT_URI, state);
  const res = NextResponse.redirect(url);
  res.cookies.set("ig_oauth_state", state, { httpOnly: true, maxAge: 600, path: "/", sameSite: "lax" });
  return res;
}
