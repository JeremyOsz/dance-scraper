import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { DanceSession } from "@/lib/types";

const readScrapeOutput = vi.fn();

vi.mock("@/lib/data-store", () => ({
  readScrapeOutput
}));

const sampleSession: DanceSession = {
  id: "sess-1",
  venue: "TripSpace",
  title: "Contact Improvisation",
  details: "Open session",
  dayOfWeek: "Tuesday",
  startTime: "7:00 pm",
  endTime: "8:30 pm",
  startDate: "2026-03-10",
  endDate: null,
  timezone: "Europe/London",
  bookingUrl: "https://example.com/book",
  sourceUrl: "https://example.com/source",
  tags: ["improv"],
  audience: "open",
  isWorkshop: true,
  lastSeenAt: "2026-03-10T00:00:00.000Z"
};

describe("GET /api/classes/[id]/calendar", () => {
  it("returns ICS for existing session", async () => {
    readScrapeOutput.mockReturnValue({
      generatedAt: "2026-03-10T00:00:00.000Z",
      sessions: [sampleSession],
      venues: []
    });

    const { GET } = await import("@/app/api/classes/[id]/calendar/route");
    const response = await GET(new NextRequest("http://localhost/api/classes/sess-1/calendar"), {
      params: Promise.resolve({ id: "sess-1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Contact Improvisation");
  });

  it("returns 404 when session is missing", async () => {
    readScrapeOutput.mockReturnValue({
      generatedAt: "2026-03-10T00:00:00.000Z",
      sessions: [],
      venues: []
    });

    const { GET } = await import("@/app/api/classes/[id]/calendar/route");
    const response = await GET(new NextRequest("http://localhost/api/classes/missing/calendar"), {
      params: Promise.resolve({ id: "missing" })
    });

    expect(response.status).toBe(404);
  });
});
