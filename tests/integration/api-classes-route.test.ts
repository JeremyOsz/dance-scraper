import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { DanceSession } from "@/lib/types";

const readScrapeOutput = vi.fn();

vi.mock("@/lib/data-store", () => ({ readScrapeOutput }));

function session(id: string, isCourse: boolean, venue = "Example Studio"): DanceSession {
  return {
    id,
    venue,
    organizer: venue,
    locationName: venue === "Studio B" ? "Hall B" : "Hall A",
    styles: ["Ballet"],
    title: isCourse ? "Six-week ballet course" : "Ballet drop-in",
    details: null,
    dayOfWeek: "Tuesday",
    startTime: "19:00",
    endTime: "20:00",
    startDate: "2026-09-01",
    endDate: "2026-10-06",
    timezone: "Europe/London",
    bookingUrl: `https://example.com/${id}`,
    sourceUrl: "https://example.com",
    tags: ["ballet"],
    audience: "adult",
    isWorkshop: false,
    isCourse,
    lastSeenAt: "2026-08-11T00:00:00.000Z"
  };
}

describe("GET /api/classes", () => {
  it("returns only course occurrences when coursesOnly=true", async () => {
    readScrapeOutput.mockReturnValue({
      generatedAt: "2026-08-11T00:00:00.000Z",
      sessions: [session("course", true), session("drop-in", false)],
      venues: []
    });

    const { GET } = await import("@/app/api/classes/route");
    const response = await GET(new NextRequest("http://localhost/api/classes?coursesOnly=true"));
    const body = await response.json();

    expect(body.count).toBe(1);
    expect(body.sessions.map((item: DanceSession) => item.id)).toEqual(["course"]);
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("max-age=3600, stale-while-revalidate=86400");
  });

  it("combines course filtering with existing venue filters", async () => {
    readScrapeOutput.mockReturnValue({
      generatedAt: "2026-08-11T00:00:00.000Z",
      sessions: [session("course-a", true, "Studio A"), session("course-b", true, "Studio B")],
      venues: []
    });

    const { GET } = await import("@/app/api/classes/route");
    const response = await GET(
      new NextRequest("http://localhost/api/classes?coursesOnly=true&venue=Studio%20B")
    );
    const body = await response.json();

    expect(body.sessions.map((item: DanceSession) => item.id)).toEqual(["course-b"]);
  });

  it("supports canonical organizer, location and style parameters", async () => {
    const contemporary = { ...session("contemporary", false, "Studio B"), styles: ["Contemporary"] as const };
    readScrapeOutput.mockReturnValue({
      generatedAt: "2026-08-11T00:00:00.000Z",
      sessions: [session("ballet", false, "Studio A"), contemporary],
      venues: []
    });

    const { GET } = await import("@/app/api/classes/route");
    const response = await GET(
      new NextRequest("http://localhost/api/classes?organizer=Studio%20B&location=Hall%20B&style=Contemporary")
    );
    const body = await response.json();

    expect(body.sessions.map((item: DanceSession) => item.id)).toEqual(["contemporary"]);
  });
});
