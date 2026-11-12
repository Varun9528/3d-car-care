"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  Star,
  Copy,
  ExternalLink,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ClipboardPaste,
  Send,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { COMPACT_SERVICES, BUSINESS_CONFIG, CompactService } from "@/lib/services-data";
import NfcCardPrintable from "./NfcCardPrintable";

type Language = "en" | "hi" | "hinglish";

const SESSION_STORAGE_KEY = "3d_car_care_session_review";

export default function ReviewHub() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedService, setSelectedService] = useState<string>("PPF");
  const [rating, setRating] = useState<number>(0); // Starts unselected (0)
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [experienceText, setExperienceText] = useState<string>("");

  const [generatedReview, setGeneratedReview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasOpenedGoogle, setHasOpenedGoogle] = useState<boolean>(false);
  const [clipboardFailed, setClipboardFailed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // QR Code & Printable NFC state
  const [permanentUrl, setPermanentUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [year, setYear] = useState<number>(2026);

  const experienceInputId = useId();
  const reviewResultId = useId();
  const reviewTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore state across browser tabs using sessionStorage (temporary, not permanent)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setYear(new Date().getFullYear());
      const origin = window.location.origin;
      const fullUrl = `${origin}${BUSINESS_CONFIG.permanentSlug}`;
      setPermanentUrl(fullUrl);

      // Auto-detect Hindi locale if browser is in Hindi
      const navLang = navigator.language?.toLowerCase() || "";
      if (navLang.startsWith("hi")) {
        setLanguage("hi");
      }

      // Restore temporary session review state (survives tab switching in same session)
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.review) setGeneratedReview(parsed.review);
          if (parsed.rating) setRating(parsed.rating);
          if (parsed.service) setSelectedService(parsed.service);
          if (parsed.experienceText) setExperienceText(parsed.experienceText);
          if (parsed.hasOpenedGoogle) setHasOpenedGoogle(parsed.hasOpenedGoogle);
        }
      } catch (e) {
        console.warn("Session storage restore error:", e);
      }

      // Generate high-resolution QR with pristine high-contrast optical quiet zones
      QRCode.toDataURL(fullUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#080B09",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
        .then((dataUri) => setQrDataUrl(dataUri))
        .catch((err) => console.error("QR Code error:", err));
    }
  }, []);

  // Save review state to sessionStorage temporarily
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (generatedReview) {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
              review: generatedReview,
              rating,
              service: selectedService,
              experienceText,
              hasOpenedGoogle,
            })
          );
        }
      } catch (e) {
        console.warn("Session storage save error:", e);
      }
    }
  }, [generatedReview, rating, selectedService, experienceText, hasOpenedGoogle]);

  const handleClearDraft = () => {
    setGeneratedReview("");
    setExperienceText("");
    setRating(0);
    setHasOpenedGoogle(false);
    setCopied(false);
    setClipboardFailed(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  };

  const handleGenerateReview = async () => {
    setErrorMessage("");

    if (rating === 0) {
      setErrorMessage(
        language === "hi"
          ? "कृपया आगे बढ़ने के लिए 1 से 5 स्टार रेटिंग चुनें।"
          : language === "hinglish"
          ? "Please pehle 1 se 5 star rating select karein."
          : "Please tap a star rating (1 to 5) to generate your review."
      );
      return;
    }

    setIsGenerating(true);
    setCopied(false);
    setHasOpenedGoogle(false);
    setClipboardFailed(false);

    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selectedService,
          rating,
          feedback: experienceText,
          language,
        }),
      });

      const data = await res.json();
      if (data.success && data.review) {
        setGeneratedReview(data.review);
      } else {
        setErrorMessage(data.error || "Failed to generate review. Please try again.");
      }
    } catch (err) {
      console.error("Generate review error:", err);
      setErrorMessage("Network issue. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fallbackCopyText = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  /**
   * Synchronous native navigation trigger:
   * Called on the click of an <a> anchor tag with target="_blank".
   * This guarantees 100% prevention of popup-blocking on iPhone Safari & Android Chrome,
   * while synchronously executing clipboard copy of the EXACT current edited review.
   */
  const handleAnchorClick = () => {
    // 1. Get the exact live edited text from the textarea or state
    const exactEditedText = reviewTextareaRef.current?.value || generatedReview;
    if (!exactEditedText) return;

    let copiedOk = false;

    // 2. Perform copy operation without awaiting a promise so the click gesture stays immediate
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(exactEditedText)
        .then(() => {
          setCopied(true);
          setClipboardFailed(false);
        })
        .catch(() => {
          // If navigator.clipboard fails or permission is denied, use fallback
          const ok = fallbackCopyText(exactEditedText);
          setCopied(ok);
          setClipboardFailed(!ok);
        });
    } else {
      copiedOk = fallbackCopyText(exactEditedText);
      setCopied(copiedOk);
      setClipboardFailed(!copiedOk);
    }

    setHasOpenedGoogle(true);
  };

  const handleManualCopy = () => {
    const exactEditedText = reviewTextareaRef.current?.value || generatedReview;
    if (!exactEditedText) return;

    let copiedOk = false;
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(exactEditedText)
        .then(() => {
          setCopied(true);
          setClipboardFailed(false);
        })
        .catch(() => {
          copiedOk = fallbackCopyText(exactEditedText);
          setCopied(copiedOk);
          setClipboardFailed(!copiedOk);
        });
    } else {
      copiedOk = fallbackCopyText(exactEditedText);
      setCopied(copiedOk);
      setClipboardFailed(!copiedOk);
    }
  };

  // Translations
  const t = {
    heroHeading: "YOUR CAR. OUR PASSION.",
    heroSubtitle: "Premium Protection. Perfect Finish.",
    heroSecondary:
      language === "hi"
        ? "3D Car Care को चुनने के लिए धन्यवाद। अपना अनुभव हमारे साथ साझा करें।"
        : language === "hinglish"
        ? "Thank you for choosing 3D Car Care. Share your experience with us."
        : "Thank you for choosing 3D Car Care. Share your experience with us.",
    trustLine: "PPF • CERAMIC COATING • DETAILING",
    step1Title:
      language === "hi"
        ? "1. सेवा चुनें"
        : language === "hinglish"
        ? "1. Select Service"
        : "1. Select Service",
    step2Title:
      language === "hi"
        ? "2. अपना अनुभव रेट करें"
        : language === "hinglish"
        ? "2. Rate Experience"
        : "2. Rate Experience",
    step3Title:
      language === "hi"
        ? "3. अपना अनुभव साझा करें (वैकल्पिक)"
        : language === "hinglish"
        ? "3. Tell us about your experience (optional)"
        : "3. Tell us about your experience (optional)",
    step3Placeholder:
      language === "hi"
        ? "उदा. काम की फिनिशिंग कैसी लगी, कोई विशेष बात..."
        : language === "hinglish"
        ? "e.g. Finishing, team, delivery time..."
        : "e.g. What you liked about the finish, team, or timing...",
    btnGenerate:
      language === "hi"
        ? "✨ मेरा रिव्यू बनाएं"
        : language === "hinglish"
        ? "✨ Generate My Review"
        : "✨ Generate My Review",
    btnGenerating:
      language === "hi"
        ? "रिव्यू तैयार हो रहा है..."
        : language === "hinglish"
        ? "Generating Review..."
        : "Generating Review...",
    ratingLabels: {
      1: language === "hi" ? "निराशाजनक (1/5)" : "Disappointing (1/5)",
      2: language === "hi" ? "सुधार की जरूरत (2/5)" : "Needs Improvement (2/5)",
      3: language === "hi" ? "औसत (3/5)" : "Average (3/5)",
      4: language === "hi" ? "बहुत अच्छा (4/5)" : "Very Good (4/5)",
      5: language === "hi" ? "शानदार (5/5)" : "Outstanding (5/5)",
    },
    reviewResultLabel:
      language === "hi"
        ? "आपका रिव्यू (संपादित कर सकते हैं)"
        : language === "hinglish"
        ? "Your Review (Editable)"
        : "Your Review (Editable)",
    btnCopyAndOpenGoogle:
      language === "hi"
        ? "COPY & OPEN GOOGLE REVIEW"
        : language === "hinglish"
        ? "COPY & OPEN GOOGLE REVIEW"
        : "COPY & OPEN GOOGLE REVIEW",
    successMessage:
      language === "hi"
        ? "आपका रिव्यू कॉपी हो गया है! Google पर पेस्ट करें, स्टार रेटिंग चुनें और Post दबाएं।"
        : language === "hinglish"
        ? "Your review is copied! Paste it into Google, select your star rating and tap Post."
        : "Your review is copied! Paste it into Google, select your star rating and tap Post.",
    step1Guide:
      language === "hi" ? "1. रिव्यू कॉपी हुआ" : "1. Review Copied",
    step2Guide:
      language === "hi" ? "2. Google बॉक्स में पेस्ट करें" : "2. Paste in Google Box",
    step3Guide:
      language === "hi" ? "3. स्टार चुनें और सबमिट करें" : "3. Select Stars & Post",
    regenerate:
      language === "hi"
        ? "पुनः बनाएं (Regenerate)"
        : language === "hinglish"
        ? "Regenerate"
        : "Regenerate",
    clearDraft:
      language === "hi" ? "नया शुरू करें" : "Start New",
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-6 selection:bg-[#65F000] selection:text-black">
      {/* ========================================================
          1. HERO SECTION - BRAND IDENTITY & LOGO
         ======================================================== */}
      <header className="flex flex-col items-center text-center gap-3">
        {/* Official Green 3D USA Brand Logo */}
        <div className="relative w-36 h-28 sm:w-44 sm:h-32 flex items-center justify-center p-2 rounded-2xl bg-[#0E1310] border border-[#303630] shadow-green-card transition-transform duration-200">
          <Image
            src="/3d_care_logo.png"
            alt="3D USA Official Logo"
            width={176}
            height={128}
            className="object-contain w-full h-full drop-shadow-[0_0_12px_rgba(101,240,0,0.35)]"
            priority
          />
        </div>

        {/* Headings */}
        <div className="flex flex-col gap-1 mt-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            {t.heroHeading}
          </h1>
          <p className="text-sm sm:text-base font-extrabold text-[#65F000] tracking-wide">
            {t.heroSubtitle}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mt-0.5 leading-relaxed">
            {t.heroSecondary}
          </p>
        </div>

        {/* Trust Line */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151A17] border border-[#303630] text-[10px] sm:text-xs font-semibold tracking-widest text-neutral-300 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#65F000] animate-pulse" />
          <span>{t.trustLine}</span>
        </div>

        {/* Language Switcher */}
        <div className="inline-flex items-center p-1 rounded-full bg-[#151A17] border border-[#303630] mt-1">
          {(["en", "hi", "hinglish"] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                language === lang
                  ? "bg-[#65F000] text-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[#1E2521]"
              }`}
            >
              {lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "Hinglish"}
            </button>
          ))}
        </div>
      </header>

      {/* ========================================================
          2. SIMPLIFIED 4-STEP CUSTOMER JOURNEY
         ======================================================== */}
      <main className="flex flex-col gap-5">
        {/* STEP 1: SELECT SERVICE (5 COMPACT BUTTONS) */}
        <section className="bg-[#151A17] border border-[#303630] rounded-2xl p-4 sm:p-5 shadow-lg">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#65F000] text-black text-[11px] font-black">
              1
            </span>
            <span>{t.step1Title}</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMPACT_SERVICES.map((s: CompactService) => {
              const isSelected = selectedService === s.name;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s.name)}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 flex items-center justify-center text-center cursor-pointer border ${
                    isSelected
                      ? "bg-[#080B09] border-[#65F000] text-[#65F000] shadow-[0_0_12px_rgba(101,240,0,0.25)]"
                      : "bg-[#0D110F] border-[#303630] text-neutral-300 hover:border-neutral-500 hover:text-white"
                  }`}
                >
                  {language === "hi" ? s.nameHindi : s.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 2: RATE EXPERIENCE (5 INTERACTIVE STARS, UNSELECTED BY DEFAULT) */}
        <section className="bg-[#151A17] border border-[#303630] rounded-2xl p-4 sm:p-5 shadow-lg text-center">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 mb-3 text-left flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#65F000] text-black text-[11px] font-black">
              2
            </span>
            <span>{t.step2Title}</span>
          </h2>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => {
                    setRating(star);
                    setErrorMessage("");
                  }}
                  className="min-w-[44px] min-h-[44px] p-1 flex items-center justify-center transition-transform active:scale-90 hover:scale-110 focus:outline-none cursor-pointer"
                  aria-label={`${star} Star Rating`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors duration-150 ${
                      active
                        ? "text-[#65F000] fill-[#65F000] drop-shadow-[0_0_8px_rgba(101,240,0,0.55)]"
                        : "text-[#303630] hover:text-neutral-500"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="min-h-[22px] mt-1 text-xs font-bold text-[#65F000]">
            {rating > 0
              ? t.ratingLabels[rating as keyof typeof t.ratingLabels]
              : <span className="text-neutral-500 font-normal">Tap a star to rate</span>}
          </div>
        </section>

        {/* STEP 3: OPTIONAL EXPERIENCE (ONE TEXT FIELD ONLY) */}
        <section className="bg-[#151A17] border border-[#303630] rounded-2xl p-4 sm:p-5 shadow-lg">
          <label
            htmlFor={experienceInputId}
            className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 mb-2.5 flex items-center gap-2"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#65F000] text-black text-[11px] font-black">
              3
            </span>
            <span>{t.step3Title}</span>
          </label>

          <textarea
            id={experienceInputId}
            rows={2}
            value={experienceText}
            onChange={(e) => setExperienceText(e.target.value)}
            placeholder={t.step3Placeholder}
            className="w-full bg-[#080B09] border border-[#303630] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#65F000] transition-colors resize-none"
          />
        </section>

        {/* ERROR NOTICE IF RATING MISSING */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 text-center font-medium animate-in fade-in duration-150">
            {errorMessage}
          </div>
        )}

        {/* STEP 4: PROMINENT GREEN GENERATE BUTTON */}
        <div>
          <button
            type="button"
            onClick={handleGenerateReview}
            disabled={isGenerating}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-black text-sm sm:text-base text-black bg-[#65F000] hover:bg-[#70FF00] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(101,240,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t.btnGenerating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-black" />
                <span>{generatedReview ? t.regenerate : t.btnGenerate}</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================
            3. REVIEW RESULT CARD (SMOOTH REVEAL + ZERO POPUP BLOCK ONE-TAP WORKFLOW)
           ======================================================== */}
        {generatedReview && (
          <section className="bg-[#151A17] border-2 border-[#65F000] rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(101,240,0,0.2)] animate-in fade-in slide-in-from-bottom-3 duration-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#65F000] tracking-wider">
                {t.reviewResultLabel}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex text-[#65F000]">
                  {Array.from({ length: rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#65F000]" />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  title="Clear review"
                  className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#080B09] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Live Editable Textarea */}
            <textarea
              ref={reviewTextareaRef}
              id={reviewResultId}
              rows={3}
              value={generatedReview}
              onChange={(e) => setGeneratedReview(e.target.value)}
              className="w-full bg-[#080B09] border border-[#303630] rounded-xl p-3 text-xs sm:text-sm text-white leading-relaxed focus:outline-none focus:border-[#65F000] transition-colors resize-none"
            />

            {/* 
              ONE PRIMARY ANCHOR BUTTON: 
              Using an <a> element with target="_blank" guarantees native synchronous opening 
              without being blocked by popup blockers on iPhone Safari or Android Chrome.
            */}
            <a
              href={BUSINESS_CONFIG.googleReviewWriteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAnchorClick}
              className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm text-black bg-[#65F000] hover:bg-[#70FF00] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(101,240,0,0.35)] cursor-pointer text-center no-underline"
            >
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span className="tracking-wide uppercase">{t.btnCopyAndOpenGoogle}</span>
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
            </a>

            {/* SUCCESS BANNER & 3-STEP VISUAL INSTRUCTIONS */}
            {hasOpenedGoogle && (
              <div className="bg-[#0D110F] border border-[#65F000]/40 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-[#65F000] shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-white leading-snug">
                    {t.successMessage}
                  </p>
                </div>

                {/* 3 Step Visual Guide */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#303630]/60">
                  <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#151A17] border border-[#303630]">
                    <div className="w-6 h-6 rounded-full bg-[#65F000]/20 text-[#65F000] flex items-center justify-center mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white leading-tight">
                      {t.step1Guide}
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#151A17] border border-[#303630]">
                    <div className="w-6 h-6 rounded-full bg-[#65F000]/20 text-[#65F000] flex items-center justify-center mb-1">
                      <ClipboardPaste className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white leading-tight">
                      {t.step2Guide}
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#151A17] border border-[#303630]">
                    <div className="w-6 h-6 rounded-full bg-[#65F000]/20 text-[#65F000] flex items-center justify-center mb-1">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white leading-tight">
                      {t.step3Guide}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FALLBACK IF CLIPBOARD ACCESS IS RESTRICTED BY BROWSER */}
            {clipboardFailed && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-left animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Clipboard write restricted by browser</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleManualCopy}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer"
                  >
                    {copied ? "Copied!" : "Manual Copy Text"}
                  </button>
                  <span className="text-[11px] text-neutral-300">
                    or long-press inside the box above to copy.
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            4. NFC & QR PRINTABLE CARD ACCESS
           ======================================================== */}
        <section className="bg-[#151A17] border border-[#303630] rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#080B09] border border-[#303630] text-[#65F000]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">NFC Card &amp; QR Print Design</div>
              <div className="text-[11px] text-neutral-400">CR80 format (85.60 × 53.98 mm)</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#080B09] border border-[#303630] hover:border-[#65F000] hover:text-[#65F000] transition-colors cursor-pointer"
          >
            View Cards
          </button>
        </section>
      </main>

      {/* ========================================================
          5. CR80 PRINTABLE MODAL
         ======================================================== */}
      {showPrintModal && (
        <NfcCardPrintable
          qrDataUrl={qrDataUrl}
          permanentUrl={permanentUrl}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* ========================================================
          6. FOOTER
         ======================================================== */}
      <footer className="text-center text-xs text-neutral-500 pt-3 pb-6 flex flex-col items-center gap-1">
        <p className="font-medium">© {year} 3D Car Care Centre. All rights reserved.</p>
        <p className="text-[11px] text-neutral-600">
          Sheetal Nagar, Medanta Hospital Road, Indore
        </p>
      </footer>
    </div>
  );
}
