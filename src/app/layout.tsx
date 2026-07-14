import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

/** Match rkeaz-group: Cairo for Arabic UI */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

/** Numerics / Latin companion like rkeaz Outfit */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valentino — نظام إدارة الشوكولاتة",
  description: "نظام ERP ونقطة بيع لمتجر Valentino للشوكولاتة الفاخرة",
  manifest: "/manifest.json",
  applicationName: "Valentino",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Valentino",
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#3D2B1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${cairo.variable} ${outfit.variable}`}
    >
      <body
        className="min-h-svh font-sans antialiased"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
