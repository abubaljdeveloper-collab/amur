import { INSTAGRAM_ACCOUNT_SAFE_SELECT, prisma } from "@instagram-agent/db";
import { auth } from "@/lib/auth";

/** MVP is single-account-per-user; the dashboard always operates on the first connected account. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getCurrentAccount() {
  const userId = await requireUserId();
  return prisma.instagramAccount.findFirst({
    where: { userId },
    select: INSTAGRAM_ACCOUNT_SAFE_SELECT,
    orderBy: { connectedAt: "desc" },
  });
}
