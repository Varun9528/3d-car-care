export interface ServiceItem {
  id: string;
  name: string;
  nameHindi: string;
}

export interface ExperienceItem {
  id: string;
  name: string;
  nameHindi: string;
}

export const ALL_SERVICES: ServiceItem[] = [
  { id: "ppf-installation", name: "PPF Installation", nameHindi: "पीपीएफ इंस्टॉलेशन" },
  { id: "ceramic-coating", name: "Ceramic Coating", nameHindi: "सिरेमिक कोटिंग" },
  { id: "graphene-coating", name: "Graphene Coating", nameHindi: "ग्राफीन कोटिंग" },
  { id: "car-washing", name: "Car Washing", nameHindi: "कार वॉशिंग" },
  { id: "foam-washing", name: "Foam Washing", nameHindi: "फोम वॉश" },
  { id: "interior-deep-cleaning", name: "Interior Deep Cleaning", nameHindi: "इंटीरियर डीप क्लीनिंग" },
  { id: "exterior-detailing", name: "Exterior Detailing", nameHindi: "एक्सटीरियर डिटेलिंग" },
  { id: "paint-correction", name: "Paint Correction", nameHindi: "पेंट करेक्शन" },
  { id: "rubbing-polishing", name: "Rubbing & Polishing", nameHindi: "रबिंग और पॉलिशिंग" },
  { id: "headlight-restoration", name: "Headlight Restoration", nameHindi: "हेडलाइट रेस्टोरेशन" },
  { id: "glass-coating", name: "Glass Coating", nameHindi: "ग्लास कोटिंग" },
  { id: "alloy-wheel-coating", name: "Alloy Wheel Coating", nameHindi: "अलॉय व्हील कोटिंग" },
  { id: "steam-wash", name: "Steam Wash", nameHindi: "स्टीम वॉश" },
  { id: "other-service", name: "Other", nameHindi: "अन्य सेवा" },
];

export const ALL_EXPERIENCES: ExperienceItem[] = [
  { id: "excellent-finish", name: "Excellent Finish", nameHindi: "उत्कृष्ट फिनिशिंग" },
  { id: "mirror-shine", name: "Mirror-Like Shine", nameHindi: "शीशे जैसी चमक" },
  { id: "professional-staff", name: "Professional Staff", nameHindi: "कुशल व अनुभवी स्टाफ" },
  { id: "friendly-behaviour", name: "Friendly Behaviour", nameHindi: "विनम्र व्यवहार" },
  { id: "deep-cleaning", name: "Deep Cleaning", nameHindi: "गहरी सफाई" },
  { id: "attention-to-detail", name: "Attention to Detail", nameHindi: "बारीकी से काम" },
  { id: "quality-work", name: "Quality Work", nameHindi: "शानदार क्वालिटी" },
  { id: "on-time-delivery", name: "On-Time Delivery", nameHindi: "समय पर डिलीवरी" },
  { id: "good-communication", name: "Good Communication", nameHindi: "स्पष्ट बातचीत" },
  { id: "value-for-money", name: "Value for Money", nameHindi: "पैसा वसूल सेवा" },
  { id: "clean-workshop", name: "Clean Workshop", nameHindi: "साफ-सुथरी वर्कशॉप" },
  { id: "smooth-ppf", name: "Smooth PPF Installation", nameHindi: "स्मूथ पीपीएफ कार्य" },
  { id: "paint-protection", name: "Paint Protection", nameHindi: "पेंट सुरक्षा" },
  { id: "comfortable-experience", name: "Comfortable Experience", nameHindi: "आरामदायक अनुभव" },
  { id: "after-service-guidance", name: "After-Service Guidance", nameHindi: "सर्विस बाद सही सलाह" },
  { id: "other-exp", name: "Other", nameHindi: "अन्य" },
];

// Backwards compatibility alias
export const COMPACT_SERVICES = ALL_SERVICES;
export type CompactService = ServiceItem;

export const BUSINESS_CONFIG = {
  name: "3D Car Care Centre",
  city: "Indore",
  address: "13/14, New, Medanta Hospital Road, Sheetal Nagar, Indore, Madhya Pradesh 452010",
  googleMapsUrl: "https://maps.app.goo.gl/mx4wJsypGx4JiwNe8",
  // Direct Google local review submission link for 3D Car Care Indore
  googleReviewWriteUrl: "https://search.google.com/local/writereview?placeid=ChIJr1fI6NvfYjkR0y2mx8-ky-g",
  permanentSlug: "/3d-car-care",
  brandColors: {
    bg: "#080B09",
    green: "#65F000",
    greenBright: "#70FF00",
    charcoal: "#151A17",
    grey: "#303630",
    white: "#FFFFFF",
  },
};
