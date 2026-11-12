import OpenAI from "openai";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export interface SimplifiedReviewInput {
  service: string; // "PPF" | "Ceramic / Graphene Coating" | "Car Wash" | "Detailing" | "Other"
  rating: number; // 1 to 5
  feedback?: string; // Optional user experience
  language: "en" | "hi" | "hinglish";
}

export interface ReviewSuggestion {
  id: number;
  styleLabel: string;
  text: string;
}

const STYLE_LABELS = [
  "Short & Simple",
  "Detailed Experience",
  "Professional",
  "Friendly & Conversational",
  "Local Hinglish",
  "Unique Personal Style",
];

/**
 * Generate 6 distinct, non-repetitive review suggestions in a single OpenAI request.
 */
export async function generateCustomerReviewSuggestions(input: SimplifiedReviewInput): Promise<{
  suggestions: ReviewSuggestion[];
  source: "openai" | "template";
}> {
  const openai = getOpenAIClient();
  const trimmedFeedback = (input.feedback || "").trim();

  if (!openai) {
    return {
      suggestions: generateFallbackSuggestions(input),
      source: "template",
    };
  }

  let languagePrompt = "Write reviews in natural, fluent English.";
  if (input.language === "hi") {
    languagePrompt = "Write reviews in natural Hindi script (Devanagari), except Style 5 which can be colloquial Hinglish.";
  } else if (input.language === "hinglish") {
    languagePrompt = "Write reviews in natural conversational Hinglish (Hindi words in Roman English script).";
  }

  const prompt = `
You are generating 6 distinctly different Google review suggestions for a customer of "3D Car Care Centre" in Indore.

Customer Input:
- Service Received: ${input.service || "Car Care Service"}
- Star Rating: ${input.rating} out of 5 stars
- Customer's Actual Notes: "${trimmedFeedback || "No additional text provided (generate based on service and rating)"}"
- Primary Language: ${languagePrompt}

Generate EXACTLY 6 distinct review options matching these styles:
1. "Short & Simple" — Concise, punchy, 1-2 sentences.
2. "Detailed Experience" — Explains the craft, gloss, or thoroughness with more specific adjectives.
3. "Professional" — Formal, courteous, and polite phrasing.
4. "Friendly & Conversational" — Warm, relatable customer voice.
5. "Local Hinglish" — Authentic Indori/Indian conversational casual flavor (e.g., "Kaam sach me top-notch hua hai...").
6. "Unique Personal Style" — Alternative sentence structure, different vocabulary and opening words.

CRITICAL ANTI-REPETITION RULES:
- ZERO duplicate phrases. Never repeat the exact same opening words (e.g. do NOT start multiple reviews with "Got my car" or "Visited 3D Car Care").
- Do NOT repeat cliché closing phrases like "Highly recommended" across multiple reviews.
- Strictly reflect the customer's actual rating (${input.rating} of 5 stars). If rating is 1-3 stars, keep tone honest, constructive, and balanced without forced hype.
- Never invent unmentioned staff names, fake discounts, fake warranties, or vehicles.
- Keep each review between 20 and 65 words.

Return ONLY a valid JSON object matching this schema:
{
  "suggestions": [
    { "id": 1, "styleLabel": "Short & Simple", "text": "..." },
    { "id": 2, "styleLabel": "Detailed Experience", "text": "..." },
    { "id": 3, "styleLabel": "Professional", "text": "..." },
    { "id": 4, "styleLabel": "Friendly & Conversational", "text": "..." },
    { "id": 5, "styleLabel": "Local Hinglish", "text": "..." },
    { "id": 6, "styleLabel": "Unique Personal Style", "text": "..." }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert review writing assistant that outputs strictly valid JSON containing 6 distinct, diverse customer reviews.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 650,
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      let list: ReviewSuggestion[] = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : Array.isArray(parsed.reviews)
        ? parsed.reviews
        : [];

      // Validate and clean up list
      if (list.length >= 6) {
        // Deduplicate
        const seen = new Set<string>();
        const uniqueList: ReviewSuggestion[] = [];

        list.slice(0, 6).forEach((item, index) => {
          const text = (item.text || "").trim().replace(/^["']|["']$/g, "");
          const norm = text.toLowerCase().slice(0, 30);
          if (text && !seen.has(norm)) {
            seen.add(norm);
            uniqueList.push({
              id: index + 1,
              styleLabel: item.styleLabel || STYLE_LABELS[index],
              text,
            });
          }
        });

        // If all 6 are valid and distinct
        if (uniqueList.length === 6) {
          return { suggestions: uniqueList, source: "openai" };
        }
      }
    }
  } catch (err) {
    console.error("[OpenAI] Suggestions generation error:", err);
  }

  // Graceful fallback to 6 rule-based styled variations
  return {
    suggestions: generateFallbackSuggestions(input),
    source: "template",
  };
}

/**
 * 6 Diverse Fallback Suggestions when OpenAI API is unavailable
 */
function generateFallbackSuggestions(input: SimplifiedReviewInput): ReviewSuggestion[] {
  const service = input.service || "Car Care";
  const note = (input.feedback || "").trim();
  const rating = input.rating || 5;
  const isPositive = rating >= 4;

  if (input.language === "hi") {
    if (isPositive) {
      return [
        {
          id: 1,
          styleLabel: "Short & Simple",
          text: `3D Car Care Centre से ${service} करवाया। काम बहुत साफ और समय पर पूरा हुआ। पूरी तरह संतुष्ट!`,
        },
        {
          id: 2,
          styleLabel: "Detailed Experience",
          text: `इंदौर में 3D Car Care से ${service} की सर्विस ली। ${note ? `${note}। ` : ""}गाड़ी की चमक और फिनिशिंग देखते ही बनती है। टीम ने बहुत बारीकी से काम किया।`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `3D Car Care Centre में कुशल स्टाफ और उच्च स्तरीय डिटेलिंग कार्यप्रणाली देखने को मिली। ${service} के बाद गाड़ी की स्थिति बिल्कुल नई जैसी है।`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `अपनी कार के लिए 3D Car Care चुना और अनुभव बहुत सुखद रहा। ${note ? `${note}। ` : ""}स्टाफ बहुत विनम्र और मददगार है। बहुत-बहुत धन्यवाद!`,
        },
        {
          id: 5,
          styleLabel: "Local Hinglish",
          text: `3D Car Care Indore me ${service} karwaya tha. Kaam ek number hua hai! Finishing aur shine showroom condition jaisi hai. Best detailing studio!`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `गाड़ी की सही देखभाल के लिए 3D Car Care इंदौर सबसे भरोसेमंद जगह लगी। ${service} में जो परफेक्शन मिला, उससे मन खुश हो गया।`,
        },
      ];
    } else {
      return [
        {
          id: 1,
          styleLabel: "Short & Simple",
          text: `3D Car Care Centre से ${service} लिया। काम सामान्य रहा।`,
        },
        {
          id: 2,
          styleLabel: "Detailed Experience",
          text: `3D Car Care में ${service} करवाया। ${note ? `${note}। ` : ""}कुछ बिंदुओं पर फिनिशिंग बेहतर हो सकती थी।`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `3D Car Care Centre से सेवा ली। उम्मीद है कि प्रबंधन गुणवत्ता नियंत्रण पर और ध्यान देगा।`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `मेरा अनुभव औसत रहा। स्टाफ ठीक था लेकिन काम उम्मीद से थोड़ा कम रहा।`,
        },
        {
          id: 5,
          styleLabel: "Local Hinglish",
          text: `3D Car Care me ${service} karwaya, average experience raha. Finishing aur better expect kar raha tha.`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `ईमानदार फीडबैक: ${service} का काम ठीक-ठाक था, लेकिन सुधार की काफी गुंजाइश है।`,
        },
      ];
    }
  }

  if (input.language === "hinglish") {
    if (isPositive) {
      return [
        {
          id: 1,
          styleLabel: "Short & Simple",
          text: `3D Car Care Indore me ${service} karwaya. Finishing aur shine top class hai. Super satisfied!`,
        },
        {
          id: 2,
          styleLabel: "Detailed Experience",
          text: `Recently visited 3D Car Care Centre for ${service}. ${note ? `${note}. ` : ""}Gadi bilkul showroom condition me wapas mili. Detailing work was deeply satisfying.`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `Impressed with the methodical execution of ${service} at 3D Car Care Centre Indore. Professional team and punctual handover.`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `Bohot hi accha experience raha 3D Car Care ke sath! ${note ? `${note}. ` : ""}Team bohot polite thi aur har cheez ache se samjhayi. Thanks guys!`,
        },
        {
          id: 5,
          styleLabel: "Local Hinglish",
          text: `Indore me car detailing ke liye 3D Car Care Centre sach me best laga. ${service} me jo finishing aayi hai, gadi alag hi chamak rahi hai!`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `Apni car ki care ke liye best choice. ${service} was done with supreme attention to detail. Great value for car enthusiasts in Indore!`,
        },
      ];
    } else {
      return [
        {
          id: 1,
          styleLabel: "Short & Simple",
          text: `3D Car Care Indore se ${service} karwaya. Experience was just average.`,
        },
        {
          id: 2,
          styleLabel: "Detailed Experience",
          text: `Had my vehicle in for ${service}. ${note ? `${note}. ` : ""}Finishing could definitely have been more refined.`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `Received ${service} at 3D Car Care Centre. Sharing constructive feedback for the management to inspect.`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `Decent work overall, but unfortunately did not fully meet expectations for ${service}.`,
        },
        {
          id: 5,
          styleLabel: "Local Hinglish",
          text: `3D Car Care me ${service} karwaya tha but thoda disappointed raha. Hope team finishing aur quality pe focus karegi.`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `Honest review: ${service} was average. Expected higher perfection for the price paid.`,
        },
      ];
    }
  }

  // English Variations
  if (isPositive) {
    return [
      {
        id: 1,
        styleLabel: "Short & Simple",
        text: `Got ${service} done at 3D Car Care Centre Indore. Flawless finish and on-time handover. Thoroughly satisfied!`,
      },
      {
        id: 2,
        styleLabel: "Detailed Experience",
        text: `Brought my vehicle to 3D Car Care Centre for ${service}. ${note ? `${note}. ` : ""}The gloss and attention to intricate edges were remarkable. Truly restored that showroom look.`,
      },
      {
        id: 3,
        styleLabel: "Professional",
        text: `Exemplary detailing standards at 3D Car Care Centre Indore. Their execution of ${service} demonstrated superior technical proficiency and thorough quality control.`,
      },
      {
        id: 4,
        styleLabel: "Friendly & Conversational",
        text: `So glad I chose 3D Car Care for my car! ${note ? `${note}. ` : ""}The staff were welcoming, courteous, and took genuine care of every little detail. Big thanks to the crew!`,
      },
      {
        id: 5,
        styleLabel: "Local Hinglish",
        text: `3D Car Care Centre Indore me ${service} karwaya tha. Kaam sach me top-notch hua hai! Showroom jaisi shine wapas aa gayi. Truly value for money.`,
      },
      {
        id: 6,
        styleLabel: "Unique Personal Style",
        text: `Finding a workshop with genuine passion for car aesthetics is rare. 3D Car Care delivered exceptional results on ${service}. A premier detailing studio in Indore!`,
      },
    ];
  } else {
    return [
      {
        id: 1,
        styleLabel: "Short & Simple",
        text: `Visited 3D Car Care Centre for ${service}. The experience was average and had room for improvement.`,
      },
      {
        id: 2,
        styleLabel: "Detailed Experience",
        text: `Had ${service} performed at 3D Car Care. ${note ? `${note}. ` : ""}While parts of the job were fine, some specific areas needed much finer attention.`,
      },
      {
        id: 3,
        styleLabel: "Professional",
        text: `Providing constructive evaluation regarding ${service} at 3D Car Care Centre. Expected a higher caliber of consistency for this tier of service.`,
      },
      {
        id: 4,
        styleLabel: "Friendly & Conversational",
        text: `The team was polite, but unfortunately the outcome of ${service} did not quite match what was anticipated.`,
      },
      {
        id: 5,
        styleLabel: "Local Hinglish",
        text: `3D Car Care Centre me ${service} karwaya tha, average experience raha. Finishing aur improve ho sakti thi.`,
      },
      {
        id: 6,
        styleLabel: "Unique Personal Style",
        text: `Fair assessment: The ${service} was acceptable, but greater diligence in quality inspection is needed.`,
      },
    ];
  }
}

/**
 * Backwards compatibility helper
 */
export async function generateCustomerReview(input: SimplifiedReviewInput): Promise<{
  review: string;
  source: "openai" | "template";
}> {
  const res = await generateCustomerReviewSuggestions(input);
  return {
    review: res.suggestions[0]?.text || "",
    source: res.source,
  };
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
You are the business owner and managing director of "3D Car Care Centre", a premier automotive detailing studio in Indore, Madhya Pradesh.

Customer review details:
- Reviewer: ${review.reviewerName || "Valued Customer"}
- Rating: ${review.starRating} out of 5 stars
- Review comment: "${review.comment || "(No text comment left, rating only)"}"

Reply Guidelines:
1. For Positive reviews (4-5 stars):
   - Warmly and humbly thank them by name.
   - Mention their actual service/car if they referred to it in their review.
   - Reiterate your passion for perfection and wish them safe, shining drives.

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
- Keep it concise (35 to 65 words).
- Sign off naturally as "Team 3D Car Care Centre".
- Return ONLY the reply text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are the professional, courteous owner of 3D Car Care Centre replying to Google Reviews.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 180,
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
      return `नमस्ते ${name} जी! 3D Car Care Centre पर विश्वास जताने और अपना रिव्यू साझा करने के लिए धन्यवाद। आपकी कार को प्रीमियम फिनिश देना हमारा सौभाग्य रहा। सुरक्षित सफर की शुभकामनाएं! - टीम 3D Car Care Centre`;
    } else {
      return `नमस्ते ${name} जी, आपके फीडबैक के लिए धन्यवाद। जो असुविधा हुई उसके लिए हम क्षमा चाहते हैं। कृपया वर्कशॉप पर हमसे संपर्क करें ताकि हम इसे तुरंत सुधार सकें। - टीम 3D Car Care Centre`;
    }
  }

  if (isHinglish) {
    if (review.starRating >= 4) {
      return `Thank you so much ${name} ji! 3D Car Care Centre par trust karne ke liye shukriya. Apki car ki shine maintain rakhna hamara aim hai. Safe drives ahead! - Team 3D Car Care Centre`;
    } else {
      return `Hello ${name} ji, feedback ke liye dhanyawad. Aapko jo inconvenience hui uske liye hum sincere apologize karte hain. Please humare centre par direct connect karein taaki hum issue solve kar sakein. - Team 3D Car Care Centre`;
    }
  }

  // English fallback
  if (review.starRating >= 4) {
    return `Thank you for trusting 3D Car Care Centre, ${name}! We truly appreciate your feedback and look forward to keeping your vehicle in showroom condition. Safe drives! - Team 3D Car Care Centre`;
  } else if (review.starRating === 3) {
    return `Thank you for sharing your feedback, ${name}. We appreciate your support and have noted your points to keep improving our detailing quality. - Team 3D Car Care Centre`;
  } else {
    return `Dear ${name}, thank you for your feedback. We sincerely apologize that your experience did not meet our high standards. Please reach out to our management directly so we can inspect and resolve this for you. - Team 3D Car Care Centre`;
  }
}
