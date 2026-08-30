import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@instagram-agent/db";
import { getStorageAdapter } from "@instagram-agent/storage";
import { requireOwnedContent } from "@/lib/require-content";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let content;
  try {
    content = await requireOwnedContent(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const mediaType = ["mp4", "mov"].includes(ext) ? "VIDEO" : "IMAGE";
  const key = `content/${id}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  await storage.upload(key, buffer, file.type || "application/octet-stream");

  const media = await prisma.media.create({
    data: { contentId: id, storageKey: key, type: mediaType, order: content.media.length },
  });

  return NextResponse.json({ media }, { status: 201 });
}
