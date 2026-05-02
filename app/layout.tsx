import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Inter, Sora, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getBaseUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/react";

const baseUrl = getBaseUrl();
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap"
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap"
});
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap"
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap"
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "London dance classes",
    "dance classes London",
    "movement classes London",
    "dance workshops London",
    "adult dance London"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  category: "events",
  icons: {
    icon: [{ url: "/icons/favicon.png", type: "image/png" }],
    shortcut: "/icons/favicon.png",
    apple: "/icons/favicon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
  interactiveWidget: "resizes-content"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontLayers = `${inter.variable} ${spaceGrotesk.variable} ${sora.variable} ${archivo.variable} ${ibmPlexMono.variable}`;

  return (
    <html lang="en-GB" className={fontLayers}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
