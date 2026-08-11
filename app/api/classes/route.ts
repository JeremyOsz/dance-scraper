import { NextRequest, NextResponse } from "next/server";
import { readScrapeOutput } from "@/lib/data-store";
import { filterSessions } from "@/lib/filter-sessions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const venue = params.getAll("venue");
  const organizer = params.getAll("organizer");
  const location = params.getAll("location");
  const day = params.getAll("day");
  const type = params.getAll("type");
  const style = params.getAll("style");
  const level = params.getAll("level");
  const workshopsOnly = params.get("workshopsOnly") === "true";
  const coursesOnly = params.get("coursesOnly") === "true";

  const data = readScrapeOutput();
  const sessions = filterSessions(data.sessions, {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    venue: venue.length ? venue : undefined,
    organizer: organizer.length ? organizer : undefined,
    location: location.length ? location : undefined,
    day: day.length ? day : undefined,
    type: type.length ? type : undefined,
    style: style.length ? style : undefined,
    level: level.length ? level : undefined,
    q: params.get("q") ?? undefined,
    workshopsOnly,
    coursesOnly
  });

  return NextResponse.json({
    generatedAt: data.generatedAt,
    count: sessions.length,
    sessions
  }, { headers: { "cache-control": "no-store" } });
}
