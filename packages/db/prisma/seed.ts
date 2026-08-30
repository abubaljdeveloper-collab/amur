import { PrismaClient } from "@prisma/client";
import { randomBytes, createCipheriv } from "node:crypto";

// Loads .env from cwd (packages/db/.env, symlinked to the repo-root .env) — must run
// before `new PrismaClient()` reads DATABASE_URL.
process.loadEnvFile();

const prisma = new PrismaClient();

// Minimal local re-implementation to avoid a cross-package import from prisma/seed.ts.
function encryptSecret(plaintext: string, encryptionKeyBase64: string): string {
  const key = Buffer.from(encryptionKeyBase64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

async function main() {
  const encryptionKey = process.env["ENCRYPTION_KEY"];
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY must be set (see .env.example) before seeding.");
  }

  const user = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Demo Owner",
    },
  });

  const account = await prisma.instagramAccount.upsert({
    where: { instagramUserId: "mock_ig_user_1" },
    update: {},
    create: {
      userId: user.id,
      instagramUserId: "mock_ig_user_1",
      username: "demo_account",
      accessTokenEncrypted: encryptSecret("mock-access-token", encryptionKey),
      status: "CONNECTED",
      agentSettings: {
        create: {
          agentName: "عامر AI",
          personalityPrompt: "ودية، مختصرة، شبابية. لهجة عمانية عند الحاجة.",
          brandVoice: "friendly, concise, helpful",
          language: "ar",
          dialect: "omani",
        },
      },
    },
  });

  await prisma.knowledgeBase.createMany({
    data: [
      {
        instagramAccountId: account.id,
        title: "كيف أطلب المنتج",
        content: "تقدر تطلب المنتج من خلال الرابط الموجود في البايو، أو تراسلنا مباشرة هنا.",
        category: "sales",
      },
      {
        instagramAccountId: account.id,
        title: "سياسة الاسترجاع",
        content:
          "لطلبات الاسترجاع أو الاستبدال، يرجى التواصل مع فريق الدعم مباشرة — لا يتم اتخاذ قرار الاسترجاع تلقائيًا.",
        category: "support",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:", { userId: user.id, instagramAccountId: account.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
