import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@instagram-agent/db";
import { getCurrentAccount, requireUserId } from "@/lib/current-account";

const bodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1).default("general"),
});

export async function POST(request: Request) {
  await requireUserId();
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const entry = await prisma.knowledgeBase.create({
    data: { instagramAccountId: account.id, ...parsed.data },
  });
  return NextResponse.json({ entry }, { status: 201 });
}
