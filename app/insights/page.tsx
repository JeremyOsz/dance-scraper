import React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Metadata, Route } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { readScrapeOutput } from "@/lib/data-store";
import { StyleHeatmap } from "@/components/insights/style-heatmap";
import { buildInsights } from "@/lib/insights";
import { SiteSocialLinks } from "@/components/site-social-links";
import { buildMetaDescription, buildPageTitle } from "@/lib/seo";

export const dynamic = "error";
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const title = buildPageTitle("London Dance Class Insights");
  const description = buildMetaDescription(
    "Compare average daily classes and dance styles across London Dance Calendar listings over the next 28 days."
  );
  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: "/insights"
    },
    openGraph: {
      title,
      description,
      url: "/insights"
    },
    twitter: {
      title,
      description
    }
  };
}

export default function InsightsPage() {
  const data = readScrapeOutput();
  const insights = buildInsights(data.sessions);
  const maxDay = Math.max(...insights.dayAverages.map(entry => entry.average), 0);
  const minDay = Math.min(...insights.dayAverages.map(entry => entry.average));
  const busiest = insights.dayAverages.filter(entry => entry.average === maxDay);
  const quietest = insights.dayAverages.filter(entry => entry.average === minDay);
  const maxStyle = insights.typeRows[0]?.averagePerDay ?? 0;
  const errors = data.venues.filter(venue => !venue.ok);
  const summary = [
    { label: "Daily average", value: insights.averagePerDay.toFixed(1), detail: "listed classes across all 28 days" },
    { label: "Busiest weekday", value: maxDay > 0 ? busiest.map(entry => entry.day).join(" / ") : "No classes", detail: `${maxDay.toFixed(1)} classes per day` },
    { label: "Quietest weekday", value: maxDay > 0 ? quietest.map(entry => entry.day).join(" / ") : "No classes", detail: `${minDay.toFixed(1)} classes per day` }
  ];

  return (
    <main className="calendar-next min-h-screen text-[#17384a]">
      <header className="sticky top-0 z-40 border-b border-[#c9c5bd] bg-[#fffefa]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1800px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 md:px-6">
          <Link href="/" className="font-display text-[12px] font-black uppercase leading-[0.88] tracking-[-0.03em] text-[#073d5b]" aria-label="London Dance Calendar">London<br />Dance<br />Calendar</Link>
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] font-medium text-[#4e5456]">
            <Link href="/">Calendar</Link>
            <Link href={"/styles" as Route}>Styles</Link>
            <Link href={"/locations" as Route}>Locations</Link>
            <Link href="/studios">Studios</Link>
            <Link href="/insights" aria-current="page" className="border-b-2 border-[#ee5b28] pb-1 text-[#073d5b]">Insights</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-6">
      <header className="space-y-4">
        <div className="border-b border-[#c9c5bd] pb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#697173]">London Dance Calendar</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#073d5b]">Class insights</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">Compare listed class availability, rather than attendance or popularity. Averages cover the next 28 days, including days with no classes.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <p>{format(parseISO(insights.windowStart), "d MMM yyyy")} to {format(parseISO(insights.windowEnd), "d MMM yyyy")}</p>
          <p>Data refreshed {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(data.generatedAt))} London time</p>
        </div>
        {errors.length > 0 && <details className="border border-[#c9c5bd] bg-[#fffefa] p-3 text-sm text-[#4e5456]">
          <summary className="cursor-pointer font-medium text-[#073d5b]">Error scraping {errors.length} {errors.length === 1 ? "source" : "sources"}. Some listings may be older.</summary>
          <p className="mt-2">{errors.map(venue => venue.venue).join(", ")}. The refresh date does not confirm that every source is current.</p>
          <Link href="/studios" className="mt-2 inline-block underline underline-offset-4">View source status</Link>
        </details>}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {summary.map(item => <Card key={item.label} className="border-[#c9c5bd] bg-[#fffefa] shadow-none"><CardContent className="space-y-1.5 p-4">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-[#073d5b] tabular-nums">{item.value}</p>
          <p className="text-sm text-muted-foreground">{item.detail}</p>
        </CardContent></Card>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#c9c5bd] bg-[#fffefa] shadow-none">
          <CardHeader className="space-y-2 p-4 pb-3">
            <h2 className="font-display text-lg font-semibold text-[#073d5b]">When are most classes listed?</h2>
            <p className="text-sm text-muted-foreground">Each weekday averages four dates. The dashed line marks the overall average of {insights.averagePerDay.toFixed(1)}.</p>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {insights.dayAverages.map(entry => <div key={entry.day} className="space-y-1.5">
              <div className="flex justify-between gap-2 text-sm"><span className={entry.average === maxDay && maxDay > 0 ? "font-semibold" : "font-medium"}>{entry.day}{entry.average === maxDay && maxDay > 0 ? " · busiest" : ""}</span><span className="tabular-nums">{entry.average.toFixed(1)}</span></div>
              <div className="relative h-2 bg-[#e6e2da]" aria-hidden="true">
                <div className={`h-full ${entry.average === maxDay ? "bg-primary" : "bg-primary/55"}`} style={{ width: `${maxDay > 0 ? entry.average / maxDay * 100 : 0}%` }} />
                {maxDay > 0 && <span className="absolute -top-1 h-5 border-l-2 border-dashed border-[#697173]" style={{ left: `${insights.averagePerDay / maxDay * 100}%` }} />}
              </div>
            </div>)}
            <p className="text-xs text-muted-foreground">Average listed classes per day</p>
          </CardContent>
        </Card>
        <Card className="border-[#c9c5bd] bg-[#fffefa] shadow-none">
          <CardHeader className="space-y-2 p-4 pb-3">
            <h2 className="font-display text-lg font-semibold text-[#073d5b]">Most listed styles</h2>
            <p className="text-sm text-muted-foreground">Daily averages across the full 28-day window. A class can appear under more than one style, so these values do not add up to the overall average.</p>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {insights.typeRows.length === 0 && <p className="text-sm text-muted-foreground">No scheduled classes in this date range.</p>}
            {insights.typeRows.slice(0, 7).map(row => <div key={row.type} className="space-y-1.5">
              <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{row.type}</span><span className="tabular-nums">{row.averagePerDay.toFixed(1)}</span></div>
              <div className="h-2 bg-[#e6e2da]" aria-hidden="true"><div className="h-full bg-primary/70" style={{ width: `${maxStyle > 0 ? row.averagePerDay / maxStyle * 100 : 0}%` }} /></div>
            </div>)}
            <p className="text-xs text-muted-foreground">Top seven styles. Explore every style in the heatmap below.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-[#c9c5bd] bg-[#fffefa] shadow-none">
        <CardHeader className="space-y-2 p-4 pb-3"><h2 className="font-display text-lg font-semibold text-[#073d5b]">Find the best day for your style</h2><p className="text-sm text-muted-foreground">Compare availability or reveal each style’s weekday pattern.</p></CardHeader>
        <CardContent className="px-4 pb-4"><StyleHeatmap rows={insights.typeRows} /></CardContent>
      </Card>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#c9c5bd] py-4 text-sm text-[#4e5456]">
        <SiteSocialLinks />
        <Link href="/contact" className="underline underline-offset-4">Contact / feedback</Link>
      </footer>
      </div>
    </main>
  );
}
