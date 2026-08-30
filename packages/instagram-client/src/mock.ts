import { randomUUID } from "node:crypto";
import { verifyHmacSignature } from "@instagram-agent/crypto";
import type {
  AccountInsights,
  InstagramAccountInfo,
  InstagramClient,
  InstagramComment,
  InstagramConversation,
  InstagramMessage,
  MediaInsights,
  PublishMediaParams,
  RefreshedToken,
  TokenExchangeResult,
} from "./types";

/** Shared with apps/web's dev-only /api/dev/simulate-event route so it can sign payloads the same way. */
export const MOCK_APP_SECRET = "mock-dev-app-secret";

/**
 * Deterministic fake Graph API so the entire pipeline (OAuth -> publish -> comments ->
 * DMs -> webhooks -> insights) is exercisable in local dev with no Meta app, no ngrok,
 * no real credentials. Token expiry is a short fake countdown (10 minutes) rather than
 * Meta's real ~60 days, so the refresh-token job path is actually testable in dev.
 */
export class MockInstagramClient implements InstagramClient {
  getOAuthUrl(redirectUri: string, state: string): string {
    const url = new URL("http://localhost:3000/mock-instagram-consent");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForToken(_code: string, _redirectUri: string): Promise<TokenExchangeResult> {
    return {
      accessToken: `mock-token-${randomUUID()}`,
      expiresIn: 60 * 10, // 10 minutes, simulated
      instagramUserId: "mock_ig_user_1",
    };
  }

  async refreshLongLivedToken(_accessToken: string): Promise<RefreshedToken> {
    return { accessToken: `mock-token-${randomUUID()}`, expiresIn: 60 * 10 };
  }

  async getAccountInfo(_accessToken: string, igUserId: string): Promise<InstagramAccountInfo> {
    return {
      instagramUserId: igUserId,
      username: "demo_account",
      profilePictureUrl: undefined,
      accountType: "BUSINESS",
    };
  }

  async publishMedia(params: PublishMediaParams): Promise<{ mediaId: string }> {
    if (params.mediaUrls.length === 0) {
      throw new Error("mediaUrls must not be empty — publishing requires at least one publicly reachable URL");
    }
    return { mediaId: `mock_media_${randomUUID()}` };
  }

  async getComments(mediaId: string, _accessToken: string): Promise<InstagramComment[]> {
    return [
      {
        id: `mock_comment_${randomUUID()}`,
        mediaId,
        authorUsername: "curious_follower",
        text: "كيف أقدر أطلب؟",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  async replyToComment(_commentId: string, _message: string, _accessToken: string): Promise<{ replyId: string }> {
    return { replyId: `mock_reply_${randomUUID()}` };
  }

  async hideComment(): Promise<void> {}
  async deleteComment(): Promise<void> {}

  async getConversations(_accessToken: string, _igUserId: string): Promise<InstagramConversation[]> {
    return [
      {
        id: `mock_conv_${randomUUID()}`,
        participantId: "mock_participant_1",
        participantUsername: "potential_customer",
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async getMessages(_conversationId: string, _accessToken: string): Promise<InstagramMessage[]> {
    return [
      {
        id: `mock_msg_${randomUUID()}`,
        from: "mock_participant_1",
        text: "السلام عليكم، كيف أطلب المنتج؟",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  async sendMessage(_recipientId: string, _message: string, _accessToken: string): Promise<{ messageId: string }> {
    return { messageId: `mock_sent_${randomUUID()}` };
  }

  async subscribeWebhook(): Promise<void> {}

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    return verifyHmacSignature(rawBody, signatureHeader, MOCK_APP_SECRET);
  }

  async getMediaInsights(_mediaId: string): Promise<MediaInsights> {
    const rand = (max: number) => Math.floor(Math.random() * max);
    return { reach: 500 + rand(2000), impressions: 700 + rand(3000), likes: rand(200), comments: rand(30), saves: rand(50), shares: rand(20) };
  }

  async getAccountInsights(_igUserId: string): Promise<AccountInsights> {
    const rand = (max: number) => Math.floor(Math.random() * max);
    return { followersCount: 12000 + rand(500), reach: 5000 + rand(5000), impressions: 8000 + rand(8000), profileViews: 200 + rand(300) };
  }
}
