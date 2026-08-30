import { prisma } from "@instagram-agent/db";
import { getClientForAccount } from "../account-client";

export async function executeHideComment(
  instagramAccountId: string,
  payload: { instagramCommentId: string; hide: boolean },
) {
  const { client, accessToken } = await getClientForAccount(instagramAccountId);
  await client.hideComment(payload.instagramCommentId, payload.hide, accessToken);

  await prisma.comment.updateMany({
    where: { instagramCommentId: payload.instagramCommentId },
    data: { status: payload.hide ? "IGNORED" : "PROCESSED" },
  });
}

export async function executeDeleteComment(instagramAccountId: string, payload: { instagramCommentId: string }) {
  const { client, accessToken } = await getClientForAccount(instagramAccountId);
  await client.deleteComment(payload.instagramCommentId, accessToken);

  await prisma.comment.updateMany({
    where: { instagramCommentId: payload.instagramCommentId },
    data: { status: "IGNORED" },
  });
}
