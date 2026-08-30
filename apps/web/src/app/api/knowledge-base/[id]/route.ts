import { NextResponse } from "next/server";
import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;

  const entry = await prisma.knowledgeBase.findFirst({ where: { id, instagramAccount: { userId } } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.knowledgeBase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
