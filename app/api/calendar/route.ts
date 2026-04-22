import { NextRequest, NextResponse } from "next/server";
import { generateScheduleIcs } from "@/lib/mcp/schedule-tools";
import { readScrapeOutput } from "@/lib/data-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readSessionIds(req: NextRequest) {
  const values = req.nextUrl.searchParams.getAll("ids");
  return values.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const sessionIds = readSessionIds(req);
  if (sessionIds.length === 0) {
    return NextResponse.json({ error: "Provide at least one session ID with ?ids=..." }, { status: 400 });
  }

  const calendarName = req.nextUrl.searchParams.get("calendarName") ?? undefined;
  const data = readScrapeOutput();
  const result = generateScheduleIcs(data.sessions, { sessionIds, calendarName });

  if (result.included.length === 0) {
    return NextResponse.json(
      { error: "No requested sessions could be exported.", skipped: result.skipped },
      { status: 422 }
    );
  }

  return new NextResponse(result.icsText, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${result.filename}"`,
      "cache-control": "no-store"
    }
  });
}
