import { verifyHmacSignature } from "@instagram-agent/crypto";
import { InstagramApiError } from "./types";
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

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface GraphClientConfig {
  appId: string;
  appSecret: string;
}

async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${GRAPH_API_BASE}${path}`, init);
  } catch (cause) {
    throw new InstagramApiError("Network error calling Instagram Graph API", "NETWORK", true, cause);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const kind = res.status === 429 ? "RATE_LIMIT" : res.status === 401 || res.status === 403 ? "TOKEN" : res.status >= 500 ? "NETWORK" : "PERMISSION";
    const retryable = kind === "RATE_LIMIT" || kind === "NETWORK";
    throw new InstagramApiError(`Instagram Graph API error ${res.status}: ${body}`, kind, retryable);
  }

  return (await res.json()) as T;
}

/**
 * Thin wrapper over the real Meta Graph API. Only instantiated when
 * INSTAGRAM_CLIENT_MODE=real and INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET are set.
 * Requires a completed Meta App setup — see README "Going live with real Instagram" section.
 */
export class GraphApiInstagramClient implements InstagramClient {
  constructor(private readonly config: GraphClientConfig) {}

  getOAuthUrl(redirectUri: string, state: string): string {
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", this.config.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set(
      "scope",
      [
        "instagram_business_basic",
        "instagram_business_content_publish",
        "instagram_business_manage_comments",
        "instagram_business_manage_messages",
      ].join(","),
    );
    return url.toString();
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResult> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const short = await graphFetch<{ access_token: string; user_id: string }>("/oauth/access_token", {
      method: "POST",
      body: params,
    });
    const longLived = await graphFetch<{ access_token: string; expires_in: number }>(
      `/access_token?grant_type=ig_exchange_token&client_secret=${this.config.appSecret}&access_token=${short.access_token}`,
    );
    return {
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in,
      instagramUserId: short.user_id,
    };
  }

  async refreshLongLivedToken(accessToken: string): Promise<RefreshedToken> {
    const data = await graphFetch<{ access_token: string; expires_in: number }>(
      `/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
    );
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  }

  async getAccountInfo(accessToken: string, igUserId: string): Promise<InstagramAccountInfo> {
    const data = await graphFetch<{ username: string; profile_picture_url?: string; account_type: string }>(
      `/${igUserId}?fields=username,profile_picture_url,account_type&access_token=${accessToken}`,
    );
    return {
      instagramUserId: igUserId,
      username: data.username,
      profilePictureUrl: data.profile_picture_url,
      accountType: data.account_type,
    };
  }

  async publishMedia(params: PublishMediaParams): Promise<{ mediaId: string }> {
    // Simplified single-image/video flow: create a media container, then publish it.
    // Carousel (multiple mediaUrls) requires per-item containers + a CAROUSEL parent —
    // left as a documented gap for the deepening pass, not part of this scaffold.
    const container = await graphFetch<{ id: string }>(`/${params.igUserId}/media`, {
      method: "POST",
      body: new URLSearchParams({
        caption: params.caption,
        image_url: params.mediaType === "IMAGE" ? params.mediaUrls[0]! : "",
        video_url: params.mediaType !== "IMAGE" ? params.mediaUrls[0]! : "",
        media_type: params.mediaType === "REEL" ? "REELS" : params.mediaType,
        access_token: params.accessToken,
      }),
    });
    const published = await graphFetch<{ id: string }>(`/${params.igUserId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: container.id, access_token: params.accessToken }),
    });
    return { mediaId: published.id };
  }

  async getComments(mediaId: string, accessToken: string): Promise<InstagramComment[]> {
    const data = await graphFetch<{ data: Array<{ id: string; username: string; text: string; timestamp: string }> }>(
      `/${mediaId}/comments?fields=username,text,timestamp&access_token=${accessToken}`,
    );
    return data.data.map((c) => ({ id: c.id, mediaId, authorUsername: c.username, text: c.text, timestamp: c.timestamp }));
  }

  async replyToComment(commentId: string, message: string, accessToken: string): Promise<{ replyId: string }> {
    const data = await graphFetch<{ id: string }>(`/${commentId}/replies`, {
      method: "POST",
      body: new URLSearchParams({ message, access_token: accessToken }),
    });
    return { replyId: data.id };
  }

  async hideComment(commentId: string, hide: boolean, accessToken: string): Promise<void> {
    await graphFetch(`/${commentId}`, {
      method: "POST",
      body: new URLSearchParams({ hide: String(hide), access_token: accessToken }),
    });
  }

  async deleteComment(commentId: string, accessToken: string): Promise<void> {
    await graphFetch(`/${commentId}?access_token=${accessToken}`, { method: "DELETE" });
  }

  async getConversations(accessToken: string, igUserId: string): Promise<InstagramConversation[]> {
    const data = await graphFetch<{ data: Array<{ id: string; participants: { data: Array<{ id: string; username: string }> }; updated_time: string }> }>(
      `/${igUserId}/conversations?platform=instagram&access_token=${accessToken}`,
    );
    return data.data.map((c) => {
      const other = c.participants.data.find((p) => p.id !== igUserId) ?? c.participants.data[0];
      return {
        id: c.id,
        participantId: other?.id ?? "",
        participantUsername: other?.username ?? "",
        updatedAt: c.updated_time,
      };
    });
  }

  async getMessages(conversationId: string, accessToken: string): Promise<InstagramMessage[]> {
    const data = await graphFetch<{ data: Array<{ id: string; from: { id: string }; message: string; created_time: string }> }>(
      `/${conversationId}/messages?fields=from,message,created_time&access_token=${accessToken}`,
    );
    return data.data.map((m) => ({ id: m.id, from: m.from.id, text: m.message, timestamp: m.created_time }));
  }

  async sendMessage(recipientId: string, message: string, accessToken: string): Promise<{ messageId: string }> {
    const data = await graphFetch<{ message_id: string }>(`/me/messages`, {
      method: "POST",
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message } }),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    return { messageId: data.message_id };
  }

  async subscribeWebhook(igUserId: string, accessToken: string, fields: string[]): Promise<void> {
    await graphFetch(`/${igUserId}/subscribed_apps`, {
      method: "POST",
      body: new URLSearchParams({ subscribed_fields: fields.join(","), access_token: accessToken }),
    });
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    return verifyHmacSignature(rawBody, signatureHeader, this.config.appSecret);
  }

  async getMediaInsights(mediaId: string, accessToken: string): Promise<MediaInsights> {
    const data = await graphFetch<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
      `/${mediaId}/insights?metric=reach,impressions,likes,comments,saved,shares&access_token=${accessToken}`,
    );
    const val = (name: string) => data.data.find((d) => d.name === name)?.values[0]?.value ?? 0;
    return {
      reach: val("reach"),
      impressions: val("impressions"),
      likes: val("likes"),
      comments: val("comments"),
      saves: val("saved"),
      shares: val("shares"),
    };
  }

  async getAccountInsights(igUserId: string, accessToken: string): Promise<AccountInsights> {
    const [account, insights] = await Promise.all([
      graphFetch<{ followers_count: number }>(`/${igUserId}?fields=followers_count&access_token=${accessToken}`),
      graphFetch<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
        `/${igUserId}/insights?metric=reach,impressions,profile_views&period=day&access_token=${accessToken}`,
      ),
    ]);
    const val = (name: string) => insights.data.find((d) => d.name === name)?.values[0]?.value ?? 0;
    return {
      followersCount: account.followers_count,
      reach: val("reach"),
      impressions: val("impressions"),
      profileViews: val("profile_views"),
    };
  }
}
