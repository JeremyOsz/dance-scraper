import { NextRequest, NextResponse } from "next/server";
import { readScrapeOutput } from "@/lib/data-store";
import { filterSessions } from "@/lib/filter-sessions";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const venue = params.getAll("venue");
  const day = params.getAll("day");
  const type = params.getAll("type");
  const workshopsOnly = params.get("workshopsOnly") === "true";

  const data = readScrapeOutput();
  const sessions = filterSessions(data.sessions, {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    venue: venue.length ? venue : undefined,
    day: day.length ? day : undefined,
    type: type.length ? type : undefined,
    q: params.get("q") ?? undefined,
    workshopsOnly
  });

  return NextResponse.json({
    generatedAt: data.generatedAt,
    count: sessions.length,
    sessions
  });
}
