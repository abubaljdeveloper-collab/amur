import { prisma } from "@instagram-agent/db";
import { getStorageAdapter } from "@instagram-agent/storage";
import { getClientForAccount } from "../account-client";

export async function executePublishContent(instagramAccountId: string, payload: { contentId: string }) {
  const content = await prisma.content.findUniqueOrThrow({
    where: { id: payload.contentId },
    include: { media: { orderBy: { order: "asc" } } },
  });

  const { client, accessToken, igUserId } = await getClientForAccount(instagramAccountId);
  const storage = getStorageAdapter();

  await prisma.content.update({ where: { id: content.id }, data: { status: "PUBLISHING" } });

  const mediaUrls = content.media.map((m) => storage.getPublicUrl(m.storageKey));
  const { mediaId } = await client.publishMedia({
    igUserId,
    accessToken,
    caption: content.caption ?? "",
    mediaType: content.type,
    mediaUrls,
  });

  await prisma.$transaction([
    prisma.content.update({
      where: { id: content.id },
      data: { status: "PUBLISHED", publishedMediaId: mediaId },
    }),
    prisma.contentCalendar.updateMany({
      where: { contentId: content.id },
      data: { publishedAt: new Date() },
    }),
  ]);

  return { mediaId };
}
