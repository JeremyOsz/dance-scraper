import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, Route } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buildMetaDescription, buildPageTitle, getBaseUrl, SITE_NAME } from "@/lib/seo";
import {
  getDanceStyleGuideBySlug,
  getDanceStyleGuides,
  getStyleCalendarHref,
  type DanceStyleGuide,
  type StyleRating
} from "@/lib/style-guides";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

const TRAITS: Array<{ key: keyof DanceStyleGuide["ratings"]; label: string; description: string }> = [
  { key: "technique", label: "Technique", description: "Emphasis on a defined movement vocabulary and precise physical skills" },
  { key: "partnering", label: "Partnering", description: "How central partner connection or shared movement tends to be" },
  { key: "intensity", label: "Intensity", description: "Typical cardiovascular effort, impact and physical demand" },
  { key: "beginnerFriendliness", label: "Beginner friendliness", description: "How readily a newcomer can join an appropriately labelled class" },
  { key: "mobilityAdaptability", label: "Mobility adaptability", description: "How readily movement may be scaled, supported or performed seated" },
  { key: "rhythmEmphasis", label: "Rhythm emphasis", description: "How strongly the practice develops or depends on musical timing" }
];

const RATING_LABEL: Record<StyleRating, string> = { low: "Low", medium: "Medium", high: "High" };

export function generateStaticParams() {
  return getDanceStyleGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = getDanceStyleGuideBySlug((await params).slug);
  if (!guide) return { title: { absolute: buildPageTitle("Dance Style Not Found") } };

  const pageTitle = buildPageTitle(`${guide.style} Dance Guide`);
  const description = buildMetaDescription(guide.overview);
  const url = `/styles/${guide.slug}`;
  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical: url },
    openGraph: { title: pageTitle, description, url, type: "article" },
    twitter: { title: pageTitle, description }
  };
}

export default async function StyleDetailPage({ params }: PageProps) {
  const guide = getDanceStyleGuideBySlug((await params).slug);
  if (!guide) notFound();

  const baseUrl = getBaseUrl();
  const pageUrl = `${baseUrl}/styles/${guide.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${guide.style} dance guide`,
      description: guide.overview,
      url: pageUrl,
      inLanguage: "en-GB",
      author: { "@type": "Organization", name: SITE_NAME }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Calendar", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "Dance styles", item: `${baseUrl}/styles` },
        { "@type": "ListItem", position: 3, name: guide.style, item: pageUrl }
      ]
    }
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/styles" className="underline underline-offset-4">Dance styles</Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{guide.style}</span>
      </nav>

      <header className="mb-8 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <Badge variant="secondary">{guide.group}</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{guide.style}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{guide.overview}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/styles">All styles</Link></Button>
            <Button variant="outline" asChild><Link href="/">Calendar</Link></Button>
          </div>
        </div>
      </header>

      <section aria-labelledby="traits-heading" className="mb-8">
        <h2 id="traits-heading" className="mb-4 text-2xl font-semibold tracking-tight">At a glance</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRAITS.map((trait) => (
            <li key={trait.key} className="rounded-lg border border-input bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold">{trait.label}</span>
                <Badge variant="secondary">{RATING_LABEL[guide.ratings[trait.key]]}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{trait.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          These ratings describe broad tendencies, not requirements or guarantees. Teaching style, pace and access vary
          by teacher, level and class format.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-xl font-semibold leading-none tracking-normal">History</h2></CardHeader>
          <CardContent><p className="leading-relaxed text-muted-foreground">{guide.history}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-xl font-semibold leading-none tracking-normal">What to expect</h2></CardHeader>
          <CardContent><p className="leading-relaxed text-muted-foreground">{guide.whatToExpect}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-xl font-semibold leading-none tracking-normal">Access and difficulty</h2></CardHeader>
          <CardContent className="space-y-3">
            <p className="leading-relaxed text-muted-foreground">{guide.accessGuidance}</p>
            <p className="text-sm text-muted-foreground">
              Check access, pace and available adaptations with the organiser before booking, especially if you have
              limited mobility, an injury or specific support needs.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-xl font-semibold leading-none tracking-normal">Further reading</h2></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Try {guide.style} in London</h2>
            <p className="mt-1 text-sm text-muted-foreground">See current classes and workshops in the calendar.</p>
          </div>
          <Button asChild>
            <Link href={getStyleCalendarHref(guide.style) as Route}>Find {guide.style} classes</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
