import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readScrapeOutput } from "@/lib/data-store";
import { ORDERED_DAYS } from "@/lib/date";
import { buildInsights } from "@/lib/insights";
import { SiteSocialLinks } from "@/components/site-social-links";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  return {
    title: "Class Insights",
    description: "See which days are busiest and which dance styles are most popular across the week.",
    alternates: {
      canonical: "/insights"
    },
    openGraph: {
      title: "Class Insights",
      description: "See which days are busiest and which dance styles are most popular across the week.",
      url: "/insights"
    },
    twitter: {
      title: "Class Insights",
      description: "See which days are busiest and which dance styles are most popular across the week."
    }
  };
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function heatOpacity(value: number, max: number) {
  if (max === 0 || value === 0) return 0;
  return Number((value / max).toFixed(2));
}

export default function InsightsPage() {
  const data = readScrapeOutput();
  const insights = buildInsights(data.sessions);
  const maxDayCount = Math.max(...insights.dayTotals.map((entry) => entry.count), 1);
  const maxCellCount = Math.max(...insights.typeRows.flatMap((row) => ORDERED_DAYS.map((day) => row.byDay[day])), 1);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-3xl tracking-tight">Class Insights</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/">Calendar</Link>
              </Button>
              <Button asChild>
                <Link href="/insights">Insights</Link>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Trends from the latest scrape: compare day popularity, then see which class types lead on each day.
          </p>
          <SiteSocialLinks className="mt-1" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Total classes: {insights.totalSessions}</Badge>
            <Badge variant="secondary">With known day: {insights.sessionsWithKnownDay}</Badge>
            <Badge variant="secondary">Day unknown: {insights.sessionsWithoutKnownDay}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Most Popular Days Overall</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.dayTotals.map((entry) => (
                <div key={entry.day} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{entry.day}</span>
                    <span className="text-muted-foreground">
                      {entry.count} classes ({toPercent(entry.share)})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((entry.count / maxDayCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Class Types By Day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.topTypesByDay.map((entry) => (
                <div key={entry.day} className="rounded-md border border-input p-3">
                  <p className="text-sm font-medium">{entry.day}</p>
                  {entry.topTypes.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No scheduled classes.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.topTypes.slice(0, 3).map((typeEntry) => (
                        <Badge key={`${entry.day}-${typeEntry.type}`} variant="secondary">
                          {typeEntry.type}: {typeEntry.count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Type vs Day Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left font-medium">Type</th>
                    {ORDERED_DAYS.map((day) => (
                      <th key={day} className="px-2 py-2 text-center font-medium">
                        {day.slice(0, 3)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right font-medium">Peak day</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.typeRows.map((row) => (
                    <tr key={row.type} className="border-b last:border-0">
                      <td className="px-2 py-2 font-medium">{row.type}</td>
                      {ORDERED_DAYS.map((day) => {
                        const value = row.byDay[day];
                        const opacity = heatOpacity(value, maxCellCount);
                        return (
                          <td key={`${row.type}-${day}`} className="px-2 py-2 text-center">
                            <span
                              className="inline-flex min-w-9 items-center justify-center rounded px-2 py-1"
                              style={{
                                backgroundColor: `hsl(var(--primary) / ${opacity})`,
                                color: opacity > 0.45 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"
                              }}
                            >
                              {value}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {row.peakDay ? `${row.peakDay} (${row.peakCount})` : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </main>
  );
}
