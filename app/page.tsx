import type { Metadata } from "next";
import { format, isValid, parseISO } from "date-fns";
import { CalendarNextPage } from "@/components/calendar-next/calendar-next-page";
import { readScrapeOutput } from "@/lib/data-store";
import { getLocationProfiles } from "@/lib/locations";
import { signOutboundRedirectUrl } from "@/lib/outbound-redirect";
import {
  buildCanonicalRobots,
  buildMetaDescription,
  buildPageTitle,
  DATASET_LICENSE_URL,
  getBaseUrl,
  isIndexableDeployment,
  SITE_DESCRIPTION,
  SITE_NAME
} from "@/lib/seo";
import { sortVenueNamesForUi } from "@/lib/venue-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  "Chisenhale Dance Space"
] as const;

function sortVenuesForSeo(venueNames: string[]) {
  const priorityOrder = new Map(PRIORITY_VENUES.map((name, index) => [name.toLowerCase(), index]));
  return [...venueNames].sort((a, b) => {
    const aPriority = priorityOrder.get(a.toLowerCase());
    const bPriority = priorityOrder.get(b.toLowerCase());
    if (aPriority !== undefined && bPriority !== undefined) return aPriority - bPriority;
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;
    return a.localeCompare(b);
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const data = readScrapeOutput();
  const baseUrl = getBaseUrl();
  const venueNames = sortVenuesForSeo([...new Set(data.venues.map((venue) => venue.venue).filter(Boolean))]);
  const title = buildPageTitle("London Dance Classes & Workshops");
  const description = buildMetaDescription(
    `Find Dance Classes in London. Browse ${data.sessions.length} adult classes from ${data.venues.length} venues — filter by style, level, date, and location. Ballet, salsa, contemporary, improv, and more.`
  );
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
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: "/" },
    robots: buildCanonicalRobots({ isProduction: isIndexableDeployment(baseUrl), hasQuery: false }),
    openGraph: { title, description, url: "/" },
    twitter: { title, description }
  };
}

export default function Home() {
  const data = readScrapeOutput();
  const baseUrl = getBaseUrl();
  const sessions = data.sessions.map((session) => ({
    ...session,
    outboundBookingHref: signOutboundRedirectUrl(session.bookingUrl, "booking") ?? session.bookingUrl,
    outboundSourceHref: signOutboundRedirectUrl(session.sourceUrl, "source") ?? session.sourceUrl
  }));
  const venueNames = sortVenueNamesForUi([
    ...new Set([
      ...data.venues.map((venue) => venue.venue),
      ...data.sessions.map((session) => session.organizer?.trim() || session.venue)
    ].filter(Boolean))
  ]);
  const locationNames = getLocationProfiles(data).map((location) => location.name);
  const generated = parseISO(data.generatedAt);
  const listingsUpdatedText = isValid(generated) ? `Updated ${format(generated, "d MMM yyyy")}` : undefined;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: baseUrl,
      description: SITE_DESCRIPTION,
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
      license: DATASET_LICENSE_URL,
      inLanguage: "en-GB",
      dateModified: data.generatedAt,
      creator: { "@type": "Organization", name: SITE_NAME }
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CalendarNextPage
        classCount={sessions.length}
        venueNames={venueNames}
        locationNames={locationNames}
        initialSessions={sessions}
        listingsUpdatedText={listingsUpdatedText}
      />
    </>
  );
}
