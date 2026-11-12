export interface DetailingService {
  id: string;
  name: string;
  nameHindi: string;
  category: "protection" | "wash" | "detailing" | "restoration";
  description: string;
  iconName: string;
  popularAspects: string[];
}

export const DETAILING_SERVICES: DetailingService[] = [
  {
    id: "ppf",
    name: "PPF (Paint Protection Film)",
    nameHindi: "पीपीएफ (पेंट प्रोटेक्शन फिल्म)",
    category: "protection",
    description: "Self-healing ultra-clear polyurethane barrier against chips, scratches & road debris.",
    iconName: "ShieldCheck",
    popularAspects: ["Seamless Edge Wrapping", "Self-Healing Effect", "Flawless Clarity", "High Gloss Finish"],
  },
  {
    id: "ceramic-coating",
    name: "Ceramic Coating",
    nameHindi: "सिरेमिक कोटिंग",
    category: "protection",
    description: "Multi-year hydrophobic nano-ceramic shield for extreme gloss & chemical resistance.",
    iconName: "Sparkles",
    popularAspects: ["Hydrophobic Water Beading", "Deep Mirror Gloss", "Smooth Slick Finish", "Long-term Durability"],
  },
  {
    id: "graphene-coating",
    name: "Graphene Coating",
    nameHindi: "ग्राफीन कोटिंग",
    category: "protection",
    description: "Next-gen carbon honeycomb protection with superior heat dissipation & hardness.",
    iconName: "Hexagon",
    popularAspects: ["Ultra Water Spot Resistance", "Extreme Deep Wet Gloss", "Anti-Static Dust Repellent", "Tough Hardness"],
  },
  {
    id: "car-washing",
    name: "Car Washing",
    nameHindi: "कार वॉशिंग",
    category: "wash",
    description: "Thorough multi-stage body wash with pH-neutral shampoo & micro-scratch prevention.",
    iconName: "Droplets",
    popularAspects: ["Spotless Finish", "Clean Wheel Arches", "Streak-Free Windows", "Quick & Efficient"],
  },
  {
    id: "foam-washing",
    name: "Foam Washing",
    nameHindi: "फोम वॉशिंग",
    category: "wash",
    description: "Rich snow foam pre-soak that gently lifts abrasive grime before contact washing.",
    iconName: "CloudSun",
    popularAspects: ["Thick Snow Foam Soak", "Safe Scratch-Free Wash", "Underbody Rinse", "Super Clean & Shiny"],
  },
  {
    id: "interior-cleaning",
    name: "Interior Cleaning",
    nameHindi: "इंटीरियर क्लीनिंग",
    category: "detailing",
    description: "Deep upholstery shampoo, leather conditioning, AC vent sanitization & odor removal.",
    iconName: "Sofa",
    popularAspects: ["Stain-Free Upholstery", "Fresh Cabin Scent", "Deep Vacuuming", "Leather Conditioned & Supple"],
  },
  {
    id: "exterior-detailing",
    name: "Exterior Detailing",
    nameHindi: "एक्सटीरियर डिटेलिंग",
    category: "detailing",
    description: "Full decontamination, trim restoration, glass treatment & paint enhancement.",
    iconName: "Car",
    popularAspects: ["Deep Color Enhancement", "Trim & Rubber Restored", "Wheel & Tire Dressing", "Showroom Look"],
  },
  {
    id: "paint-correction",
    name: "Paint Correction",
    nameHindi: "पेंट करेक्शन",
    category: "restoration",
    description: "Machine compounding to permanently remove swirl marks, oxidation & buffer trails.",
    iconName: "Wrench",
    popularAspects: ["Swirl Marks 100% Gone", "Crystal Clear Reflections", "True Depth Restored", "Master Craftsmanship"],
  },
  {
    id: "rubbing-polishing",
    name: "Rubbing & Polishing",
    nameHindi: "रबिंग और पॉलिशिंग",
    category: "restoration",
    description: "Targeted abrasive compounding followed by ultra-fine polish for brilliant shine.",
    iconName: "Disc",
    popularAspects: ["Minor Scratches Removed", "Smooth Glassy Surface", "Vibrant Clear Gloss", "Affordable Rejuvenation"],
  },
  {
    id: "headlight-restoration",
    name: "Headlight Restoration",
    nameHindi: "हेडलाइट रेस्टोरेशन",
    category: "restoration",
    description: "Clearing yellowed, hazy, oxidized lenses with UV protective seal for night visibility.",
    iconName: "Sun",
    popularAspects: ["Crystal Clear Night Visibility", "Yellow Fog Completely Removed", "Like-New Look", "UV Sealed"],
  },
  {
    id: "glass-coating",
    name: "Glass Coating",
    nameHindi: "ग्लास कोटिंग",
    category: "protection",
    description: "Super-slick rain repellant layer on all windows & windshield for zero wiper drag.",
    iconName: "Eye",
    popularAspects: ["Rain Water Flies Off", "Zero Wiper Chattering", "Anti-Glare Night Driving", "Crystal Clear Safety"],
  },
  {
    id: "alloy-wheel-coating",
    name: "Alloy Wheel Coating",
    nameHindi: "अलॉय व्हील कोटिंग",
    category: "protection",
    description: "Heat-resistant ceramic barrier on rims preventing hot brake dust bonding.",
    iconName: "CircleDot",
    popularAspects: ["Brake Dust Wipes Off Easily", "Glossy Rim Finish", "High Heat Resistance", "Protected Calipers"],
  },
  {
    id: "steam-wash",
    name: "Steam Wash",
    nameHindi: "स्टीम वॉश",
    category: "wash",
    description: "High-pressure thermal dry steam for engine bay, door jambs & cabin disinfection.",
    iconName: "Flame",
    popularAspects: ["Sanitized 99.9% Germs Free", "Eco-friendly Water Saver", "Clean Engine Bay", "Deep Crevice Detail"],
  },
];

export const GENERAL_EXPERIENCE_TAGS = [
  "Mirror Gloss Finish",
  "Deep Interior Cleaning",
  "Attention to Detail",
  "Professional & Polite Staff",
  "On-Time Delivery",
  "Transparent Honest Pricing",
  "High-End Detailing Equipment",
  "Showroom Quality Handover",
];

export const BUSINESS_CONFIG = {
  name: "3D Car Care Indore",
  city: "Indore",
  address: "13/14, New, Medanta Hospital Road, Sheetal Nagar, Indore, Madhya Pradesh 452010",
  googleMapsUrl: "https://maps.app.goo.gl/mx4wJsypGx4JiwNe8",
  // Google local writereview link for 3D Car Care Indore
  googleReviewWriteUrl: "https://search.google.com/local/writereview?placeid=ChIJr1fI6NvfYjkR0y2mx8-ky-g",
  fallbackDirectReviewUrl: "https://maps.app.goo.gl/mx4wJsypGx4JiwNe8",
  permanentSlug: "/3d-car-care",
  phone: "+91 98260 00000", // placeholder or fallback contact for replies
};
