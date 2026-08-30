import { NextResponse } from "next/server";
import { generateWeeklySummary } from "@instagram-agent/agents";
import { getCurrentAccount, requireUserId } from "@/lib/current-account";

export async function POST() {
  await requireUserId();
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const summary = await generateWeeklySummary(account.id);
  return NextResponse.json({ summary });
}
