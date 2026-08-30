import { NextResponse } from "next/server";
import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;

  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
