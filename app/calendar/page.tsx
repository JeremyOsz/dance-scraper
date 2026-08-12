import type { Metadata } from "next";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";
import Home from "@/app/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  const title = buildPageTitle("Calendar Preview");
  const description = buildMetaDescription("Explore London dance classes by date, organiser, location, style, and level.");
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: "/calendar" },
    twitter: { title, description }
  };
}

export default function CalendarRoute() {
  return <Home />;
}
