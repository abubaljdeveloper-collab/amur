import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@instagram-agent/db";
import { resumeAfterApproval } from "@instagram-agent/decision-engine";
import { requireUserId } from "@/lib/current-account";

const bodySchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  editedPayload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;

  const approval = await prisma.approval.findFirst({
    where: { id, action: { instagramAccount: { userId } } },
  });
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await resumeAfterApproval(id, parsed.data.decision, userId, parsed.data.editedPayload);
  return NextResponse.json({ result });
}
