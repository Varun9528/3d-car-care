import { NextRequest, NextResponse } from "next/server";
import { generateCustomerReviewSuggestions, SimplifiedReviewInput } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rating = Number(body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Please select a star rating (1 to 5 stars)." },
        { status: 400 }
      );
    }

    const service = typeof body.service === "string" && body.service.trim() ? body.service.trim() : "Detailing";
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
    const language = ["en", "hi", "hinglish"].includes(body.language)
      ? (body.language as "en" | "hi" | "hinglish")
      : "en";

    const input: SimplifiedReviewInput = {
      service,
      rating,
      feedback,
      language,
    };

    const result = await generateCustomerReviewSuggestions(input);

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      review: result.suggestions[0]?.text || "",
      source: result.source,
    });
  } catch (err: unknown) {
    console.error("[API generate-review] Error:", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
