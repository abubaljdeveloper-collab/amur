import { prisma } from "@instagram-agent/db";
import { getClientForAccount } from "../account-client";

export async function executeReplyComment(
  instagramAccountId: string,
  payload: { instagramCommentId: string; message: string },
) {
  const { client, accessToken } = await getClientForAccount(instagramAccountId);
  const { replyId } = await client.replyToComment(payload.instagramCommentId, payload.message, accessToken);

  await prisma.comment.updateMany({
    where: { instagramCommentId: payload.instagramCommentId },
    data: { status: "REPLIED" },
  });

  return { replyId };
}
