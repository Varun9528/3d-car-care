import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Car Care Indore | Share Your Experience",
  description:
    "Official customer feedback and Google review generator for 3D Car Care Indore. Premium Paint Protection Film (PPF), Ceramic Coating, Detailing & Car Care.",
  applicationName: "3D Car Care Review Hub",
  keywords: [
    "3D Car Care",
    "Indore",
    "Car Detailing Indore",
    "PPF Indore",
    "Ceramic Coating Indore",
    "Car Wash Sheetal Nagar",
    "3D Car Care Google Review",
  ],
  authors: [{ name: "3D Car Care Indore" }],
  icons: {
    icon: "/favicon.ico",
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
  themeColor: "#08090C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-carbon-pattern flex flex-col antialiased selection:bg-amber-400 selection:text-black">
        {children}
      </body>
    </html>
  );
}
