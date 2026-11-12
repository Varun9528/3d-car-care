import fs from "fs";
import path from "path";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
  accountId?: string;
  locationId?: string;
  connectedEmail?: string;
  updatedAt: string;
}

export interface RepliedReviewRecord {
  reviewId: string;
  reviewerName?: string;
  starRating?: number;
  originalComment?: string;
  replyText: string;
  repliedAt: string;
  source: "cron" | "webhook" | "manual";
}

const DATA_DIR = path.join(process.cwd(), "data");
const TOKENS_FILE = path.join(DATA_DIR, "google_tokens.json");
const REPLIED_REVIEWS_FILE = path.join(DATA_DIR, "replied_reviews.json");

// In-memory fallback for stateless execution if no persistent storage is configured
let memoryTokens: GoogleTokens | null = null;
const memoryRepliedReviews = new Map<string, RepliedReviewRecord>();

/**
 * Check if Upstash Redis or Vercel KV is configured via REST API
 */
function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    return { url, token };
  }
  return null;
}

async function upstashCommand<T = unknown>(command: string, ...args: (string | number)[]): Promise<T | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/${command}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[Upstash] Error ${res.status}: ${res.statusText}`);
      return null;
    }
    const json = await res.json();
    return json.result as T;
  } catch (err) {
    console.error("[Upstash] Fetch failed:", err);
    return null;
  }
}

/**
 * Save Google OAuth tokens securely
 */
export async function saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
  memoryTokens = tokens;

  // 1. Try Upstash / Vercel KV
  const cfg = getUpstashConfig();
  if (cfg) {
    try {
      await fetch(`${cfg.url}/set/google_tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(JSON.stringify(tokens)),
      });
      return;
    } catch (err) {
      console.error("[Storage] Upstash save error:", err);
    }
  }

  // 2. Try Local File System
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (err) {
    // Expected on read-only serverless filesystems without Redis
    console.warn("[Storage] Local file save failed (normal on Vercel without Upstash):", err);
  }
}

/**
 * Retrieve saved Google OAuth tokens
 */
export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  // 1. Try Upstash / Vercel KV
  const cfg = getUpstashConfig();
  if (cfg) {
    const res = await upstashCommand<string>("get", "google_tokens");
    if (res) {
      try {
        return typeof res === "string" ? JSON.parse(res) : res;
      } catch (err) {
        console.error("[Storage] Parse Upstash tokens error:", err);
      }
    }
  }

  // 2. Try Local File System
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[Storage] Local file read error:", err);
  }

  // 3. Fallback to Environment Variables (if owner configured permanent refresh token directly in Vercel env)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      access_token: "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      accountId: process.env.GOOGLE_ACCOUNT_ID,
      locationId: process.env.GOOGLE_LOCATION_ID,
      updatedAt: new Date().toISOString(),
    };
  }

  return memoryTokens;
}

/**
 * Check if a review has already been replied to
 */
export async function hasRepliedToReview(reviewId: string): Promise<boolean> {
  if (memoryRepliedReviews.has(reviewId)) {
    return true;
  }

  // 1. Try Upstash / Vercel KV
  const cfg = getUpstashConfig();
  if (cfg) {
    const isMember = await upstashCommand<number>("sismember", "replied_review_ids", reviewId);
    if (isMember === 1) return true;
  }

  // 2. Try Local File System
  try {
    if (fs.existsSync(REPLIED_REVIEWS_FILE)) {
      const data = fs.readFileSync(REPLIED_REVIEWS_FILE, "utf-8");
      const list: RepliedReviewRecord[] = JSON.parse(data);
      return list.some((r) => r.reviewId === reviewId);
    }
  } catch (err) {
    // Ignore error
  }

  return false;
}

/**
 * Record a successfully replied review to prevent duplicate replies
 */
export async function recordRepliedReview(record: RepliedReviewRecord): Promise<void> {
  memoryRepliedReviews.set(record.reviewId, record);

  // 1. Try Upstash / Vercel KV
  const cfg = getUpstashConfig();
  if (cfg) {
    try {
      await upstashCommand("sadd", "replied_review_ids", record.reviewId);
      await fetch(`${cfg.url}/hset/replied_reviews_data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([record.reviewId, JSON.stringify(record)]),
      });
      return;
    } catch (err) {
      console.error("[Storage] Upstash record error:", err);
    }
  }

  // 2. Try Local File System
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let list: RepliedReviewRecord[] = [];
    if (fs.existsSync(REPLIED_REVIEWS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(REPLIED_REVIEWS_FILE, "utf-8"));
      } catch {
        list = [];
      }
    }
    if (!list.some((r) => r.reviewId === record.reviewId)) {
      list.push(record);
      fs.writeFileSync(REPLIED_REVIEWS_FILE, JSON.stringify(list, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[Storage] Local file record failed:", err);
  }
}

/**
 * Get all replied reviews
 */
export async function getRepliedReviews(): Promise<RepliedReviewRecord[]> {
  const cfg = getUpstashConfig();
  if (cfg) {
    const rawData = await upstashCommand<Record<string, string>>("hgetall", "replied_reviews_data");
    if (rawData && typeof rawData === "object") {
      try {
        return Object.values(rawData).map((val) => (typeof val === "string" ? JSON.parse(val) : val));
      } catch (err) {
        console.error("[Storage] Parse Upstash hash error:", err);
      }
    }
  }

  try {
    if (fs.existsSync(REPLIED_REVIEWS_FILE)) {
      return JSON.parse(fs.readFileSync(REPLIED_REVIEWS_FILE, "utf-8"));
    }
  } catch {
    // Ignore
  }

  return Array.from(memoryRepliedReviews.values());
}

