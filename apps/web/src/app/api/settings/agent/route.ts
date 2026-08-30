import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount, requireUserId } from "@/lib/current-account";

const bodySchema = z.object({
  autonomyLevel: z.enum(["LEVEL_0_MANUAL", "LEVEL_1_ASSISTED", "LEVEL_2_APPROVAL_REQUIRED", "LEVEL_3_AUTO_LOW_RISK", "LEVEL_4_FULL_AUTO"]),
  contentEnabled: z.boolean(),
  publishingEnabled: z.boolean(),
  commentsEnabled: z.boolean(),
  dmsEnabled: z.boolean(),
  analyticsEnabled: z.boolean(),
  agentName: z.string().min(1),
  personalityPrompt: z.string(),
  brandVoice: z.string(),
  language: z.string().min(1),
  dialect: z.string().optional(),
  emojiPolicy: z.string(),
});

export async function POST(request: Request) {
  await requireUserId();
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const settings = await prisma.agentSettings.update({
    where: { instagramAccountId: account.id },
    data: parsed.data,
  });

  return NextResponse.json({ settings });
}
