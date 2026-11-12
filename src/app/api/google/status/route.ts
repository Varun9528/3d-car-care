import { NextResponse } from "next/server";
import { getGoogleIntegrationStatus } from "@/lib/google-business";

export async function GET() {
  try {
    const status = await getGoogleIntegrationStatus();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status,
      guide: {
        oauthConnectUrl: "/api/google/oauth",
        syncReviewsUrl: "/api/sync-reviews",
        webhookUrl: "/api/google/webhook",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
