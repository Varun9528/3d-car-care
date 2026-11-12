import OpenAI from "openai";
import { isRecentReviewHash, recordRecentReviewHashes } from "./storage";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export interface SimplifiedReviewInput {
  service?: string; // backwards compatibility
  services?: string[]; // Multiple selected services
  experiences?: string[]; // Multiple selected experiences
  rating: number; // 1 to 5
  feedback?: string; // Optional user notes / experience
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
  "Natural Hinglish",
  "Unique Personal Style",
];

function normalizeHash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
}

/**
 * Generate 6 distinct, non-repetitive review suggestions in a single OpenAI request.
 */
export async function generateCustomerReviewSuggestions(input: SimplifiedReviewInput): Promise<{
  suggestions: ReviewSuggestion[];
  source: "openai" | "template";
}> {
  const openai = getOpenAIClient();
  const trimmedFeedback = (input.feedback || "").trim();

  // Consolidate services and experiences
  const selectedServices = (input.services && input.services.length > 0)
    ? input.services
    : (input.service ? [input.service] : ["Car Care Service"]);

  const selectedExperiences = (input.experiences && input.experiences.length > 0)
    ? input.experiences
    : [];

  const servicesText = selectedServices.join(", ");
  const experiencesText = selectedExperiences.length > 0
    ? selectedExperiences.join(", ")
    : "High satisfaction with overall detailing quality";

  if (!openai) {
    return {
      suggestions: generateFallbackSuggestions(input),
      source: "template",
    };
  }

  let languagePrompt = "Write reviews in natural, fluent English.";
  if (input.language === "hi") {
    languagePrompt = "Write reviews in natural Hindi script (Devanagari), except Style 5 which should be colloquial Hinglish.";
  } else if (input.language === "hinglish") {
    languagePrompt = "Write reviews in natural conversational Hinglish (Hindi words written in Roman English script).";
  }

  const prompt = `
You are generating 6 distinctly different Google review suggestions for an authentic customer of "3D Car Care Centre" in Indore.

Customer Verified Input:
- Services Received: ${servicesText}
- Specific What They Liked / Experiences: ${experiencesText}
- Star Rating: ${input.rating} out of 5 stars
- Customer's Own Notes: "${trimmedFeedback || "None provided (base on selected services and experiences)"}"
- Primary Language: ${languagePrompt}

Generate EXACTLY 6 distinct review options matching these styles:
1. "Short & Simple" — Concise, punchy, 1-2 natural sentences.
2. "Detailed Experience" — In-depth, mentions craftsmanship, gloss, protection, or edge detailing.
3. "Professional" — Formal, courteous, and polite phrasing.
4. "Friendly & Conversational" — Warm, relatable, enthusiastic customer voice.
5. "Natural Hinglish" — Authentic Indori/Indian conversational casual tone (e.g. "Kaam sach me top-notch hua hai...").
6. "Unique Personal Style" — Alternative sentence structure, different vocabulary and distinct opening phrasing.

CRITICAL ANTI-REPETITION & AUTHENTICITY RULES:
- Every single review MUST have a completely different opening sentence and different vocabulary. Never start two reviews with the same word or phrase (e.g. do NOT start multiple with "Got my car" or "Visited 3D Car Care").
- Mention relevant selected services (${servicesText}) naturally and contextually. Do NOT rattle off a robotic comma-separated list.
- Weave in what they liked (${experiencesText}) smoothly and realistically.
- Strictly adhere to their star rating (${input.rating} of 5 stars). For 1-3 stars, keep it honest, polite, and constructive.
- No cliché marketing hype or repetitive closing phrases like "Highly recommended" in all reviews.
- Never invent staff names, prices, or car models not mentioned.
- Length: between 22 and 65 words per review.

Return ONLY a valid JSON object matching this schema:
{
  "suggestions": [
    { "id": 1, "styleLabel": "Short & Simple", "text": "..." },
    { "id": 2, "styleLabel": "Detailed Experience", "text": "..." },
    { "id": 3, "styleLabel": "Professional", "text": "..." },
    { "id": 4, "styleLabel": "Friendly & Conversational", "text": "..." },
    { "id": 5, "styleLabel": "Natural Hinglish", "text": "..." },
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
          content: "You are an expert automotive review generator that outputs strictly valid JSON containing 6 distinct, diverse customer reviews with zero repetition.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.82,
      max_tokens: 750,
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      const list: ReviewSuggestion[] = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : Array.isArray(parsed.reviews)
        ? parsed.reviews
        : [];

      if (list.length >= 6) {
        // Deduplicate within the generation
        const seenInBatch = new Set<string>();
        const uniqueList: ReviewSuggestion[] = [];
        const fallbackList = generateFallbackSuggestions(input);

        for (let i = 0; i < 6; i++) {
          const item = list[i];
          const text = (item?.text || "").trim().replace(/^["']|["']$/g, "");
          const hash = normalizeHash(text);

          // Check if duplicate within this batch or already in recent storage
          const isDupInBatch = seenInBatch.has(hash);
          let isRecent = false;
          try {
            isRecent = await isRecentReviewHash(hash);
          } catch {
            isRecent = false;
          }

          if (text.length > 15 && !isDupInBatch && !isRecent) {
            seenInBatch.add(hash);
            uniqueList.push({
              id: i + 1,
              styleLabel: item.styleLabel || STYLE_LABELS[i],
              text,
            });
          } else {
            // Replace with distinct fallback
            const replacement = fallbackList[i]?.text || text;
            const repHash = normalizeHash(replacement);
            seenInBatch.add(repHash);
            uniqueList.push({
              id: i + 1,
              styleLabel: STYLE_LABELS[i],
              text: replacement,
            });
          }
        }

        if (uniqueList.length === 6) {
          // Record recent hashes for best-effort future repetition avoidance
          try {
            const hashes = uniqueList.map((u) => normalizeHash(u.text));
            await recordRecentReviewHashes(hashes);
          } catch (e) {
            console.warn("[Storage] Failed to record recent review hashes:", e);
          }

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
 * 6 Diverse Fallback Suggestions when OpenAI API is unavailable or offline
 */
export function generateFallbackSuggestions(input: SimplifiedReviewInput): ReviewSuggestion[] {
  const selectedServices = (input.services && input.services.length > 0)
    ? input.services
    : (input.service ? [input.service] : ["Car Care"]);

  const selectedExperiences = input.experiences || [];

  const service = selectedServices.slice(0, 2).join(" & ");
  const expPhraseEn = selectedExperiences.length > 0
    ? `Really appreciated their ${selectedExperiences.slice(0, 2).join(" and ").toLowerCase()}.`
    : "Attention to intricate edges was outstanding.";
  const expPhraseHi = selectedExperiences.length > 0
    ? `खासकर इनकी ${selectedExperiences.slice(0, 2).join(" व ")} बहुत पसंद आई।`
    : "बारीकी से किया गया काम बहुत पसंद आया।";
  const expPhraseHinglish = selectedExperiences.length > 0
    ? `Specially inki ${selectedExperiences.slice(0, 2).join(" aur ")} bohot impress karti hai.`
    : "Detailing aur finishing sach me top notch thi.";

  const note = (input.feedback || "").trim();
  const rating = input.rating || 5;
  const isPositive = rating >= 4;

  if (input.language === "hi") {
    if (isPositive) {
      return [
        {
          id: 1,
          styleLabel: "Short & Simple",
          text: `3D Car Care Centre इंदौर से ${service} करवाया। काम बहुत साफ और समय पर पूरा हुआ।`,
        },
        {
          id: 2,
          styleLabel: "Detailed Experience",
          text: `इंदौर में अपनी गाड़ी के ${service} के लिए 3D Car Care चुना। ${expPhraseHi} ${note ? `${note}। ` : ""}गाड़ी की चमक और फिनिशिंग बिल्कुल नई जैसी हो गई है।`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `3D Car Care Centre में कुशल स्टाफ और उच्च स्तरीय डिटेलिंग कार्यप्रणाली देखने को मिली। ${service} के सभी मानक पूरी तरह खरे उतरे।`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `बहुत ही सुखद अनुभव रहा! ${expPhraseHi} ${note ? `${note}। ` : ""}स्टाफ बहुत विनम्र और मददगार है। टीम 3D Car Care को ढेर सारी शुभकामनाएं!`,
        },
        {
          id: 5,
          styleLabel: "Natural Hinglish",
          text: `3D Car Care Indore me ${service} karwaya tha. Kaam ek number hua hai! ${expPhraseHinglish} Showroom jaisi shine wapas aa gayi.`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `गाड़ी की सही हिफाजत के लिए 3D Car Care इंदौर सबसे भरोसेमंद स्टूडियो लगा। ${service} में जो परफेक्शन मिला, उससे दिल खुश हो गया।`,
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
          text: `3D Car Care में ${service} करवाया। ${note ? `${note}। ` : ""}कुछ हिस्सों पर फिनिशिंग और बेहतर हो सकती थी।`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `3D Car Care Centre से ${service} सेवा ली। उम्मीद है कि प्रबंधन गुणवत्ता नियंत्रण पर और ध्यान देगा।`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `मेरा अनुभव औसत रहा। स्टाफ विनम्र था लेकिन ${service} का काम उम्मीद से थोड़ा कम रहा।`,
        },
        {
          id: 5,
          styleLabel: "Natural Hinglish",
          text: `3D Car Care me ${service} karwaya tha, average experience raha. Finishing aur improve ho sakti thi.`,
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
          text: `Recently visited 3D Car Care Centre for ${service}. ${expPhraseHinglish} ${note ? `${note}. ` : ""}Gadi bilkul showroom condition me wapas mili.`,
        },
        {
          id: 3,
          styleLabel: "Professional",
          text: `Impressed with the methodical execution of ${service} at 3D Car Care Centre Indore. Professional team and punctual handover.`,
        },
        {
          id: 4,
          styleLabel: "Friendly & Conversational",
          text: `Bohot hi pyara experience raha 3D Car Care ke sath! ${expPhraseHinglish} ${note ? `${note}. ` : ""}Team bohot polite thi aur har detail ache se handle ki.`,
        },
        {
          id: 5,
          styleLabel: "Natural Hinglish",
          text: `Indore me car detailing ke liye 3D Car Care Centre sach me best laga. ${service} me jo finishing aayi hai, gadi alag hi chamak rahi hai!`,
        },
        {
          id: 6,
          styleLabel: "Unique Personal Style",
          text: `Apni car ki care ke liye best choice in town. ${service} was done with supreme attention to detail. Great value for car enthusiasts in Indore!`,
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
          styleLabel: "Natural Hinglish",
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
        text: `Brought my vehicle to 3D Car Care Centre for ${service}. ${expPhraseEn} ${note ? `${note}. ` : ""}The gloss and attention to intricate edges were remarkable. Truly restored that showroom look.`,
      },
      {
        id: 3,
        styleLabel: "Professional",
        text: `Exemplary detailing standards at 3D Car Care Centre Indore. Their execution of ${service} demonstrated superior technical proficiency and thorough quality control.`,
      },
      {
        id: 4,
        styleLabel: "Friendly & Conversational",
        text: `So glad I chose 3D Car Care for my car! ${expPhraseEn} ${note ? `${note}. ` : ""}The staff were welcoming, courteous, and took genuine care of every little detail. Big thanks to the crew!`,
      },
      {
        id: 5,
        styleLabel: "Natural Hinglish",
        text: `3D Car Care Centre Indore me ${service} karwaya tha. Kaam sach me top-notch hua hai! ${expPhraseHinglish} Showroom jaisi shine wapas aa gayi. Truly value for money.`,
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
        styleLabel: "Natural Hinglish",
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
