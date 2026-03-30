import type { Metadata } from "next";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { readScrapeOutput } from "@/lib/data-store";
import { getBaseUrl } from "@/lib/seo";
import { VENUES } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildVenueSummary(venueNames: string[], maxVisible = 8) {
  if (venueNames.length === 0) {
    return "London dance venues";
  }

  const visible = venueNames.slice(0, maxVisible);
  const remaining = venueNames.length - visible.length;
  const suffix = remaining > 0 ? `, and ${remaining} more` : "";
  return `${visible.join(", ")}${suffix}`;
}

/** Order = biggest typical search/brand impact first (metadata snippet + keywords). */
const PRIORITY_VENUES = [
  "The Place",
  "Rambert",
  "Danceworks",
  "Pineapple Dance Studios",
  "City Academy",
  "Siobhan Davies Studios",
  "TripSpace",
  "BASE Dance Studios",
  "East London Dance",
  "Chisenhale Dance Space",
] as const;

function sortVenuesForSeo(venueNames: string[]) {
  const priorityOrder = new Map(PRIORITY_VENUES.map((name, index) => [name.toLowerCase(), index]));
  return [...venueNames].sort((a, b) => {
    const aPriority = priorityOrder.get(a.toLowerCase());
    const bPriority = priorityOrder.get(b.toLowerCase());

    if (aPriority !== undefined && bPriority !== undefined) {
      return aPriority - bPriority;
    }
    if (aPriority !== undefined) {
      return -1;
    }
    if (bPriority !== undefined) {
      return 1;
    }

    return a.localeCompare(b);
  });
}

export function generateMetadata(): Metadata {
  const data = readScrapeOutput();
  const venueCount = data.venues.length;
  const classCount = data.sessions.length;
  const venueNames = sortVenuesForSeo([...new Set(data.venues.map((venue) => venue.venue).filter(Boolean))]);
  const venueSummary = buildVenueSummary(venueNames);
  const title = "London Dance Calendar";
  const description = `Browse ${classCount} dance and movement classes from ${venueCount} London venues, including ${venueSummary}. Explore ballet, salsa, contemporary, contact improvisation, and more in a searchable weekly and monthly calendar.`;
  const keywords = [
    "London dance classes",
    "London dance calendar",
    "adult dance classes London",
    "open dance classes London",
    "dance workshops London",
    "ballet classes London",
    "salsa classes London",
    "contemporary dance classes London",
    "contact improvisation London",
    ...venueNames.map((name) => `${name} classes`)
  ];

  return {
    title,
    description,
    keywords,
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
