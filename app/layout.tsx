import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Scraper London",
  description: "Calendar of dance and movement classes across London venues",
  icons: {
    icon: "/icons/dance-scraper-icon.svg",
    shortcut: "/icons/dance-scraper-icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
