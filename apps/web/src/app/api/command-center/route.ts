import { NextResponse } from "next/server";
import { z } from "zod";
import { runCommand } from "@instagram-agent/agents";
import { getCurrentAccount, requireUserId } from "@/lib/current-account";

const bodySchema = z.object({ command: z.string().min(1) });

export async function POST(request: Request) {
  await requireUserId();
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await runCommand(account.id, parsed.data.command);
  return NextResponse.json({ result });
}
