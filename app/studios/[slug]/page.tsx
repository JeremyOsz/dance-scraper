import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarVenueFilterButton } from "@/components/calendar-venue-filter-button";
import { SiteSocialLinks } from "@/components/site-social-links";
import { readScrapeOutput } from "@/lib/data-store";
import { signOutboundRedirectUrl } from "@/lib/outbound-redirect";
import { buildPageTitle, buildStudioSeoText } from "@/lib/seo";
import { getStudioBySlug } from "@/lib/studios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function buildDescription(studioName: string, classCount: number, topTypes: string[]) {
  const typeSummary = topTypes.length > 0 ? topTypes.join(", ") : "multiple dance styles";
  return `${studioName} on London Dance Calendar: ${classCount} listed classes with current focus on ${typeSummary}.`;
}

function sentenceList(items: string[], fallback: string) {
  if (items.length === 0) {
    return fallback;
  }
  if (items.length === 1) {
    return items[0];
  }
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = readScrapeOutput();
  const studio = getStudioBySlug(data, slug);

  if (!studio) {
    return {
      title: {
        absolute: buildPageTitle("Studio Not Found")
      }
    };
  }

  const { title, description } = buildStudioSeoText({
    name: studio.name,
    classCount: studio.classCount,
    topTypes: studio.topTypes,
    activeDays: studio.activeDays,
    ok: studio.ok
  });
  const url = `/studios/${studio.slug}`;

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url
    },
    twitter: {
      title,
      description
    }
  };
}

export default async function StudioPage({ params }: PageProps) {
  const { slug } = await params;
  const data = readScrapeOutput();
  const studio = getStudioBySlug(data, slug);

  if (!studio) {
    notFound();
  }

  const sourceHref = signOutboundRedirectUrl(studio.sourceUrl, "venue") ?? studio.sourceUrl;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.mapQuery)}`;
  const styleSummary = sentenceList(studio.topTypes, "a mix of dance and movement styles");
  const daySummary = sentenceList(studio.activeDays, "days that vary by current listing availability");
  const sampleSummary = sentenceList(studio.sampleTitles, "sample classes from the current feed");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{studio.name} dance classes</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={studio.ok ? "secondary" : "outline"}>
                {studio.ok ? "OK" : "Error scraping"}
              </Badge>
              <Badge variant="secondary">{studio.classCount} classes</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {buildDescription(studio.name, studio.classCount, studio.topTypes)}
          </p>
          <p className="text-sm text-muted-foreground">
            {studio.name} currently contributes {studio.classCount} listed classes to London Dance Calendar
            {studio.topTypes.length > 0 ? `, with common styles including ${studio.topTypes.join(", ")}` : ""}
            {studio.activeDays.length > 0 ? ` and activity on ${studio.activeDays.join(", ")}` : ""}.
          </p>
          <p className="text-sm text-muted-foreground">
            This profile summarises the current feed for {studio.name}, including class volume, workshop count,
            common styles, active days, example titles, source status, and quick links. Use it to decide whether the
            studio is worth filtering in the calendar before opening the full list of dated sessions.
          </p>
          {studio.summary ? (
            <p className="rounded-md border border-input bg-card p-3 text-sm text-muted-foreground">{studio.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Calendar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/studios">All studios</Link>
            </Button>
            <CalendarVenueFilterButton venue={studio.name}>View studio classes</CalendarVenueFilterButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">{studio.name} Quick Facts</h2>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                The figures below come from the latest normalised calendar data. They show how much current inventory
                {studio.name} contributes and whether the source is scraping cleanly.
              </p>
              <p>
                Listed classes in feed: <strong>{studio.classCount}</strong>
              </p>
              <p>
                Workshops in feed: <strong>{studio.workshopCount}</strong>
              </p>
              <p>
                Scrape source sessions: <strong>{studio.listedCount}</strong>
              </p>
              <p>
                Active days: <strong>{studio.activeDays.length > 0 ? studio.activeDays.join(", ") : "Not specified"}</strong>
              </p>
              <p>
                Last seen in feed: <strong>{studio.latestSeenAt ? new Date(studio.latestSeenAt).toLocaleString("en-GB") : "Unknown"}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">{studio.name} Class Mix</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current {studio.name} listings lean toward {styleSummary}. Active days currently include {daySummary}.
              </p>
              {studio.topTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No class types detected from current listings.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {studio.topTypes.map((type) => (
                    <Badge key={`${studio.slug}-${type}`} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">Example {studio.name} Classes</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Example titles help identify what is currently represented in the feed. Recent examples include{" "}
                {sampleSummary}.
              </p>
              {studio.sampleTitles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No example titles available for this studio yet.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {studio.sampleTitles.map((title) => (
                    <li key={`${studio.slug}-${title}`}>{title}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">{studio.name} Links</h2>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href={sourceHref} target="_blank" rel="noreferrer">
                  Studio website
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  Open map
                </a>
              </Button>
              <CalendarVenueFilterButton venue={studio.name}>Filter calendar by this studio</CalendarVenueFilterButton>
              <Button variant="outline" asChild>
                <Link href="/contact">Report incorrect info</Link>
              </Button>
            </CardContent>
          </Card>

          <SiteSocialLinks className="mt-2 border-t border-border pt-4" />
        </CardContent>
      </Card>
    </main>
  );
}
