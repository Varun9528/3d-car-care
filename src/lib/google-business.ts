import {
  getGoogleTokens,
  saveGoogleTokens,
  hasRepliedToReview,
  recordRepliedReview,
  GoogleTokens,
} from "./storage";
import { generateOwnerReply } from "./openai";

export interface GoogleReviewItem {
  reviewId: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
    isAnonymous?: boolean;
  };
  starRating: "STAR_RATING_UNSPECIFIED" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment: string;
    updateTime?: string;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  totalFetched: number;
  repliedCount: number;
  skippedCount: number;
  errors: string[];
  replies: Array<{
    reviewId: string;
    reviewerName: string;
    starRating: number;
    reply: string;
  }>;
}

const STAR_RATING_MAP: Record<string, number> = {
  FIVE: 5,
  FOUR: 4,
  THREE: 3,
  TWO: 2,
  ONE: 1,
};

/**
 * Generate Google OAuth 2.0 authorization URL
 */
export function getGoogleOAuthUrl(origin: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in environment variables.");
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
  origin: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} - ${errorBody}`);
  }

  const data = await res.json();

  // Try to discover accounts/locations automatically
  const accountInfo = await discoverPrimaryLocation(data.access_token);

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    token_type: data.token_type,
    scope: data.scope,
    accountId: accountInfo?.accountId || process.env.GOOGLE_ACCOUNT_ID,
    locationId: accountInfo?.locationId || process.env.GOOGLE_LOCATION_ID,
    connectedEmail: accountInfo?.email,
    updatedAt: new Date().toISOString(),
  };

  await saveGoogleTokens(tokens);
  return tokens;
}

/**
 * Discover the primary Google Business Profile account and location
 */
async function discoverPrimaryLocation(
  accessToken: string
): Promise<{ accountId?: string; locationId?: string; email?: string } | null> {
  try {
    const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!accRes.ok) return null;
    const accData = await accRes.json();
    const accounts = accData.accounts || [];
    if (accounts.length === 0) return null;

    const primaryAccount = accounts[0];
    const accountName = primaryAccount.name; // e.g. "accounts/123456"

    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let locationName: string | undefined;
    if (locRes.ok) {
      const locData = await locRes.json();
      const locations = locData.locations || [];
      if (locations.length > 0) {
        locationName = locations[0].name; // e.g. "locations/987654"
      }
    }

    return {
      accountId: accountName,
      locationId: locationName,
    };
  } catch (err) {
    console.warn("[Google Business] Location auto-discovery warning:", err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  accountName: string;
  locationName: string;
} | null> {
  const tokens = await getGoogleTokens();
  if (!tokens) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = tokens.refresh_token || process.env.GOOGLE_REFRESH_TOKEN;

  let accessToken = tokens.access_token;
  const isExpired = tokens.expiry_date ? Date.now() >= tokens.expiry_date - 60000 : true;

  if ((!accessToken || isExpired) && refreshToken && clientId && clientSecret) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (res.ok) {
        const refreshData = await res.json();
        accessToken = refreshData.access_token;
        await saveGoogleTokens({
          ...tokens,
          access_token: accessToken,
          expiry_date: Date.now() + (refreshData.expires_in || 3600) * 1000,
          updatedAt: new Date().toISOString(),
        });
      } else {
        console.error("[Google OAuth] Refresh token request failed:", await res.text());
        return null;
      }
    } catch (err) {
      console.error("[Google OAuth] Refresh exception:", err);
      return null;
    }
  }

  const accountName = tokens.accountId || process.env.GOOGLE_ACCOUNT_ID;
  const locationName = tokens.locationId || process.env.GOOGLE_LOCATION_ID;

  if (!accessToken || !accountName || !locationName) {
    return null;
  }

  return { accessToken, accountName, locationName };
}

/**
 * Fetch recent reviews from Google My Business v4 API
 */
export async function fetchGoogleReviews(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GoogleReviewItem[]> {
  // Normalize names: e.g. "accounts/123" vs "123"
  const acc = accountName.startsWith("accounts/") ? accountName : `accounts/${accountName}`;
  const loc = locationName.startsWith("locations/") ? locationName : `locations/${locationName}`;

  const url = `https://mybusiness.googleapis.com/v4/${acc}/${loc}/reviews?pageSize=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Reviews fetch failed: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.reviews || [];
}

/**
 * Publish an owner reply to a specific review using Google My Business API
 */
export async function replyToGoogleReview(
  accessToken: string,
  accountName: string,
  locationName: string,
  reviewId: string,
  replyText: string
): Promise<boolean> {
  const acc = accountName.startsWith("accounts/") ? accountName : `accounts/${accountName}`;
  const loc = locationName.startsWith("locations/") ? locationName : `locations/${locationName}`;

  const url = `https://mybusiness.googleapis.com/v4/${acc}/${loc}/reviews/${reviewId}/reply`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Review Reply API failed: ${res.status} - ${errText}`);
  }

  return true;
}

/**
 * Synchronize and automatically reply to any unreplied Google reviews
 */
export async function processAndReplyToReviews(
  source: "cron" | "webhook" | "manual"
): Promise<SyncResult> {
  const errors: string[] = [];
  const replies: Array<{
    reviewId: string;
    reviewerName: string;
    starRating: number;
    reply: string;
  }> = [];

  const authData = await getValidAccessToken();
  if (!authData) {
    return {
      success: false,
      message:
        "Google Business Profile is not connected or authorization is pending. Visit /api/google/oauth to connect.",
      totalFetched: 0,
      repliedCount: 0,
      skippedCount: 0,
      errors: ["Google OAuth tokens missing or expired."],
      replies: [],
    };
  }

  const { accessToken, accountName, locationName } = authData;

  let reviews: GoogleReviewItem[] = [];
  try {
    reviews = await fetchGoogleReviews(accessToken, accountName, locationName);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: "Failed to fetch reviews from Google API.",
      totalFetched: 0,
      repliedCount: 0,
      skippedCount: 0,
      errors: [errMsg],
      replies: [],
    };
  }

  let repliedCount = 0;
  let skippedCount = 0;

  for (const review of reviews) {
    const reviewId = review.reviewId;

    // Check 1: Does Google already indicate an owner reply exists?
    if (review.reviewReply && review.reviewReply.comment) {
      skippedCount++;
      continue;
    }

    // Check 2: Has our system already replied (duplicate protection)?
    const alreadyHandled = await hasRepliedToReview(reviewId);
    if (alreadyHandled) {
      skippedCount++;
      continue;
    }

    // Unreplied review detected: Generate professional AI reply
    const reviewerName = review.reviewer?.displayName || "Customer";
    const starRating = STAR_RATING_MAP[review.starRating] || 5;
    const comment = review.comment || "";

    try {
      const generatedReply = await generateOwnerReply({
        reviewerName,
        starRating,
        comment,
      });

      // Publish directly to Google Business Profile API
      await replyToGoogleReview(
        accessToken,
        accountName,
        locationName,
        reviewId,
        generatedReply
      );

      // Record in persistent storage to prevent duplicates
      await recordRepliedReview({
        reviewId,
        reviewerName,
        starRating,
        originalComment: comment,
        replyText: generatedReply,
        repliedAt: new Date().toISOString(),
        source,
      });

      repliedCount++;
      replies.push({
        reviewId,
        reviewerName,
        starRating,
        reply: generatedReply,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Review ${reviewId} reply error: ${errMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    message: `Processed ${reviews.length} reviews. Published ${repliedCount} new AI replies. Skipped ${skippedCount} already-replied reviews.`,
    totalFetched: reviews.length,
    repliedCount,
    skippedCount,
    errors,
    replies,
  };
}

/**
 * Inspect Google integration configuration status
 */
export async function getGoogleIntegrationStatus() {
  const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key_here");
  const tokens = await getGoogleTokens();

  const isConnected = Boolean(tokens && (tokens.access_token || tokens.refresh_token));
  const hasLocationConfigured = Boolean(
    (tokens && tokens.accountId && tokens.locationId) ||
    (process.env.GOOGLE_ACCOUNT_ID && process.env.GOOGLE_LOCATION_ID)
  );

  return {
    isConfigured: hasClientId && hasClientSecret,
    isConnected,
    hasLocationConfigured,
    hasOpenAiKey,
    details: {
      hasClientId,
      hasClientSecret,
      hasRefreshToken: Boolean(tokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN),
      accountId: tokens?.accountId || process.env.GOOGLE_ACCOUNT_ID || "Not set",
      locationId: tokens?.locationId || process.env.GOOGLE_LOCATION_ID || "Not set",
      lastUpdated: tokens?.updatedAt || null,
    },
  };
}
