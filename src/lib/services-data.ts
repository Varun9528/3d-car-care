export interface CompactService {
  id: string;
  name: string;
  nameHindi: string;
}

export const COMPACT_SERVICES: CompactService[] = [
  { id: "ppf", name: "PPF", nameHindi: "पीपीएफ (PPF)" },
  { id: "ceramic-graphene", name: "Ceramic / Graphene Coating", nameHindi: "सिरेमिक / ग्राफीन कोटिंग" },
  { id: "car-wash", name: "Car Wash", nameHindi: "कार वॉश" },
  { id: "detailing", name: "Detailing", nameHindi: "डिटेलिंग" },
  { id: "other", name: "Other", nameHindi: "अन्य सेवा" },
];

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
