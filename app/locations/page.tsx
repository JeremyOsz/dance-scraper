import Link from "next/link";
import type { Metadata, Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readScrapeOutput } from "@/lib/data-store";
import { getLocationProfiles } from "@/lib/locations";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  const title = buildPageTitle("London Dance Locations");
  const description = buildMetaDescription(
    "Browse physical London locations hosting adult dance, movement and embodied-performance classes."
  );
  return { title: { absolute: title }, description, alternates: { canonical: "/locations" } };
}

export default function LocationsPage() {
  const locations = getLocationProfiles(readScrapeOutput());
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">London Dance Locations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Physical places are listed separately from the organisers that run classes in them. Unknown venues remain
            “Location TBC” in listings and do not appear here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/">Calendar</Link></Button>
          <Button variant="outline" asChild><Link href="/studios">Organisers</Link></Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((location) => (
          <Card key={location.slug}>
            <CardHeader className="space-y-2">
              <CardTitle>{location.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {[location.address, location.borough, location.postcode].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{location.classCount} classes</Badge>
                <Badge variant="secondary">{location.organizers.length} organisers</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button size="sm" asChild>
                <Link href={`/locations/${location.slug}` as Route}>Open location</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
