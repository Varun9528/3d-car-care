import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Car Care Indore | Share Your Experience",
  description:
    "Official customer review and feedback system for 3D Car Care Indore. Premium Paint Protection Film (PPF), Ceramic Coating, Detailing & Car Care.",
  applicationName: "3D Car Care Review Hub",
  keywords: [
    "3D Car Care",
    "Indore",
    "Car Detailing Indore",
    "PPF Indore",
    "Ceramic Coating Indore",
    "3D Car Care Google Review",
  ],
  authors: [{ name: "3D Car Care Indore" }],
  icons: {
    icon: "/3d_care_logo.png",
  },
  openGraph: {
    title: "3D Car Care Indore - Customer Review & Experience",
    description: "Tell us about your detailing experience and share your review on Google.",
    siteName: "3D Car Care Indore",
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#080B09",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-carbon-mesh flex flex-col antialiased selection:bg-[#65F000] selection:text-black text-white">
        {children}
      </body>
    </html>
  );
}
