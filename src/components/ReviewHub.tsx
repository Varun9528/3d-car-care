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
  Check,
} from "lucide-react";
import { COMPACT_SERVICES, BUSINESS_CONFIG, CompactService } from "@/lib/services-data";
import { ReviewSuggestion } from "@/lib/openai";
import NfcCardPrintable from "./NfcCardPrintable";

type Language = "en" | "hi" | "hinglish";

const SESSION_STORAGE_KEY = "3d_car_care_session_review_v2";

export default function ReviewHub() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedService, setSelectedService] = useState<string>("PPF");
  const [rating, setRating] = useState<number>(0); // Starts unselected (0)
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [experienceText, setExperienceText] = useState<string>("");

  // 6 Review Suggestions & Selected Review
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
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

  // Restore state across browser tabs using sessionStorage
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
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            setSuggestions(parsed.suggestions);
          }
          if (parsed.selectedSuggestionId) setSelectedSuggestionId(parsed.selectedSuggestionId);
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
        if (suggestions.length > 0 || generatedReview) {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
              suggestions,
              selectedSuggestionId,
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
  }, [suggestions, selectedSuggestionId, generatedReview, rating, selectedService, experienceText, hasOpenedGoogle]);

  const handleClearDraft = () => {
    setSuggestions([]);
    setSelectedSuggestionId(null);
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
          : "Please tap a star rating (1 to 5) to generate your reviews."
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
      if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        // Default to the first option or keep current
        setSelectedSuggestionId(1);
        setGeneratedReview(data.suggestions[0].text);
      } else {
        setErrorMessage(data.error || "Failed to generate reviews. Please try again.");
      }
    } catch (err) {
      console.error("Generate reviews error:", err);
      setErrorMessage("Network issue. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (sug: ReviewSuggestion) => {
    setSelectedSuggestionId(sug.id);
    setGeneratedReview(sug.text);
    setCopied(false);
    setHasOpenedGoogle(false);
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
   * Guarantees 100% prevention of popup-blocking on iPhone Safari & Android Chrome,
   * while synchronously executing clipboard copy of the live edited review.
   */
  const handleAnchorClick = () => {
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
    businessName: "3D CAR CARE CENTRE",
    welcomeHeading: "Welcome to 3D Car Care",
    thankYouMessage:
      language === "hi"
        ? "अपनी कार के लिए हम पर विश्वास जताने हेतु धन्यवाद! अपना अनुभव साझा करें।"
        : language === "hinglish"
        ? "Thank you for trusting us with your car! Share your experience."
        : "Thank you for trusting us with your car! Share your experience.",
    serviceLabel:
      language === "hi" ? "सेवा चुनें" : language === "hinglish" ? "Select Service" : "Select Service",
    ratingLabel:
      language === "hi" ? "अपना अनुभव रेट करें" : language === "hinglish" ? "Rate Experience" : "Rate Experience",
    feedbackPlaceholder:
      language === "hi"
        ? "हमें बताएं कि आपको हमारी सेवा में क्या पसंद आया..."
        : language === "hinglish"
        ? "Tell us what you liked about our service..."
        : "Tell us what you liked about our service...",
    btnGenerate:
      language === "hi"
        ? "✦ 6 रिव्यू विकल्प बनाएं"
        : language === "hinglish"
        ? "✦ Generate 6 Review Options"
        : "✦ Generate 6 Review Options",
    btnGenerating:
      language === "hi"
        ? "6 विकल्प तैयार हो रहे हैं..."
        : language === "hinglish"
        ? "Generating 6 Options..."
        : "Generating 6 Options...",
    ratingLabels: {
      1: language === "hi" ? "निराशाजनक (1/5)" : "Disappointing (1/5)",
      2: language === "hi" ? "सुधार की जरूरत (2/5)" : "Needs Improvement (2/5)",
      3: language === "hi" ? "औसत (3/5)" : "Average (3/5)",
      4: language === "hi" ? "बहुत अच्छा (4/5)" : "Very Good (4/5)",
      5: language === "hi" ? "शानदार (5/5)" : "Outstanding (5/5)",
    },
    suggestionsHeader:
      language === "hi" ? "अपना पसंदीदा रिव्यू चुनें (6 विकल्प)" : "Choose Your Preferred Review (6 Options)",
    reviewResultLabel:
      language === "hi" ? "चयनित रिव्यू (एडिट कर सकते हैं)" : "Selected Review (Editable)",
    btnCopyAndOpenGoogle:
      language === "hi"
        ? "COPY SELECTED REVIEW & OPEN GOOGLE"
        : "COPY SELECTED REVIEW & OPEN GOOGLE",
    successMessage:
      language === "hi"
        ? "आपका रिव्यू कॉपी हो गया है! Google पर पेस्ट करें, स्टार रेटिंग चुनें और Post दबाएं।"
        : "Your review is copied! Paste it into Google, select your star rating and tap Post.",
    step1Guide:
      language === "hi" ? "1. रिव्यू कॉपी हुआ" : "1. Review Copied",
    step2Guide:
      language === "hi" ? "2. Google में पेस्ट करें" : "2. Paste in Google Box",
    step3Guide:
      language === "hi" ? "3. स्टार चुनें & सबमिट करें" : "3. Select Stars & Post",
    regenerateAll:
      language === "hi" ? "6 नए विकल्प बनाएं" : "Regenerate All 6",
  };

  return (
    <div className="min-h-screen w-full bg-[#080B09] flex flex-col items-center justify-center p-3 sm:p-5 py-6 sm:py-10 selection:bg-[#65F000] selection:text-black">
      {/* ========================================================
          THE SINGLE MAIN CARD (All elements inside one container)
         ======================================================== */}
      <div className="w-full max-w-[480px] bg-[#121614] border border-[#65F000]/30 rounded-3xl p-5 sm:p-7 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_35px_rgba(101,240,0,0.12)] flex flex-col gap-5 relative overflow-hidden backdrop-blur-md">
        
        {/* Subtle Ambient Green Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#65F000]/15 blur-3xl pointer-events-none rounded-full" />

        {/* 1. OFFICIAL 3D USA LOGO */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div className="relative w-36 h-24 sm:w-40 sm:h-28 flex items-center justify-center">
            <Image
              src="/3d_care_logo.png"
              alt="3D USA Official Logo"
              width={160}
              height={112}
              className="object-contain w-full h-full drop-shadow-[0_0_15px_rgba(101,240,0,0.4)]"
              priority
            />
          </div>

          {/* Business Name, Heading & Thank You Message */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="text-[11px] font-black tracking-widest text-[#65F000] uppercase">
              {t.businessName}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              {t.welcomeHeading}
            </h1>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed mt-0.5">
              {t.thankYouMessage}
            </p>
          </div>

          {/* Language Selector */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-[#080B09] border border-[#303630] mt-1">
            {(["en", "hi", "hinglish"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                  language === lang
                    ? "bg-[#65F000] text-black shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-[#1E2521]"
                }`}
              >
                {lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "Hinglish"}
              </button>
            ))}
          </div>
        </div>

        {/* Subtle Separator */}
        <div className="h-px w-full bg-[#303630]/60" />

        {/* 2. CUSTOMER INPUT A: SELECT SERVICE (5 COMPACT OPTIONS) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
            <span>{t.serviceLabel}</span>
            <span className="text-[10px] text-neutral-500 font-normal">Choose one</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {COMPACT_SERVICES.map((s: CompactService, idx: number) => {
              const isSelected = selectedService === s.name;
              const isLastAndOdd = idx === COMPACT_SERVICES.length - 1 && COMPACT_SERVICES.length % 2 !== 0;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s.name)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 flex items-center justify-center text-center cursor-pointer border ${
                    isLastAndOdd ? "col-span-2 sm:col-span-1" : ""
                  } ${
                    isSelected
                      ? "bg-[#080B09] border-[#65F000] text-[#65F000] shadow-[0_0_12px_rgba(101,240,0,0.25)]"
                      : "bg-[#080B09]/80 border-[#303630] text-neutral-300 hover:border-neutral-500 hover:text-white"
                  }`}
                >
                  {language === "hi" ? s.nameHindi : s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. CUSTOMER INPUT B: RATE EXPERIENCE (5 INTERACTIVE STARS) */}
        <div className="flex flex-col items-center text-center gap-1.5 py-1">
          <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-300">
            {t.ratingLabel}
          </label>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
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
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors duration-150 ${
                      active
                        ? "text-[#65F000] fill-[#65F000] drop-shadow-[0_0_8px_rgba(101,240,0,0.6)]"
                        : "text-[#303630] hover:text-neutral-500"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="min-h-[18px] text-[11px] font-bold text-[#65F000]">
            {rating > 0
              ? t.ratingLabels[rating as keyof typeof t.ratingLabels]
              : <span className="text-neutral-500 font-normal">Tap a star to rate</span>}
          </div>
        </div>

        {/* 4. CUSTOMER INPUT C: OPTIONAL FEEDBACK */}
        <div className="flex flex-col gap-1.5">
          <textarea
            id={experienceInputId}
            rows={2}
            value={experienceText}
            onChange={(e) => setExperienceText(e.target.value)}
            placeholder={t.feedbackPlaceholder}
            className="w-full bg-[#080B09] border border-[#303630] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#65F000] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* VALIDATION ERROR IF RATING MISSING */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 text-center font-medium animate-in fade-in duration-150">
            {errorMessage}
          </div>
        )}

        {/* 5. GENERATE REVIEWS BUTTON */}
        <div>
          <button
            type="button"
            onClick={handleGenerateReview}
            disabled={isGenerating}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm text-black bg-[#65F000] hover:bg-[#70FF00] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(101,240,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.btnGenerating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{suggestions.length > 0 ? t.regenerateAll : t.btnGenerate}</span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================
            6. MULTIPLE REVIEW SUGGESTIONS LIST (6 DISTINCT OPTIONS)
           ======================================================== */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[#303630]/60 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#65F000] tracking-wider">
                {t.suggestionsHeader}
              </span>
              <button
                type="button"
                onClick={handleGenerateReview}
                disabled={isGenerating}
                className="text-[11px] font-bold text-neutral-400 hover:text-[#65F000] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{t.regenerateAll}</span>
              </button>
            </div>

            {/* 6 Selectable Review Cards */}
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {suggestions.map((sug) => {
                const isSelected = selectedSuggestionId === sug.id;
                return (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 cursor-pointer relative ${
                      isSelected
                        ? "bg-[#080B09] border-[#65F000] shadow-[0_0_15px_rgba(101,240,0,0.2)]"
                        : "bg-[#080B09]/70 border-[#303630] hover:border-neutral-500 hover:bg-[#080B09]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                            isSelected ? "bg-[#65F000] text-black" : "bg-[#1E2521] text-neutral-400"
                          }`}
                        >
                          {sug.id}
                        </span>
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wide ${
                            isSelected ? "text-[#65F000]" : "text-neutral-400"
                          }`}
                        >
                          {sug.styleLabel}
                        </span>
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#65F000]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Selected</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Tap to select</span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-200 leading-relaxed line-clamp-3">
                      &quot;{sug.text}&quot;
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Live Editable Textarea for Final Polish */}
            {generatedReview && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#303630]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-neutral-300 tracking-wider">
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

                <textarea
                  ref={reviewTextareaRef}
                  id={reviewResultId}
                  rows={3}
                  value={generatedReview}
                  onChange={(e) => setGeneratedReview(e.target.value)}
                  className="w-full bg-[#080B09] border border-[#303630] rounded-xl p-3 text-xs sm:text-sm text-white leading-relaxed focus:outline-none focus:border-[#65F000] transition-colors resize-none"
                />

                {/* ONE PRIMARY BUTTON: COPY SELECTED REVIEW & OPEN GOOGLE */}
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
                  <div className="bg-[#080B09] border border-[#65F000]/40 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2 text-left">
                      <CheckCircle2 className="w-4 h-4 text-[#65F000] shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-white leading-snug">
                        {t.successMessage}
                      </p>
                    </div>

                    {/* 3 Step Visual Guide */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#303630]/60">
                      <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#121614] border border-[#303630]">
                        <div className="w-6 h-6 rounded-full bg-[#65F000]/20 text-[#65F000] flex items-center justify-center mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-white leading-tight">
                          {t.step1Guide}
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#121614] border border-[#303630]">
                        <div className="w-6 h-6 rounded-full bg-[#65F000]/20 text-[#65F000] flex items-center justify-center mb-1">
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-white leading-tight">
                          {t.step2Guide}
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#121614] border border-[#303630]">
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

                {/* FALLBACK IF CLIPBOARD ACCESS IS RESTRICTED */}
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
              </div>
            )}
          </div>
        )}

        {/* 7. NFC & QR PRINT BUTTON */}
        <div className="pt-2 border-t border-[#303630]/60 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400">
            NFC &amp; QR Business Cards
          </div>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#65F000] bg-[#080B09] border border-[#303630] hover:border-[#65F000] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>CR80 Cards</span>
          </button>
        </div>

      </div>

      {/* ========================================================
          CR80 PRINTABLE MODAL
         ======================================================== */}
      {showPrintModal && (
        <NfcCardPrintable
          qrDataUrl={qrDataUrl}
          permanentUrl={permanentUrl}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Subtle Bottom Footer */}
      <footer className="text-center text-xs text-neutral-600 mt-4 flex flex-col items-center gap-1">
        <p className="font-medium">© {year} 3D Car Care Centre. All rights reserved.</p>
        <p className="text-[11px] text-neutral-700">
          Sheetal Nagar, Medanta Hospital Road, Indore
        </p>
      </footer>
    </div>
  );
}
