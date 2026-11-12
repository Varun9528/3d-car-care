"use client";

import React, { useRef } from "react";
import { Download, Printer, Wifi, QrCode as QrIcon } from "lucide-react";

interface NfcCardPrintableProps {
  qrDataUrl: string;
  permanentUrl: string;
  onClose: () => void;
}

export default function NfcCardPrintable({
  qrDataUrl,
  permanentUrl,
  onClose,
}: NfcCardPrintableProps) {
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const downloadCardSvg = (side: "front" | "back") => {
    const isFront = side === "front";
    // ISO/IEC 7810 ID-1 standard: 85.60mm x 53.98mm (aspect ratio ~1.585)
    // In pixels at ~300 DPI: 1011px x 638px
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1011 638" width="85.60mm" height="53.98mm">
  <defs>
    <radialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#65F000" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#080B09" stop-opacity="0" />
    </radialGradient>
    <pattern id="carbon" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#151A17" />
      <circle cx="12" cy="12" r="1.5" fill="#1c231f" />
    </pattern>
  </defs>

  <!-- Bleed & Background -->
  <rect width="1011" height="638" fill="#080B09" rx="38" />
  <rect width="1011" height="638" fill="url(#carbon)" rx="38" />
  <circle cx="505" cy="319" r="400" fill="url(#greenGlow)" />
  <rect x="2" y="2" width="1007" height="634" fill="none" stroke="#65F000" stroke-opacity="0.4" stroke-width="4" rx="36" />

  ${
    isFront
      ? `
    <!-- Front Content -->
    <!-- 3D Brand Typography & Logo -->
    <text x="505" y="160" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="88" fill="#65F000" letter-spacing="4">3D</text>
    <text x="505" y="215" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="28" fill="#FFFFFF" letter-spacing="8">CAR CARE CENTRE</text>
    <text x="505" y="250" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="16" fill="#70FF00" letter-spacing="6">INDORE</text>

    <!-- NFC Wave Icon -->
    <g transform="translate(480, 310) scale(2)">
      <path d="M 0,0 C 8,6 16,16 16,28 C 16,40 8,50 0,56" fill="none" stroke="#65F000" stroke-width="3" stroke-linecap="round"/>
      <path d="M -8,8 C -2,13 4,20 4,28 C 4,36 -2,43 -8,48" fill="none" stroke="#65F000" stroke-width="3" stroke-linecap="round" stroke-opacity="0.6"/>
    </g>

    <text x="505" y="470" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="34" fill="#FFFFFF" letter-spacing="4">TAP TO REVIEW</text>
    <text x="505" y="515" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="18" fill="#A0A8A0" letter-spacing="2">TOUCH NFC CARD TO PHONE</text>

    <text x="505" y="585" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="14" fill="#65F000" letter-spacing="4">PPF • CERAMIC COATING • DETAILING</text>
  `
      : `
    <!-- Back Content -->
    <text x="505" y="90" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="28" fill="#FFFFFF" letter-spacing="4">SCAN &amp; SHARE YOUR EXPERIENCE</text>

    <!-- QR Container Background (White for highest optical contrast) -->
    <rect x="365" y="125" width="280" height="280" fill="#FFFFFF" rx="16" />
    <image href="${qrDataUrl}" x="380" y="140" width="250" height="250" />

    <text x="505" y="455" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="26" fill="#65F000" letter-spacing="4">3D CAR CARE CENTRE</text>
    <text x="505" y="490" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="16" fill="#E0E0E0">Sheetal Nagar, Medanta Hospital Road, Indore</text>

    <!-- URL pill -->
    <rect x="255" y="525" width="500" height="42" fill="#151A17" stroke="#303630" stroke-width="2" rx="21" />
    <text x="505" y="552" text-anchor="middle" font-family="monospace" font-weight="600" font-size="16" fill="#65F000">${permanentUrl}</text>
  `
  }
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `3D-Car-Care-NFC-Card-${side.toUpperCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D100E] border border-[#303630] rounded-2xl max-w-2xl w-full p-5 sm:p-7 relative shadow-2xl my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-lg text-lg focus:outline-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-left mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151A17] border border-[#65F000]/40 text-[#65F000] text-xs font-bold uppercase tracking-wider mb-2">
            CR80 Standard (85.60 mm × 53.98 mm)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            NFC & QR Business Card (Print Layout)
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Standard credit-card dimensions with 3mm bleed margin for professional plastic (PVC) or cardstock printing.
          </p>
        </div>

        {/* Card Previews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* FRONT PREVIEW */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>Card Front (Tap)</span>
              <span className="text-[10px] text-[#65F000]">85.60 × 53.98 mm</span>
            </div>
            <div
              ref={frontCardRef}
              className="relative aspect-[85.6/53.98] w-full rounded-xl bg-[#080B09] border border-[#65F000]/40 p-4 flex flex-col justify-between items-center text-center shadow-lg overflow-hidden group"
              style={{
                backgroundImage:
                  "radial-gradient(#151A17 1px, transparent 0), radial-gradient(rgba(101,240,0,0.08) 1px, transparent 0)",
                backgroundSize: "14px 14px",
                backgroundPosition: "0 0, 7px 7px",
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black tracking-widest text-[#65F000]">3D USA</span>
                <Wifi className="w-4 h-4 text-[#65F000] rotate-90" />
              </div>

              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/3d_care_logo.png"
                  alt="3D USA"
                  className="h-12 w-auto object-contain mx-auto mb-1 drop-shadow-[0_0_8px_rgba(101,240,0,0.4)]"
                />
                <div className="text-[10px] font-extrabold tracking-widest text-white uppercase">CAR CARE CENTRE</div>
                <div className="text-[8px] tracking-widest text-[#70FF00]">INDORE</div>
              </div>

              <div className="w-full">
                <div className="text-xs font-black tracking-wider text-white">TAP TO REVIEW</div>
                <div className="text-[8px] text-neutral-400">TOUCH NFC CARD TO PHONE</div>
              </div>
            </div>
            <button
              onClick={() => downloadCardSvg("front")}
              className="w-full py-2 rounded-lg bg-[#151A17] hover:bg-[#1E2521] border border-[#303630] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#65F000]" />
              <span>Download Front Vector (SVG)</span>
            </button>
          </div>

          {/* BACK PREVIEW */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>Card Back (Scan QR)</span>
              <span className="text-[10px] text-[#65F000]">85.60 × 53.98 mm</span>
            </div>
            <div
              ref={backCardRef}
              className="relative aspect-[85.6/53.98] w-full rounded-xl bg-[#080B09] border border-[#65F000]/40 p-4 flex flex-col justify-between items-center text-center shadow-lg overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(#151A17 1px, transparent 0), radial-gradient(rgba(101,240,0,0.08) 1px, transparent 0)",
                backgroundSize: "14px 14px",
                backgroundPosition: "0 0, 7px 7px",
              }}
            >
              <div className="text-[9px] font-bold text-white tracking-wider">
                SCAN &amp; SHARE YOUR EXPERIENCE
              </div>

              {qrDataUrl && (
                <div className="bg-white p-1.5 rounded-lg shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                  />
                </div>
              )}

              <div>
                <div className="text-[10px] font-black text-[#65F000] tracking-wider">
                  3D CAR CARE CENTRE INDORE
                </div>
                <div className="text-[8px] text-neutral-400 truncate max-w-[200px]">
                  {permanentUrl}
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadCardSvg("back")}
              className="w-full py-2 rounded-lg bg-[#151A17] hover:bg-[#1E2521] border border-[#303630] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#65F000]" />
              <span>Download Back Vector (SVG)</span>
            </button>
          </div>
        </div>

        {/* NTAG Programming Instructions */}
        <div className="bg-[#151A17] border border-[#303630] rounded-xl p-4 text-left text-xs mb-4">
          <div className="flex items-center gap-2 text-[#65F000] font-bold mb-1.5">
            <Wifi className="w-4 h-4 rotate-90" />
            <span>NFC Card Programming Guide (NTAG213 / NTAG215)</span>
          </div>
          <p className="text-neutral-400 text-[11px] mb-2 leading-relaxed">
            Program the identical permanent URL so tapping or scanning opens the exact same page:
          </p>
          <div className="bg-[#080B09] p-2 rounded-lg font-mono text-[11px] text-[#65F000] border border-[#303630] mb-2.5 truncate">
            {permanentUrl}
          </div>
          <ol className="list-decimal list-inside space-y-1 text-neutral-300 text-[11px]">
            <li>Install free <strong>NFC Tools</strong> on your Android or iPhone.</li>
            <li>Select <strong>Write</strong> → <strong>Add a record</strong> → <strong>URL / URI</strong>.</li>
            <li>Paste your production URL (<code className="text-[#65F000]">{permanentUrl}</code>).</li>
            <li>Tap <strong>Write</strong> and hold your NTAG213 or NTAG215 card to the back of the phone.</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-[#65F000] hover:bg-[#70FF00] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Cards (Direct Print)</span>
          </button>
          <button
            onClick={onClose}
            className="sm:w-32 py-3 rounded-xl bg-[#151A17] hover:bg-[#1E2521] text-neutral-300 font-bold text-xs border border-[#303630]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

