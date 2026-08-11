import React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DANCE_STYLE_GROUPS } from "@/lib/dance-types";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";
import { getDanceStyleGuides, type DanceStyleGuide, type StyleRating } from "@/lib/style-guides";

const title = buildPageTitle("Dance Style Guide");
const description = buildMetaDescription(
  "Explore the history, technique, intensity, partnering, rhythm and accessibility of dance styles taught across London."
);

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/styles" },
  openGraph: { title, description, url: "/styles" },
  twitter: { title, description }
};

const TRAITS: Array<{ key: keyof DanceStyleGuide["ratings"]; label: string }> = [
  { key: "beginnerFriendliness", label: "Beginner friendly" },
  { key: "rhythmEmphasis", label: "Rhythm" },
  { key: "mobilityAdaptability", label: "Adaptability" },
  { key: "technique", label: "Technique" },
  { key: "partnering", label: "Partnering" },
  { key: "intensity", label: "Intensity" }
];

const RATING_WEIGHT: Record<StyleRating, number> = { high: 3, medium: 2, low: 1 };

function cardHighlights(guide: DanceStyleGuide) {
  return [...TRAITS]
    .sort((a, b) => RATING_WEIGHT[guide.ratings[b.key]] - RATING_WEIGHT[guide.ratings[a.key]])
    .slice(0, 3);
}

export default function StylesPage() {
  const guides = getDanceStyleGuides();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Dance style guide</h1>
            <p className="text-muted-foreground">
              Learn where different dance styles come from, what a class may feel like, and how strongly each one tends
              to emphasise technique, partnering, energy and rhythm.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/">Calendar</Link></Button>
            <Button variant="outline" asChild><Link href="/studios">Studios</Link></Button>
          </div>
        </div>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              Low, Medium and High describe broad tendencies, not entry requirements. A style can change considerably
              with the teacher, level, music and class format.
            </p>
            <p>
              Mobility adaptability means how readily material may be adjusted; it is not a guarantee that a particular
              class will meet your needs. Check access and adaptations with the organiser before booking.
            </p>
          </CardContent>
        </Card>
      </header>

      <div className="space-y-12">
        {DANCE_STYLE_GROUPS.map((group) => {
          const groupGuides = guides.filter((guide) => guide.group === group.label);
          return (
            <section key={group.label} aria-labelledby={`group-${group.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
              <h2
                id={`group-${group.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                className="mb-4 text-2xl font-semibold tracking-tight"
              >
                {group.label}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groupGuides.map((guide) => (
                  <Card key={guide.style} className="flex h-full flex-col">
                    <CardHeader className="space-y-3">
                      <CardTitle className="text-xl">{guide.style}</CardTitle>
                      <p className="text-sm leading-relaxed text-muted-foreground">{guide.overview}</p>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-4">
                      <ul className="flex flex-wrap gap-2" aria-label={`${guide.style} highlights`}>
                        {cardHighlights(guide).map((trait) => (
                          <li key={trait.key}>
                            <Badge variant="secondary">
                              {trait.label}: {guide.ratings[trait.key][0].toUpperCase() + guide.ratings[trait.key].slice(1)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" asChild>
                        <Link href={`/styles/${guide.slug}` as Route}>Learn about {guide.style}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
