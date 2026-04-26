import type { Metadata } from "next";
import { format } from "date-fns";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { readScrapeOutput } from "@/lib/data-store";
import { formatTimeRange } from "@/lib/date";
import { inferDanceTypes } from "@/lib/dance-types";
import { isFeaturedSession } from "@/lib/featured";
import { signOutboundRedirectUrl } from "@/lib/outbound-redirect";
import {
  buildCanonicalRobots,
  buildMetaDescription,
  buildPageTitle,
  getBaseUrl,
  hasSearchParamValues,
  SITE_DESCRIPTION,
  SITE_NAME,
  type SearchParamRecord
} from "@/lib/seo";
import { getUpcomingSessionOccurrences, type UpcomingSessionOccurrence } from "@/lib/upcoming-sessions";
import { VENUES } from "@/lib/venues";
import { sortVenueRecordsForUi } from "@/lib/venue-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const isProductionDeployment = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const SEO_SNAPSHOT_ITEMS = 6;
const SEO_SNAPSHOT_DAYS = 56;

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

function formatSnapshotTitle(title: string) {
  return title.replace(/^\*\*(.*)\*\*$/, "$1");
}

function UpcomingClassesSnapshot({ occurrences, title }: { occurrences: UpcomingSessionOccurrence[]; title: string }) {
  if (occurrences.length === 0) {
    return null;
  }

  return (
    <details className="group mt-4 rounded-lg border border-input bg-card px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <h2 id="upcoming-classes-heading" className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <span className="text-sm text-muted-foreground group-open:hidden">Show</span>
        <span className="hidden text-sm text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <ol className="mt-3 grid gap-2 md:grid-cols-2" aria-labelledby="upcoming-classes-heading">
        {occurrences.map(({ session, dateIso, date }) => {
          const types = inferDanceTypes(session).slice(0, 2);
          return (
            <li key={`${session.id}-${dateIso}`} className="rounded-md border border-input bg-background p-3 text-sm">
              <h3 className="font-medium">{formatSnapshotTitle(session.title)}</h3>
              <p className="text-muted-foreground">
                <time dateTime={dateIso}>{format(date, "EEE d MMM yyyy")}</time>
                {" • "}
                {formatTimeRange(session.startTime, session.endTime)}
              </p>
              <p className="text-muted-foreground">
                {session.venue}
                {types.length > 0 ? ` • ${types.join(", ")}` : ""}
                {session.isWorkshop ? " • Workshop" : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

type HomeMetadataProps = {
  searchParams?: Promise<SearchParamRecord>;
};

export async function generateMetadata({ searchParams }: HomeMetadataProps): Promise<Metadata> {
  const data = readScrapeOutput();
  const venueCount = data.venues.length;
  const classCount = data.sessions.length;
  const venueNames = sortVenuesForSeo([...new Set(data.venues.map((venue) => venue.venue).filter(Boolean))]);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const hasQuery = hasSearchParamValues(resolvedSearchParams);
  const title = buildPageTitle("London Dance Classes & Workshops");
  const description = buildMetaDescription(
    `Browse ${classCount} adult dance and movement classes from ${venueCount} London venues by date, style, level, and venue. Explore ballet, salsa, contemporary, improv, and workshops.`
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
    title: {
      absolute: title
    },
    description,
    keywords,
    alternates: {
      canonical: "/"
    },
    robots: buildCanonicalRobots({ isProduction: isProductionDeployment, hasQuery }),
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
  const venues = sortVenueRecordsForUi(Array.from(venueMap.values())).map((venue) => ({
    ...venue,
    outboundSourceHref: signOutboundRedirectUrl(venue.sourceUrl, "venue") ?? venue.sourceUrl
  }));
  const featuredOccurrences = getUpcomingSessionOccurrences(data.sessions.filter(isFeaturedSession), new Date(), {
    maxDays: SEO_SNAPSHOT_DAYS,
    maxItems: SEO_SNAPSHOT_ITEMS,
    uniqueSessions: true
  });
  const fallbackOccurrences =
    featuredOccurrences.length > 0
      ? []
      : getUpcomingSessionOccurrences(data.sessions, new Date(), {
          maxDays: 14,
          maxItems: SEO_SNAPSHOT_ITEMS
        });
  const snapshotOccurrences = featuredOccurrences.length > 0 ? featuredOccurrences : fallbackOccurrences;
  const snapshotTitle = featuredOccurrences.length > 0 ? "Featured upcoming classes" : "Upcoming classes";

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
      inLanguage: "en-GB",
      dateModified: data.generatedAt,
      creator: {
        "@type": "Organization",
        name: SITE_NAME
      }
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CalendarPage
        venues={venues}
        seoSnapshot={<UpcomingClassesSnapshot occurrences={snapshotOccurrences} title={snapshotTitle} />}
      />
    </>
  );
}
