import OpenAI from "openai";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export interface GenerateReviewInput {
  services: string[];
  rating: number; // 1 to 5
  likedAspects: string[];
  customLiked?: string;
  additionalFeedback?: string;
  vehicleModel?: string;
  language: "en" | "hi" | "hinglish";
}

/**
 * Generate a realistic, personalized Google review for a customer based strictly on their input.
 */
export async function generateCustomerReview(input: GenerateReviewInput): Promise<{
  review: string;
  source: "openai" | "fallback";
}> {
  const openai = getOpenAIClient();

  if (!openai) {
    return {
      review: generateFallbackCustomerReview(input),
      source: "fallback",
    };
  }

  const servicesList = input.services.length > 0 ? input.services.join(", ") : "Car Detailing & Care";
  const likedList = [
    ...input.likedAspects,
    ...(input.customLiked ? [input.customLiked.trim()] : []),
  ].filter(Boolean).join(", ");

  let languageInstruction = "Write the review in natural, fluent English.";
  if (input.language === "hi") {
    languageInstruction = "Write the review in authentic Hindi script (Devanagari). Use natural conversational Hindi spoken in Indore/Madhya Pradesh.";
  } else if (input.language === "hinglish") {
    languageInstruction = "Write the review in natural, colloquial Hinglish (Hindi written in Roman English script, e.g. '3D Car Care Indore me apni car ka detailing karwaya, experience bohot badiya tha...').";
  }

  const sentimentDescription =
    input.rating >= 4
      ? "Strongly positive and appreciative customer experience."
      : input.rating === 3
      ? "Fair, balanced customer experience with mixed or average points."
      : "Critical, unsatisfied customer experience highlighting specific shortcomings.";

  const prompt = `
You are generating an authentic Google review written by an actual customer for "3D Car Care Indore" (a detailing studio located in Sheetal Nagar, Indore).

Customer input:
- Star Rating: ${input.rating} out of 5 stars (${sentimentDescription})
- Service(s) received: ${servicesList}
- Vehicle Model (if specified): ${input.vehicleModel || "Not specified"}
- What they liked: ${likedList || "Good overall work"}
- Additional feedback/notes: ${input.additionalFeedback || "None"}
- Language: ${languageInstruction}

Strict Rules:
1. Write strictly in the first-person ("I", "my car", "hamari gadi").
2. Only mention services, aspects, and experiences that the customer explicitly provided above. Do NOT fabricate fake details, fake employee names, or services they did not receive.
3. Tone must accurately match their star rating of ${input.rating} out of 5 stars.
4. Keep it concise, genuine, and human (around 40 to 90 words). Avoid generic AI sounding phrases like "delighted to recommend" or "testament to their professionalism".
5. Return ONLY the review text. Do not include quotation marks, titles, or explanatory notes.
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write genuine, authentic customer reviews for Google Maps based strictly on user feedback.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (content) {
      return { review: content.replace(/^["']|["']$/g, ""), source: "openai" };
    }
  } catch (err) {
    console.error("[OpenAI] Customer review generation error:", err);
  }

  return {
    review: generateFallbackCustomerReview(input),
    source: "fallback",
  };
}

/**
 * Intelligent rule-based fallback when OpenAI API key is not configured.
 */
function generateFallbackCustomerReview(input: GenerateReviewInput): string {
  const serviceText = input.services.length > 0 ? input.services.join(" & ") : "car detailing";
  const carModelParen = input.vehicleModel ? ` (${input.vehicleModel})` : "";
  const carText = input.vehicleModel ? ` for my ${input.vehicleModel}` : "";
  const liked = input.likedAspects.length > 0 ? input.likedAspects.join(", ") : "their attention to detail";
  const notes = input.additionalFeedback ? ` ${input.additionalFeedback}` : "";

  if (input.language === "hi") {
    if (input.rating >= 4) {
      return `मैंने हाल ही में 3D Car Care इंदौर से अपनी गाड़ी${carModelParen} के लिए ${serviceText} की सर्विस ली। काम वाकई बहुत शानदार हुआ। मुझे विशेष रूप से ${liked} पसंद आया। स्टाफ भी काफी प्रोफेशनल और समय का पाबंद है।${notes} 3D Car Care इंदौर की टीम का बहुत धन्यवाद!`;
    } else if (input.rating === 3) {
      return `3D Car Care इंदौर में ${serviceText} का काम करवाया। काम ठीक-ठाक रहा। ${liked} अच्छा था, लेकिन कुछ सुधार की गुंजाइश भी है।${notes}`;
    } else {
      return `3D Car Care इंदौर से ${serviceText} की सर्विस ली थी। मेरा अनुभव उम्मीद के मुताबिक नहीं रहा।${notes ? ` विशेष रूप से: ${notes}` : ""} उम्मीद है प्रबंधन इस पर ध्यान देगा।`;
    }
  }

  if (input.language === "hinglish") {
    if (input.rating >= 4) {
      return `3D Car Care Indore me apni gadi${carModelParen} ke liye ${serviceText} karwaya. Kaam sach me top-notch hua hai! Specially ${liked} mujhe bohot achha laga. Team bohot professional hai aur time par gadi hand over ki.${notes} Highly recommended for detailing in Indore!`;
    } else if (input.rating === 3) {
      return `3D Car Care Indore se ${serviceText} karwaya tha. Average to good experience raha. ${liked} achha laga but thoda aur finishing better ho sakti thi.${notes}`;
    } else {
      return `3D Car Care Indore me ${serviceText} karwaya tha, but experience expectations ke mutabik nahi raha.${notes ? ` Main issue: ${notes}.` : ""} Hope team customer feedback ko seriously legi.`;
    }
  }

  // English fallback
  if (input.rating >= 4) {
    return `Recently got ${serviceText}${carText} done at 3D Car Care Indore. Truly impressed with their quality of workmanship. Really loved ${liked}. The team is professional, courteous, and delivered on time.${notes} Definitely one of the finest car detailing centers in Indore!`;
  } else if (input.rating === 3) {
    return `Got ${serviceText}${carText} done at 3D Car Care Indore. The experience was decent overall. Appreciated ${liked}, though there is some room for finer finishing.${notes}`;
  } else {
    return `Visited 3D Car Care Indore for ${serviceText}${carText}. Unfortunately, my experience did not meet expectations.${notes ? ` Specifically: ${notes}` : ""} Sharing honest feedback so the management can address this.`;
  }
}

/**
 * Generate an official owner reply to a Google Business Profile review.
 */
export async function generateOwnerReply(review: {
  reviewerName: string;
  starRating: number;
  comment?: string;
}): Promise<string> {
  const openai = getOpenAIClient();

  if (!openai) {
    return generateFallbackOwnerReply(review);
  }

  const prompt = `
You are the business owner and managing director of "3D Car Care Indore", a premier automotive detailing studio in Indore, Madhya Pradesh.

Customer review details:
- Reviewer: ${review.reviewerName || "Valued Customer"}
- Rating: ${review.starRating} out of 5 stars
- Review comment: "${review.comment || "(No text comment left, rating only)"}"

Reply Guidelines:
1. For Positive reviews (4-5 stars):
   - Warmly and humbly thank them by name.
   - Mention their actual service/car if they referred to it in their review.
   - Reiterate your commitment to precision detailing and wish them safe, shining drives.

2. For Neutral reviews (3 stars):
   - Professional, courteous tone.
   - Appreciate their visit and constructive feedback.
   - Note their comments and invite them to share further details so we can keep elevating our standards.

3. For Negative reviews (1-2 stars):
   - Sincere, respectful apology.
   - Acknowledge their specific concern without defensiveness.
   - Invite them to contact the management directly or visit the workshop so we can personally inspect and resolve any issue to their satisfaction.

Language & Authenticity Rules:
- Reply in the EXACT same language as the customer's comment:
  - If review is in English -> reply in fluent English.
  - If review is in Hindi script -> reply in polite Hindi (Devanagari).
  - If review is in Hinglish -> reply in respectful Hinglish.
  - If no text is provided, reply in polite English.
- NEVER invent discounts, free services, fake warranties, or factual claims not verified.
- Keep it concise (35 to 70 words).
- Sign off naturally as "Team 3D Car Care Indore".
- Return ONLY the reply text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are the professional, courteous owner of 3D Car Care Indore replying to Google Reviews.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    const reply = response.choices[0]?.message?.content?.trim();
    if (reply) {
      return reply.replace(/^["']|["']$/g, "");
    }
  } catch (err) {
    console.error("[OpenAI] Owner reply generation error:", err);
  }

  return generateFallbackOwnerReply(review);
}

function generateFallbackOwnerReply(review: {
  reviewerName: string;
  starRating: number;
  comment?: string;
}): string {
  const name = review.reviewerName ? review.reviewerName.split(" ")[0] : "Customer";
  const comment = (review.comment || "").toLowerCase();

  const isHindi = /[\u0900-\u097F]/.test(comment);
  const isHinglish =
    /\b(bhai|bohot|achha|accha|gadi|shandar|dhanyawad|dhanyavad|karwaya|kaam)\b/i.test(comment);

  if (isHindi) {
    if (review.starRating >= 4) {
      return `नमस्ते ${name} जी! 3D Car Care इंदौर पर विश्वास जताने और अपना बहुमूल्य रिव्यू साझा करने के लिए आपका बहुत-बहुत धन्यवाद। आपकी कार को नई जैसी चमक देना हमारा सौभाग्य रहा। सुरक्षित सफर की शुभकामनाएं! - टीम 3D Car Care इंदौर`;
    } else {
      return `नमस्ते ${name} जी, आपके फीडबैक के लिए धन्यवाद। आपके अनुभव में जो कमी रही, उसके लिए हम क्षमा चाहते हैं। कृपया हमसे सीधे संपर्क करें ताकि हम इसे तुरंत सुधार सकें। - टीम 3D Car Care इंदौर`;
    }
  }

  if (isHinglish) {
    if (review.starRating >= 4) {
      return `Thank you so much ${name} ji! 3D Car Care Indore par trust karne aur valuable review share karne ke liye shukriya. Apki car ki shine maintain rakhna hamara priority hai. Safe drives ahead! - Team 3D Car Care Indore`;
    } else {
      return `Hello ${name} ji, aapke feedback ke liye dhanyawad. Aapko jo asuvidha hui uske liye hum sincere apologize karte hain. Please humare helpline par direct connect karein taaki hum issue ko solve kar sakein. - Team 3D Car Care Indore`;
    }
  }

  // English fallback
  if (review.starRating >= 4) {
    return `Thank you so much for the wonderful review, ${name}! We truly appreciate you trusting 3D Car Care Indore with your vehicle. Wishing you many happy and shining miles ahead! - Team 3D Car Care Indore`;
  } else if (review.starRating === 3) {
    return `Thank you for sharing your feedback, ${name}. We appreciate your support and have noted your observations. We are continuously working to deliver the finest detailing experience in Indore. - Team 3D Car Care Indore`;
  } else {
    return `Dear ${name}, thank you for bringing this to our attention. We sincerely apologize that your experience did not meet our high detailing standards. We would love the opportunity to inspect and resolve this for you. Please reach out to our management team directly. - Team 3D Car Care Indore`;
  }
}
