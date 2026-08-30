import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCaption } from "@instagram-agent/agents";
import { requireUserId } from "@/lib/current-account";
import { getCurrentAccount } from "@/lib/current-account";

const bodySchema = z.object({
  topic: z.string().min(1),
  contentType: z.enum(["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"]),
});

export async function POST(request: Request) {
  await requireUserId();
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  try {
    const content = await generateCaption(account.id, parsed.data);
    return NextResponse.json({ content }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 500 });
  }
}
