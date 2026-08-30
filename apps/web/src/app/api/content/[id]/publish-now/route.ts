import { NextResponse } from "next/server";
import { publishContentNow } from "@instagram-agent/agents";
import { requireOwnedContent } from "@/lib/require-content";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let content;
  try {
    content = await requireOwnedContent(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (content.status !== "APPROVED") {
    return NextResponse.json({ error: "Content must be APPROVED before publishing" }, { status: 400 });
  }

  const decision = await publishContentNow(id);
  return NextResponse.json({ decision });
}
