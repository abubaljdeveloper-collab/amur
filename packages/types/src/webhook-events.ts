import { z } from "zod";

export const webhookEventTypeSchema = z.enum(["NEW_COMMENT", "NEW_MESSAGE", "MENTION", "MEDIA_EVENT"]);
export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;

/** Normalized shape produced by the webhook route before enqueueing — one job per event. */
export const normalizedWebhookEventSchema = z.object({
  type: webhookEventTypeSchema,
  instagramAccountId: z.string(),
  rawPayload: z.record(z.string(), z.unknown()),
  receivedAt: z.string().datetime(),
});
export type NormalizedWebhookEvent = z.infer<typeof normalizedWebhookEventSchema>;
