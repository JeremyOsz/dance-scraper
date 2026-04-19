import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteSocialLinks } from "@/components/site-social-links";
import { readScrapeOutput } from "@/lib/data-store";
import { signOutboundRedirectUrl } from "@/lib/outbound-redirect";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = readScrapeOutput();
  const studio = getStudioBySlug(data, slug);

  if (!studio) {
    return {
      title: "Studio Not Found"
    };
  }

  const title = `${studio.name} Studio Profile`;
  const description = buildDescription(studio.name, studio.classCount, studio.topTypes);
  const url = `/studios/${studio.slug}`;

  return {
    title,
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
  const calendarHref = `/?mode=calendar&venue=${encodeURIComponent(studio.name)}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.mapQuery)}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-3xl tracking-tight">{studio.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={studio.ok ? "secondary" : "outline"}>
                {studio.ok ? "OK" : "Error scraping"}
              </Badge>
              <Badge variant="secondary">{studio.classCount} classes</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{buildDescription(studio.name, studio.classCount, studio.topTypes)}</p>
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
            <Button asChild>
              <Link href={calendarHref as Route}>View studio classes</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
              <CardTitle className="text-lg">Class Mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
              <CardTitle className="text-lg">Example Classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
              <CardTitle className="text-lg">Links</CardTitle>
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
              <Button asChild>
                <Link href={calendarHref as Route}>Filter calendar by this studio</Link>
              </Button>
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
