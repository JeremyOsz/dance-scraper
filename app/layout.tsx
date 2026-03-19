import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getBaseUrl } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/react";

const baseUrl = getBaseUrl();
const siteName = "London Dance Calendar";
const siteDescription =
  "Find adult and open dance and movement classes across London with a searchable calendar, venue index, and map.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
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
    siteName,
    title: siteName,
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  category: "events",
  icons: {
    icon: "/icons/dance-scraper-icon.svg",
    shortcut: "/icons/dance-scraper-icon.svg",
    apple: "/icons/dance-scraper-icon.svg"
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
  return (
    <html lang="en-GB">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
