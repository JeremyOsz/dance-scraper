import type { Metadata } from "next";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { readScrapeOutput } from "@/lib/data-store";
import { getBaseUrl } from "@/lib/seo";
import { VENUES } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  const data = readScrapeOutput();
  const venueCount = data.venues.length;
  const classCount = data.sessions.length;
  const title = "London Dance Class Calendar";
  const description = `Browse ${classCount} dance and movement classes from ${venueCount} London venues in a searchable weekly and monthly calendar.`;

  return {
    title,
    description,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title,
      description,
      url: "/"
    },
    twitter: {
      title,
      description
    }
  };
}

export default function Home() {
  const data = readScrapeOutput();
  const baseUrl = getBaseUrl();
  const venueMap = new Map(
    data.venues.map((venue) => [
      venue.venue,
      {
        name: venue.venue,
        sourceUrl: venue.sourceUrl,
        mapQuery: VENUES[venue.key]?.mapQuery,
        count: venue.count,
        ok: venue.ok,
        lastSuccessAt: venue.lastSuccessAt,
        lastError: venue.lastError
      }
    ])
  );
  const venues = Array.from(venueMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "London Dance Calendar",
      url: baseUrl,
      description:
        "Find adult and open dance and movement classes across London with a searchable calendar, venue index, and map.",
      inLanguage: "en-GB",
      potentialAction: {
        "@type": "SearchAction",
        target: `${baseUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "London Dance Classes Calendar",
      description: "Aggregated schedule of dance and movement classes across London venues.",
      url: baseUrl,
      inLanguage: "en-GB",
      dateModified: data.generatedAt,
      creator: {
        "@type": "Organization",
        name: "London Dance Calendar"
      }
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CalendarPage initialSessions={data.sessions} venues={venues} />
    </>
  );
}
