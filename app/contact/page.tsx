import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";
import { SiteSocialLinks } from "@/components/site-social-links";
import { Button } from "@/components/ui/button";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";

const title = buildPageTitle("Contact London Dance Calendar");
const description = buildMetaDescription("Send feedback about incorrect, missing, or outdated London dance class listings.");

export const metadata: Metadata = {
  title: {
    absolute: title
  },
  description,
  alternates: {
    canonical: "/contact"
  },
  openGraph: {
    title,
    description,
    url: "/contact"
  },
  twitter: {
    title,
    description
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
      <h2 className="sr-only">Send feedback</h2>
      <ContactForm />
      <SiteSocialLinks className="mt-10 border-t border-border pt-6" />
    </main>
  );
}
