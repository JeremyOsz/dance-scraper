import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Scraper London",
  description: "Calendar of dance and movement classes across London venues"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
