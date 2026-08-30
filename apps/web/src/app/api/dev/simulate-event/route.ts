import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@instagram-agent/config";
import { prisma } from "@instagram-agent/db";
import { MOCK_APP_SECRET } from "@instagram-agent/instagram-client";
import { requireUserId } from "@/lib/current-account";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NEW_COMMENT"), text: z.string().min(1), authorUsername: z.string().default("test_user") }),
  z.object({ type: z.literal("NEW_MESSAGE"), text: z.string().min(1), participantUsername: z.string().default("test_user") }),
]);

/**
 * Dev-only: builds a Meta-shaped webhook payload, signs it exactly like a real Meta
 * request would be, and POSTs it to the real /api/webhooks/instagram route — exercising
 * the entire pipeline (signature check, normalization, queue, worker, agent, Decision
 * Engine) without needing ngrok or a real Meta app.
 */
export async function POST(request: Request) {
  if (getEnv().NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const userId = await requireUserId();
  const account = await prisma.instagramAccount.findFirst({ where: { userId }, select: { instagramUserId: true } });
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const payload =
    parsed.data.type === "NEW_COMMENT"
      ? {
          object: "instagram",
          entry: [
            {
              id: account.instagramUserId,
              changes: [
                {
                  field: "comments",
                  value: {
                    id: `mock_comment_${randomUUID()}`,
                    text: parsed.data.text,
                    from: { username: parsed.data.authorUsername },
                    media: { id: `mock_media_${randomUUID()}` },
                  },
                },
              ],
            },
          ],
        }
      : {
          object: "instagram",
          entry: [
            {
              id: account.instagramUserId,
              messaging: [
                {
                  sender: { id: `mock_participant_${randomUUID()}`, username: parsed.data.participantUsername },
                  message: { mid: `mock_msg_${randomUUID()}`, text: parsed.data.text },
                },
              ],
            },
          ],
        };

  const rawBody = JSON.stringify(payload);
  const signature = "sha256=" + createHmac("sha256", MOCK_APP_SECRET).update(rawBody, "utf8").digest("hex");

  const webhookUrl = new URL("/api/webhooks/instagram", request.url);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-signature-256": signature },
    body: rawBody,
  });

  return NextResponse.json({ sentPayload: payload, webhookResponseStatus: res.status });
}
