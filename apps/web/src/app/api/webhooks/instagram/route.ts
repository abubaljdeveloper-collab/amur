import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@instagram-agent/config";
import { prisma } from "@instagram-agent/db";
import { getInstagramClient } from "@instagram-agent/instagram-client";
import { enqueueWebhookEvent } from "@instagram-agent/queue";
import { parseInstagramWebhookEntries, toNormalizedEvent } from "@/lib/parse-instagram-webhook";

/** Meta's verification handshake: GET with hub.mode/hub.verify_token/hub.challenge. */
export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  const client = getInstagramClient();
  if (!client.verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Ack immediately — Meta requires a response within 5s, all real work happens async in the worker.
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  void processAndEnqueue(body).catch((err) => console.error("[webhook] Failed to enqueue events:", err));

  return NextResponse.json({ received: true });
}

async function processAndEnqueue(body: Record<string, unknown>): Promise<void> {
  const entries = parseInstagramWebhookEntries(body);

  for (const { igUserId, events } of entries) {
    if (events.length === 0) continue;

    const account = await prisma.instagramAccount.findUnique({ where: { instagramUserId: igUserId }, select: { id: true } });
    if (!account) {
      console.warn(`[webhook] No InstagramAccount found for instagramUserId=${igUserId}, dropping ${events.length} event(s)`);
      continue;
    }

    for (const raw of events) {
      const normalized = toNormalizedEvent(raw, account.id);
      const jobId = createHash("sha256").update(JSON.stringify({ igUserId, raw })).digest("hex");
      await enqueueWebhookEvent(normalized, jobId);
    }
  }
}
