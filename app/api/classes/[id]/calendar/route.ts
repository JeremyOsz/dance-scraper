import { NextRequest, NextResponse } from "next/server";
import { buildCalendarFilename, buildSessionIcs, canAddSessionToCalendar } from "@/lib/calendar-export";
import { readScrapeOutput } from "@/lib/data-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionId = decodeURIComponent(id);
  const data = readScrapeOutput();
  const session = data.sessions.find((item) => item.id === sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!canAddSessionToCalendar(session)) {
    return NextResponse.json({ error: "Session does not contain enough date information." }, { status: 422 });
  }

  const body = buildSessionIcs(session);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${buildCalendarFilename(session)}"`,
      "cache-control": "no-store"
    }
  });
}
