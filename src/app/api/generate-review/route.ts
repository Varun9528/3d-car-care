import { NextRequest, NextResponse } from "next/server";
import { generateCustomerReview, GenerateReviewInput } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rating = Number(body.rating) || 5;
    const services = Array.isArray(body.services) ? body.services : [];
    const likedAspects = Array.isArray(body.likedAspects) ? body.likedAspects : [];
    const customLiked = typeof body.customLiked === "string" ? body.customLiked : "";
    const additionalFeedback =
      typeof body.additionalFeedback === "string" ? body.additionalFeedback : "";
    const vehicleModel = typeof body.vehicleModel === "string" ? body.vehicleModel : "";
    const language = ["en", "hi", "hinglish"].includes(body.language)
      ? (body.language as "en" | "hi" | "hinglish")
      : "en";

    const input: GenerateReviewInput = {
      rating,
      services,
      likedAspects,
      customLiked,
      additionalFeedback,
      vehicleModel,
      language,
    };

    const result = await generateCustomerReview(input);

    return NextResponse.json({
      success: true,
      review: result.review,
      source: result.source,
    });
  } catch (err: unknown) {
    console.error("[API generate-review] Error:", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
