import { prisma } from "@instagram-agent/db";
import { requireUserId } from "@/lib/current-account";

/** Loads a Content row and throws unless it belongs to an account owned by the current user. */
export async function requireOwnedContent(contentId: string) {
  const userId = await requireUserId();
  const content = await prisma.content.findFirst({
    where: { id: contentId, instagramAccount: { userId } },
    include: { media: true, calendar: true },
  });
  if (!content) throw new Error("Content not found or not owned by current user");
  return content;
}
