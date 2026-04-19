import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteSocialLinks } from "@/components/site-social-links";
import { readScrapeOutput } from "@/lib/data-store";
import { signOutboundRedirectUrl } from "@/lib/outbound-redirect";
import { getStudioProfiles } from "@/lib/studios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function generateMetadata(): Metadata {
  const data = readScrapeOutput();
  const studios = getStudioProfiles(data);
  return {
    title: "Studios",
    description: `Browse ${studios.length} London studios and organisers, with scrape status and quick summaries of listed classes.`,
    alternates: {
      canonical: "/studios"
    },
    openGraph: {
      title: "Studios",
      description: `Browse ${studios.length} London studios and organisers, with scrape status and quick summaries of listed classes.`,
      url: "/studios"
    },
    twitter: {
      title: "Studios",
      description: `Browse ${studios.length} London studios and organisers, with scrape status and quick summaries of listed classes.`
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
            <CardTitle className="text-3xl tracking-tight">Studios</CardTitle>
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
          {studios.map((studio) => {
            const studioLink = `/studios/${studio.slug}`;
            const calendarLink = `/?mode=calendar&venue=${encodeURIComponent(studio.name)}`;
            const sourceHref = signOutboundRedirectUrl(studio.sourceUrl, "venue") ?? studio.sourceUrl;
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
                  <Button variant="outline" size="sm" asChild>
                    <Link href={calendarLink as Route}>View classes</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={sourceHref} target="_blank" rel="noreferrer">
                      Studio site
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
