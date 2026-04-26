import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getBaseUrl, isIndexableDeployment, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/react";

const baseUrl = getBaseUrl();
const isProductionDeployment = isIndexableDeployment(baseUrl);

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
  robots: {
    index: isProductionDeployment,
    follow: isProductionDeployment,
    googleBot: {
      index: isProductionDeployment,
      follow: isProductionDeployment,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
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
  return (
    <html lang="en-GB">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
