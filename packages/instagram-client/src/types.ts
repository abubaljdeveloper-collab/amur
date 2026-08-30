export interface TokenExchangeResult {
  accessToken: string;
  expiresIn: number; // seconds
  instagramUserId: string;
}

export interface RefreshedToken {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface InstagramAccountInfo {
  instagramUserId: string;
  username: string;
  profilePictureUrl?: string;
  accountType: string;
}

export interface PublishMediaParams {
  igUserId: string;
  accessToken: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "REEL" | "CAROUSEL" | "STORY";
  mediaUrls: string[]; // publicly reachable URLs (Object Storage), required by Graph API
}

export interface InstagramComment {
  id: string;
  mediaId: string;
  authorUsername: string;
  text: string;
  timestamp: string;
}

export interface InstagramConversation {
  id: string;
  participantId: string;
  participantUsername: string;
  updatedAt: string;
}

export interface InstagramMessage {
  id: string;
  from: string;
  text: string;
  timestamp: string;
}

export interface MediaInsights {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

export interface AccountInsights {
  followersCount: number;
  reach: number;
  impressions: number;
  profileViews: number;
}

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "PERMISSION" | "TOKEN" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN",
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

/**
 * Everything above this interface (agents, Decision Engine, API routes) only ever
 * imports this type — never MockInstagramClient or GraphApiInstagramClient directly.
 * Swapping mock -> real is a single env var (INSTAGRAM_CLIENT_MODE), zero code changes.
 */
export interface InstagramClient {
  getOAuthUrl(redirectUri: string, state: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResult>;
  refreshLongLivedToken(accessToken: string): Promise<RefreshedToken>;
  getAccountInfo(accessToken: string, igUserId: string): Promise<InstagramAccountInfo>;

  publishMedia(params: PublishMediaParams): Promise<{ mediaId: string }>;

  getComments(mediaId: string, accessToken: string): Promise<InstagramComment[]>;
  replyToComment(commentId: string, message: string, accessToken: string): Promise<{ replyId: string }>;
  hideComment(commentId: string, hide: boolean, accessToken: string): Promise<void>;
  deleteComment(commentId: string, accessToken: string): Promise<void>;

  getConversations(accessToken: string, igUserId: string): Promise<InstagramConversation[]>;
  getMessages(conversationId: string, accessToken: string): Promise<InstagramMessage[]>;
  sendMessage(recipientId: string, message: string, accessToken: string): Promise<{ messageId: string }>;

  subscribeWebhook(igUserId: string, accessToken: string, fields: string[]): Promise<void>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  getMediaInsights(mediaId: string, accessToken: string): Promise<MediaInsights>;
  getAccountInsights(igUserId: string, accessToken: string): Promise<AccountInsights>;
}
