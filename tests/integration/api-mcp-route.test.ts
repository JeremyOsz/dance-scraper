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

function mockData(sessions: DanceSession[] = [sampleSession]) {
  readScrapeOutput.mockReturnValue({
    generatedAt: "2026-03-10T00:00:00.000Z",
    sessions,
    venues: []
  });
}

describe("POST /mcp", () => {
  it("advertises schedule tools", async () => {
    mockData();
    const { POST } = await import("@/app/mcp/route");
    const response = await POST(
      new NextRequest("http://localhost/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "search_dance_classes",
      "plan_dance_schedule",
      "generate_schedule_ics"
    ]);
    expect(body.result.tools[1]._meta.ui.resourceUri).toBe("ui://london-dance-calendar/schedule.html");
  });

  it("calls search and ICS tools", async () => {
    mockData();
    const { POST } = await import("@/app/mcp/route");
    const searchResponse = await POST(
      new NextRequest("http://localhost/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "search",
          method: "tools/call",
          params: { name: "search_dance_classes", arguments: { type: ["improv"], from: "2026-03-10", to: "2026-03-12" } }
        })
      })
    );
    const searchBody = await searchResponse.json();
    expect(searchBody.result.structuredContent.sessions[0].id).toBe("sess-1");

    const icsResponse = await POST(
      new NextRequest("http://localhost/mcp", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ics",
          method: "tools/call",
          params: { name: "generate_schedule_ics", arguments: { sessionIds: ["sess-1"] } }
        })
      })
    );
    const icsBody = await icsResponse.json();
    expect(icsBody.result.structuredContent.icsText).toContain("BEGIN:VCALENDAR");
  });
});

describe("GET /api/calendar", () => {
  it("returns a multi-session ICS download", async () => {
    mockData();
    const { GET } = await import("@/app/api/calendar/route");
    const response = await GET(new NextRequest("http://localhost/api/calendar?ids=sess-1&calendarName=My%20Classes"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("content-disposition")).toContain("my-classes.ics");
    const body = await response.text();
    expect(body).toContain("SUMMARY:Contact Improvisation");
  });
});
