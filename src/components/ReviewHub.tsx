"use client";

import React, { useState, useEffect, useId } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  ShieldCheck,
  Sparkles,
  Hexagon,
  Droplets,
  CloudSun,
  Sofa,
  Car,
  Wrench,
  Disc,
  Sun,
  Eye,
  CircleDot,
  Flame,
  Star,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Radio,
  Download,
  Smartphone,
  Info,
  CheckCircle2,
  RefreshCw,
  Sparkle,
} from "lucide-react";
import {
  DETAILING_SERVICES,
  GENERAL_EXPERIENCE_TAGS,
  BUSINESS_CONFIG,
  DetailingService,
} from "@/lib/services-data";

type Language = "en" | "hi" | "hinglish";

interface ReviewHubProps {
  initialLanguage?: Language;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Sparkles,
  Hexagon,
  Droplets,
  CloudSun,
  Sofa,
  Car,
  Wrench,
  Disc,
  Sun,
  Eye,
  CircleDot,
  Flame,
};

export default function ReviewHub({ initialLanguage = "en" }: ReviewHubProps) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [selectedServices, setSelectedServices] = useState<string[]>(["ceramic-coating"]);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [likedAspects, setLikedAspects] = useState<string[]>([
    "Mirror Gloss Finish",
    "Professional & Polite Staff",
  ]);
  const [vehicleModel, setVehicleModel] = useState<string>("");
  const [customFeedback, setCustomFeedback] = useState<string>("");

  const [generatedReview, setGeneratedReview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(false);

  // QR Code & NFC state
  const [permanentUrl, setPermanentUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [nfcWriting, setNfcWriting] = useState<boolean>(false);
  const [nfcStatus, setNfcStatus] = useState<string>("");

  const [year, setYear] = useState<number>(2026);

  // Unique accessible IDs
  const vehicleInputId = useId();
  const feedbackInputId = useId();
  const reviewTextareaId = useId();

  // Determine current permanent URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setYear(new Date().getFullYear());
      const origin = window.location.origin;
      const url = `${origin}${BUSINESS_CONFIG.permanentSlug}`;
      setPermanentUrl(url);

      QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: "#0F1117",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
        .then((dataUri) => setQrDataUrl(dataUri))
        .catch((err) => console.error("QR Code error:", err));
    }
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((s) => s !== id)
          : prev
        : [...prev, id]
    );
  };

  const toggleAspect = (aspect: string) => {
    setLikedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  // Dynamic available aspects combining general + selected service-specific aspects
  const availableAspects = React.useMemo(() => {
    const set = new Set<string>(GENERAL_EXPERIENCE_TAGS);
    selectedServices.forEach((sId) => {
      const s = DETAILING_SERVICES.find((x) => x.id === sId);
      if (s) {
        s.popularAspects.forEach((a) => set.add(a));
      }
    });
    return Array.from(set);
  }, [selectedServices]);

  const handleGenerateReview = async () => {
    setIsGenerating(true);
    setCopied(false);

    const serviceNames = selectedServices
      .map((id) => DETAILING_SERVICES.find((s) => s.id === id)?.name || id)
      .filter(Boolean);

    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: serviceNames,
          rating,
          likedAspects,
          additionalFeedback: customFeedback,
          vehicleModel,
          language,
        }),
      });

      const data = await res.json();
      if (data.success && data.review) {
        setGeneratedReview(data.review);
        setHasGeneratedOnce(true);
      }
    } catch (err) {
      console.error("Failed to generate review:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedReview) return;
    try {
      await navigator.clipboard.writeText(generatedReview);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard copy error:", err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "3D-Car-Care-Indore-Review-QR.png";
    a.click();
  };

  const handleWriteNfc = async () => {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setNfcStatus("Web NFC is not supported in this browser. Use the NFC Tools app on your mobile.");
      return;
    }

    try {
      setNfcWriting(true);
      setNfcStatus("Tap your NTAG213 or NTAG215 card against your device now...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [{ recordType: "url", data: permanentUrl }],
      });
      setNfcStatus("Success! NFC card programmed with permanent URL.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNfcStatus(`NFC write failed: ${msg}. You can write the URL manually via NFC Tools.`);
    } finally {
      setNfcWriting(false);
    }
  };

  // Multi-lingual labels
  const t = {
    badge:
      language === "hi"
        ? "प्रीमियम ऑटो डिटेलिंग • इंदौर"
        : language === "hinglish"
        ? "PREMIUM DETAILING STUDIO • INDORE"
        : "PREMIUM AUTO DETAILING • INDORE",
    heading: "Welcome to 3D Car Care",
    subtitle:
      language === "hi"
        ? "अपनी कार के लिए हम पर विश्वास जताने हेतु धन्यवाद!"
        : language === "hinglish"
        ? "Thank you for trusting 3D Car Care with your car!"
        : "Thank you for trusting us with your car!",
    address: BUSINESS_CONFIG.address,
    q1Title:
      language === "hi"
        ? "1. आपने कौन सी सेवा प्राप्त की?"
        : language === "hinglish"
        ? "1. Which service did you receive?"
        : "1. Which service did you receive?",
    q1Sub:
      language === "hi"
        ? "एक या अधिक सेवाएं चुनें"
        : language === "hinglish"
        ? "Select one or multiple services received"
        : "Select one or multiple services received",
    q2Title:
      language === "hi"
        ? "2. आपका अनुभव कैसा रहा?"
        : language === "hinglish"
        ? "2. How was your experience?"
        : "2. How was your experience?",
    q3Title:
      language === "hi"
        ? "3. आपको हमारी सेवा में क्या सबसे अच्छा लगा?"
        : language === "hinglish"
        ? "3. What did you like about our service?"
        : "3. What did you like about our service?",
    q4Title:
      language === "hi"
        ? "4. कोई अतिरिक्त फीडबैक या टिप्पणी?"
        : language === "hinglish"
        ? "4. Any additional feedback or notes?"
        : "4. Any additional feedback or notes?",
    vehiclePlaceholder:
      language === "hi"
        ? "उदा. Creta, Thar, Harrier, BMW, आदि"
        : "e.g. Creta, Thar, Harrier, BMW, Scorpio...",
    feedbackPlaceholder:
      language === "hi"
        ? "अपने अनुभव के बारे में कुछ भी साझा करें..."
        : language === "hinglish"
        ? "Koi specific baat jo aap mention karna chahein..."
        : "Any specific comment, staff praise, or observations...",
    btnGenerate:
      language === "hi"
        ? "मेरा रिव्यू बनाएं"
        : language === "hinglish"
        ? "Generate My Review"
        : "Generate My Review",
    btnGenerating:
      language === "hi"
        ? "रिव्यू तैयार हो रहा है..."
        : language === "hinglish"
        ? "Generating AI Review..."
        : "Generating AI Review...",
    btnCopy:
      language === "hi"
        ? "रिव्यू कॉपी करें"
        : language === "hinglish"
        ? "Copy Review"
        : "Copy Review",
    btnCopied:
      language === "hi"
        ? "कॉपी हो गया! अब Google पर पेस्ट करें"
        : language === "hinglish"
        ? "Copied! Ready to paste on Google"
        : "Copied! Ready to paste on Google",
    btnPost:
      language === "hi"
        ? "Google पर पोस्ट करें"
        : language === "hinglish"
        ? "Post on Google"
        : "Post on Google",
    reviewHelper:
      language === "hi"
        ? "आप नीचे दिए गए रिव्यू को अपनी इच्छानुसार संपादित (Edit) कर सकते हैं। इसके बाद 'Copy' करें और 'Post on Google' दबाकर सबमिट करें।"
        : language === "hinglish"
        ? "Aap review ko edit bhi kar sakte hain. 'Copy' karke 'Post on Google' dabayein aur apna review submit karein."
        : "You can edit this review to your liking. Simply copy it and click 'Post on Google' to submit.",
    ratingLabels: {
      5: language === "hi" ? "अति उत्कृष्ट (5/5)" : "Outstanding (5/5)",
      4: language === "hi" ? "बहुत अच्छा (4/5)" : "Very Good (4/5)",
      3: language === "hi" ? "औसत (3/5)" : "Satisfactory / Average (3/5)",
      2: language === "hi" ? "सुधार की जरूरत (2/5)" : "Needs Improvement (2/5)",
      1: language === "hi" ? "निराशाजनक (1/5)" : "Disappointing (1/5)",
    },
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
      {/* Top Header & Branding */}
      <header className="text-center flex flex-col items-center gap-3">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-gold-500/40 shadow-[0_0_25px_rgba(212,175,55,0.25)] bg-neutral-950 flex items-center justify-center p-2 mb-1">
          <Image
            src="/3d_care_logo.png"
            alt="3D Car Care Indore Logo"
            width={112}
            height={112}
            className="object-contain w-full h-full"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 backdrop-blur-md">
          <Sparkle className="w-3.5 h-3.5 text-gold-400" />
          <span className="text-xs uppercase tracking-widest text-gold-300 font-bold">
            {t.badge}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gold-gradient text-gold-glow">
          {t.heading}
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 max-w-lg font-medium">
          {t.subtitle}
        </p>

        <p className="text-xs text-neutral-500 max-w-md">
          📍 {t.address}
        </p>

        {/* Language Switcher */}
        <div className="mt-2 inline-flex items-center p-1 rounded-full bg-neutral-900 border border-neutral-800 shadow-inner">
          {(["en", "hi", "hinglish"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                language === lang
                  ? "bg-gradient-to-r from-gold-500 to-gold-600 text-black shadow-md font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "Hinglish"}
            </button>
          ))}
        </div>
      </header>

      {/* Main Interactive Form */}
      <div className="flex flex-col gap-8">
        {/* Question 1: Service Selection */}
        <section className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-500 text-black text-xs font-black">
                1
              </span>
              {t.q1Title}
            </h2>
            <span className="text-xs text-gold-400 font-medium">
              {t.q1Sub}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {DETAILING_SERVICES.map((service: DetailingService) => {
              const isSelected = selectedServices.includes(service.id);
              const IconComponent = ICON_MAP[service.iconName] || ShieldCheck;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-2 relative ${
                    isSelected
                      ? "border-gold-500 bg-gradient-to-b from-gold-500/15 to-neutral-900 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                      : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-850"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-gold-500 text-black"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gold-500 text-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {language === "hi" ? service.nameHindi : service.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {service.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Question 2: Star Rating & Experience */}
        <section className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-500 text-black text-xs font-black">
              2
            </span>
            {t.q2Title}
          </h2>

          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform transform active:scale-90 hover:scale-110 focus:outline-none"
                    aria-label={`${star} Stars`}
                  >
                    <Star
                      className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                        filled
                          ? "text-gold-400 fill-gold-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                          : "text-neutral-700 hover:text-neutral-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-sm font-semibold text-gold-300">
              {t.ratingLabels[rating as keyof typeof t.ratingLabels]}
            </div>

            <p className="text-[11px] text-neutral-500 text-center max-w-sm mt-1">
              {language === "hi"
                ? "सभी कस्टमर फीडबैक का हम सम्मान करते हैं। 1 से 5 स्टार तक सभी रिव्यू का पूरा अधिकार है।"
                : "All customers have equal access to leave genuine reviews regardless of star rating."}
            </p>
          </div>
        </section>

        {/* Question 3: Highlights Liked & Vehicle Model */}
        <section className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-500 text-black text-xs font-black">
              3
            </span>
            {t.q3Title}
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {availableAspects.map((aspect) => {
              const isSelected = likedAspects.includes(aspect);
              return (
                <button
                  key={aspect}
                  type="button"
                  onClick={() => toggleAspect(aspect)}
                  className={`text-xs px-3.5 py-2 rounded-lg border font-medium transition-all ${
                    isSelected
                      ? "border-gold-500 bg-gold-500/20 text-gold-200 shadow-sm"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                  }`}
                >
                  {isSelected && <span className="mr-1.5 text-gold-400 font-bold">✓</span>}
                  {aspect}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <label
              htmlFor={vehicleInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              {language === "hi"
                ? "आपकी कार का मॉडल (वैकल्पिक):"
                : "Your Car / Vehicle Model (Optional):"}
            </label>
            <input
              id={vehicleInputId}
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder={t.vehiclePlaceholder}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>
        </section>

        {/* Question 4: Additional Feedback */}
        <section className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-500 text-black text-xs font-black">
              4
            </span>
            {t.q4Title}
          </h2>

          <textarea
            id={feedbackInputId}
            rows={2}
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            placeholder={t.feedbackPlaceholder}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-gold-500 transition-colors resize-none"
          />
        </section>

        {/* Generate Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateReview}
            disabled={isGenerating}
            className="w-full py-4 px-6 rounded-xl font-extrabold text-sm sm:text-base text-black bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA771C] hover:opacity-95 active:scale-[0.99] transition-all shadow-[0_0_25px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t.btnGenerating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{hasGeneratedOnce ? "Regenerate Review" : t.btnGenerate}</span>
              </>
            )}
          </button>
        </div>

        {/* Output Review Card */}
        {generatedReview && (
          <section className="bg-neutral-900 border-2 border-gold-500/80 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-gold-400 tracking-wider">
                  Your Personalized Review
                </span>
                <span className="text-xs text-neutral-400">
                  (Editable)
                </span>
              </div>
              <div className="flex text-gold-400">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
                ))}
              </div>
            </div>

            <textarea
              id={reviewTextareaId}
              rows={4}
              value={generatedReview}
              onChange={(e) => setGeneratedReview(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-sm sm:text-base text-white leading-relaxed focus:outline-none focus:border-gold-500 transition-colors"
            />

            <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-2 px-1">
              <span>{generatedReview.split(/\s+/).filter(Boolean).length} words</span>
              <span>{t.reviewHelper}</span>
            </div>

            {/* Action Buttons: Copy Review & Post on Google */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={handleCopy}
                className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  copied
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50"
                    : "bg-neutral-800 hover:bg-neutral-750 text-white border-neutral-700"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t.btnCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.btnCopy}</span>
                  </>
                )}
              </button>

              <a
                href={BUSINESS_CONFIG.googleReviewWriteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopy}
                className="py-3.5 px-4 rounded-xl font-extrabold text-sm text-black bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
              >
                <span>{t.btnPost}</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>
            </div>

            <p className="text-[11px] text-neutral-400 text-center mt-3">
              Google will open in a new window. Simply paste the copied review and click submit!
            </p>
          </section>
        )}

        {/* QR Code & NFC Card Tap Integration Section */}
        <section className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Shop QR Code & NFC Card URL
                </h3>
                <p className="text-xs text-neutral-400">
                  Permanent landing URL for counter stands, mirror tags & NFC cards
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-neutral-200 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-gold-400" />
                <span>View & Print QR</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-black bg-gold-500 hover:bg-gold-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download QR</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* QR Code & NFC Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-gold-500/40 rounded-2xl max-w-md w-full p-6 text-center relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg text-lg"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="inline-block p-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs px-3 py-1 font-bold uppercase mb-3">
              3D Car Care Indore
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              Customer QR & NFC URL
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Scannable with any smartphone camera or programmed into NTAG213 / NTAG215 cards
            </p>

            {qrDataUrl && (
              <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="3D Car Care Indore Review QR Code"
                  className="w-56 h-56 mx-auto"
                />
                <p className="text-[10px] text-neutral-600 font-mono mt-1">
                  {permanentUrl}
                </p>
              </div>
            )}

            {/* Permanent Link copy */}
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between text-xs mb-4">
              <span className="font-mono text-neutral-300 truncate max-w-[240px]">
                {permanentUrl}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(permanentUrl);
                  alert("URL copied to clipboard!");
                }}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-gold-400 font-bold"
              >
                Copy
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Print-Ready PNG (High Resolution)</span>
              </button>

              <button
                type="button"
                onClick={handleWriteNfc}
                disabled={nfcWriting}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border border-neutral-700"
              >
                <Radio className="w-4 h-4 text-gold-400" />
                <span>{nfcWriting ? "Waiting for NFC Tap..." : "Program NFC Card (Web NFC)"}</span>
              </button>
            </div>

            {nfcStatus && (
              <p className="text-xs text-gold-300 bg-neutral-950 p-2 rounded-lg mt-3 border border-neutral-800">
                {nfcStatus}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 text-left">
              <strong>NFC Setup Instructions:</strong>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Download free <strong>NFC Tools</strong> app (iOS/Android).</li>
                <li>Tap <strong>Write → Add a record → URL / URI</strong>.</li>
                <li>Paste <code className="text-neutral-300">{permanentUrl}</code> and tap <strong>Write</strong>.</li>
                <li>Tap your NTAG213 or NTAG215 card. Done!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-600 pt-4 pb-8 flex flex-col items-center gap-2">
        <p>© {year} 3D Car Care Indore. All rights reserved.</p>
        <p className="text-[11px] text-neutral-500">
          Automotive Detailing • PPF • Ceramic Coating • Paint Correction • Steam Wash
        </p>
      </footer>
    </div>
  );
}
