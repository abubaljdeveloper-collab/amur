import { prisma } from "@instagram-agent/db";
import { getClientForAccount } from "../account-client";

export async function executeSendMessage(
  instagramAccountId: string,
  payload: { instagramConversationId: string; recipientId: string; message: string },
) {
  const { client, accessToken } = await getClientForAccount(instagramAccountId);
  const { messageId } = await client.sendMessage(payload.recipientId, payload.message, accessToken);

  const conversation = await prisma.conversation.findUnique({
    where: { instagramConversationId: payload.instagramConversationId },
    select: { id: true },
  });
  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        instagramMessageId: messageId,
        direction: "OUTBOUND",
        senderType: "AI_AGENT",
        text: payload.message,
      },
    });
  }

  return { messageId };
}
