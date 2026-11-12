import OpenAI from "openai";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export interface SimplifiedReviewInput {
  service: string; // "PPF" | "Ceramic / Graphene" | "Car Wash" | "Detailing" | "Other"
  rating: number; // 1 to 5
  feedback?: string; // Optional user experience
  language: "en" | "hi" | "hinglish";
}

/**
 * Generate a short, genuine, natural customer review based strictly on user input.
 */
export async function generateCustomerReview(input: SimplifiedReviewInput): Promise<{
  review: string;
  source: "openai" | "template";
}> {
  const openai = getOpenAIClient();
  const trimmedFeedback = (input.feedback || "").trim();

  // If customer provided no or minimal feedback (< 3 characters), provide a clean, editable starter template
  if (!trimmedFeedback) {
    return {
      review: getStarterTemplate(input.service, input.rating, input.language),
      source: "template",
    };
  }

  if (!openai) {
    return {
      review: generateFallbackCustomerReview(input),
      source: "template",
    };
  }

  let languageInstruction = "Write the review in natural, fluent English.";
  if (input.language === "hi") {
    languageInstruction = "Write the review in authentic Hindi script (Devanagari). Keep it natural, conversational, and culturally appropriate.";
  } else if (input.language === "hinglish") {
    languageInstruction = "Write the review in natural, casual Hinglish (Hindi written in Roman English script, e.g. '3D Car Care Centre Indore me PPF karwaya, finishing bohot achhi hai...').";
  }

  const prompt = `
You are generating a genuine, short Google review written by an actual car owner for "3D Car Care Centre" in Indore.

Customer provided information:
- Service received: ${input.service || "Car Care Service"}
- Star rating: ${input.rating} out of 5 stars
- Customer's actual notes: "${trimmedFeedback}"
- Language: ${languageInstruction}

Strict Rules:
1. Base the review ONLY on what the customer provided above. Do NOT invent specific car models, staff names, extra services, or experiences they did not mention.
2. Tone must strictly match their rating of ${input.rating} out of 5 stars.
3. Keep it brief, authentic, and human (around 25 to 55 words). Avoid cliché marketing jargon or robotic AI buzzwords.
4. Write in first person ("I", "my car").
5. Return ONLY the review text. Do not wrap in quotes or add headers.
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate authentic, concise, honest customer reviews for Google Maps based strictly on provided notes.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.65,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (content) {
      return { review: content.replace(/^["']|["']$/g, ""), source: "openai" };
    }
  } catch (err) {
    console.error("[OpenAI] Review generation error:", err);
  }

  return {
    review: generateFallbackCustomerReview(input),
    source: "template",
  };
}

/**
 * Clean, natural editable starter templates when no extra notes are provided
 */
function getStarterTemplate(service: string, rating: number, language: "en" | "hi" | "hinglish"): string {
  const serviceLabel = service === "Other" ? "car care service" : service;

  if (language === "hi") {
    if (rating >= 4) {
      return `3D Car Care Centre से ${serviceLabel} की सर्विस ली। काम बहुत बढ़िया और फिनिशिंग शानदार हुई। टीम का काम प्रोफेशनल है। संतुष्ट अनुभव!`;
    } else if (rating === 3) {
      return `3D Car Care Centre में अपनी कार का ${serviceLabel} करवाया। काम ठीक-ठाक रहा, लेकिन कुछ और बेहतर फिनिशिंग की उम्मीद थी।`;
    } else {
      return `3D Car Care Centre से ${serviceLabel} की सर्विस ली थी। मेरा अनुभव उम्मीद के मुताबिक संतोषजनक नहीं रहा। उम्मीद है इस पर ध्यान दिया जाएगा।`;
    }
  }

  if (language === "hinglish") {
    if (rating >= 4) {
      return `3D Car Care Centre Indore me ${serviceLabel} karwaya. Kaam bohot hi badiya aur finishing top-notch hai. Team professional hai. Highly recommended!`;
    } else if (rating === 3) {
      return `3D Car Care Centre se ${serviceLabel} karwaya tha. Average to decent experience raha, finishing me thoda aur dhyan diya ja sakta hai.`;
    } else {
      return `3D Car Care Centre me ${serviceLabel} karwaya, but experience expectations ke hisaab se sahi nahi raha. Feedback par dhyan dena chahiye.`;
    }
  }

  // English starter template
  if (rating >= 4) {
    return `Got ${serviceLabel} done at 3D Car Care Centre Indore. Extremely satisfied with the workmanship and attention to detail. Great team and great finish!`;
  } else if (rating === 3) {
    return `Visited 3D Car Care Centre for ${serviceLabel}. Decent service overall, with room for minor improvements in finishing.`;
  } else {
    return `Had my car in for ${serviceLabel} at 3D Car Care Centre. Unfortunately, the experience did not meet my expectations.`;
  }
}

/**
 * Fallback generator when customer provided notes but OpenAI is unavailable
 */
function generateFallbackCustomerReview(input: SimplifiedReviewInput): string {
  const note = (input.feedback || "").trim();
  const serviceLabel = input.service === "Other" ? "car care service" : input.service;

  if (input.language === "hi") {
    if (input.rating >= 4) {
      return `3D Car Care Centre से ${serviceLabel} करवाया। ${note ? `${note}। ` : ""}काम वाकई बहुत शानदार हुआ और टीम का व्यवहार भी काफी अच्छा था।`;
    } else if (input.rating === 3) {
      return `3D Car Care Centre में ${serviceLabel} का काम करवाया। ${note ? `${note}। ` : ""}अनुभव सामान्य रहा।`;
    } else {
      return `3D Car Care Centre से ${serviceLabel} की सर्विस ली। ${note ? `${note}। ` : ""}काम से पूरी तरह संतुष्ट नहीं हूं।`;
    }
  }

  if (input.language === "hinglish") {
    if (input.rating >= 4) {
      return `3D Car Care Centre Indore se ${serviceLabel} karwaya. ${note ? `${note}. ` : ""}Kaam aur finishing dono top quality ka hua hai. Bahut achha experience raha!`;
    } else if (input.rating === 3) {
      return `3D Car Care Centre me ${serviceLabel} karwaya tha. ${note ? `${note}. ` : ""}Decent work raha overall.`;
    } else {
      return `3D Car Care Centre me ${serviceLabel} karwaya tha. ${note ? `${note}. ` : ""}Experience expectations ke mutabik nahi raha.`;
    }
  }

  // English fallback
  if (input.rating >= 4) {
    return `Got ${serviceLabel} done at 3D Car Care Centre Indore. ${note ? `${note}. ` : ""}Really impressed with the quality and finishing. Would definitely recommend!`;
  } else if (input.rating === 3) {
    return `Visited 3D Car Care Centre for ${serviceLabel}. ${note ? `${note}. ` : ""}Fair and decent experience overall.`;
  } else {
    return `Visited 3D Car Care Centre for ${serviceLabel}. ${note ? `${note}. ` : ""}The service did not meet my expectations.`;
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
