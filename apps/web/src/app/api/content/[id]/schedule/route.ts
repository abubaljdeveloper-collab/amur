import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@instagram-agent/db";
import { enqueuePublishAt } from "@instagram-agent/queue";
import { requireOwnedContent } from "@/lib/require-content";

const bodySchema = z.object({ scheduledAt: z.string().datetime() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let content;
  try {
    content = await requireOwnedContent(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (content.status !== "APPROVED") {
    return NextResponse.json({ error: "Content must be APPROVED before scheduling" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const scheduledAt = new Date(parsed.data.scheduledAt);
  const calendarEntry = await prisma.contentCalendar.upsert({
    where: { contentId: id },
    update: { scheduledAt },
    create: { contentId: id, scheduledAt },
  });

  await prisma.content.update({ where: { id }, data: { status: "SCHEDULED" } });
  await enqueuePublishAt({ contentCalendarId: calendarEntry.id }, scheduledAt, `publish:${calendarEntry.id}`);

  return NextResponse.json({ calendarEntry });
}
