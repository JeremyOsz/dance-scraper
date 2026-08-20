import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readScrapeOutput } from "@/lib/data-store";
import { inferDanceStyles } from "@/lib/dance-types";
import { getLocationBySlug, getLocationProfiles } from "@/lib/locations";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";

export const dynamic = "error";
export const dynamicParams = false;
type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getLocationProfiles(readScrapeOutput()).map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const location = getLocationBySlug(readScrapeOutput(), (await params).slug);
  if (!location) return { title: { absolute: buildPageTitle("Location Not Found") } };
  const title = buildPageTitle(`${location.name} Dance Classes`);
  const description = buildMetaDescription(
    `${location.classCount} current dance and movement listings at ${location.name}, used by ${location.organizers.join(", ")}.`
  );
  return { title: { absolute: title }, description, alternates: { canonical: `/locations/${location.slug}` } };
}

export default async function LocationPage({ params }: PageProps) {
  const location = getLocationBySlug(readScrapeOutput(), (await params).slug);
  if (!location) notFound();
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapQuery)}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{location.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[location.address, location.borough, location.postcode].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href={"/locations" as Route}>All locations</Link></Button>
            <Button variant="outline" asChild><a href={mapsHref} target="_blank" rel="noreferrer">Open map</a></Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{location.classCount} upcoming listings</Badge>
          {location.organizers.map((organizer) => <Badge key={organizer} variant="outline">{organizer}</Badge>)}
        </div>
      </div>
      <section className="grid gap-3 md:grid-cols-2" aria-label="Upcoming sessions">
        {location.sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">{session.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {session.organizer ?? session.venue} · {session.dayOfWeek ?? session.startDate ?? "Date TBC"} · {session.startTime ?? "Time TBC"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {inferDanceStyles(session).map((style) => <Badge key={style} variant="secondary">{style}</Badge>)}
              </div>
              <Button size="sm" asChild><a href={session.bookingUrl} target="_blank" rel="noreferrer">Booking</a></Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
