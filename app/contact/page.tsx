import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";
import { SiteSocialLinks } from "@/components/site-social-links";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send feedback about incorrect or missing dance classes.",
  alternates: {
    canonical: "/contact"
  },
  openGraph: {
    title: "Contact",
    description: "Send feedback about incorrect or missing dance classes.",
    url: "/contact"
  },
  twitter: {
    title: "Contact",
    description: "Send feedback about incorrect or missing dance classes."
  }
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contact</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to calendar</Link>
        </Button>
      </div>
      <ContactForm />
      <SiteSocialLinks className="mt-10 border-t border-border pt-6" />
    </main>
  );
}
