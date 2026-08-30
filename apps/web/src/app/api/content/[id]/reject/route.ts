import { NextResponse } from "next/server";
import { prisma } from "@instagram-agent/db";
import { requireOwnedContent } from "@/lib/require-content";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedContent(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const content = await prisma.content.update({ where: { id }, data: { status: "REJECTED" } });
  return NextResponse.json({ content });
}
