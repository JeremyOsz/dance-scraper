import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarVenueFilterButton } from "@/components/calendar-venue-filter-button";
import { SiteSocialLinks } from "@/components/site-social-links";
import { readScrapeOutput } from "@/lib/data-store";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";
import { getStudioProfiles } from "@/lib/studios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function generateMetadata(): Metadata {
  const data = readScrapeOutput();
  const studios = getStudioProfiles(data);
  const title = buildPageTitle("London Dance Studios");
  const description = buildMetaDescription(
    `Browse ${studios.length} London dance studios and organisers with current class counts, styles, scrape status, and links to filtered listings.`
  );
  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: "/studios"
    },
    openGraph: {
      title,
      description,
      url: "/studios"
    },
    twitter: {
      title,
      description
    }
  };
}

export default function StudiosPage() {
  const data = readScrapeOutput();
  const studios = getStudioProfiles(data);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">London Dance Studios</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/">Calendar</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/insights">Insights</Link>
              </Button>
              <Button asChild>
                <Link href="/studios">Studios</Link>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Content-first profiles for each studio and organiser in London Dance Calendar. Use these pages to compare
            class mix, browse example sessions, and jump to filtered results.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Studios: {studios.length}</Badge>
            <Badge variant="secondary">Total listed classes: {data.sessions.length}</Badge>
          </div>
          <SiteSocialLinks className="mt-1" />
        </CardHeader>
        <CardContent className="grid gap-3 px-0 md:grid-cols-2">
          <h2 className="sr-only">Studio profiles</h2>
          {studios.map((studio) => {
            const studioLink = `/studios/${studio.slug}`;
            return (
              <Card key={studio.slug}>
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{studio.name}</CardTitle>
                    <Badge variant={studio.ok ? "secondary" : "outline"}>
                      {studio.ok ? "OK" : "Error scraping"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pluralize(studio.classCount, "class")} on page • {pluralize(studio.workshopCount, "workshop")} •{" "}
                    source listed {pluralize(studio.listedCount, "session")}
                  </p>
                  {studio.summary ? <p className="text-sm text-muted-foreground">{studio.summary}</p> : null}
                  {studio.topTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {studio.topTypes.map((type) => (
                        <Badge key={`${studio.slug}-${type}`} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={studioLink as Route}>Open studio page</Link>
                  </Button>
                  <CalendarVenueFilterButton venue={studio.name} variant="outline" size="sm">
                    View classes
                  </CalendarVenueFilterButton>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
