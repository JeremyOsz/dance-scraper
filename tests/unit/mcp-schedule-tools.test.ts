import { describe, expect, it } from "vitest";
import { generateScheduleIcs, planDanceSchedule, searchDanceClasses } from "@/lib/mcp/schedule-tools";
import type { DanceSession } from "@/lib/types";

const sessions: DanceSession[] = [
  {
    id: "contemporary-beginner",
    venue: "Rambert",
    title: "Beginner Contemporary",
    details: "Beginner technique class",
    dayOfWeek: "Tuesday",
    startTime: "7:00 pm",
    endTime: "8:30 pm",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    timezone: "Europe/London",
    bookingUrl: "https://example.com/rambert",
    sourceUrl: "https://example.com/rambert/source",
    tags: ["contemporary", "beginner"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "salsa-workshop",
    venue: "TripSpace",
    title: "Salsa Workshop",
    details: "Open level partnerwork",
    dayOfWeek: "Wednesday",
    startTime: "6:00 pm",
    endTime: "8:00 pm",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    timezone: "Europe/London",
    bookingUrl: "https://example.com/salsa",
    sourceUrl: "https://example.com/salsa/source",
    tags: ["salsa", "open"],
    audience: "open",
    isWorkshop: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  }
];

describe("MCP schedule tools", () => {
  it("searches sessions with inferred calendar timing", () => {
    const result = searchDanceClasses(
      sessions,
      { type: ["Contemporary"], maxResults: 5 },
      new Date("2026-03-10T12:00:00.000Z")
    );

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.id).toBe("contemporary-beginner");
    expect(result.sessions[0]?.occurrenceDate).toBe("2026-03-10");
    expect(result.sessions[0]?.canExportToCalendar).toBe(true);
  });

  it("plans around unavailable windows and returns selected IDs", () => {
    const result = planDanceSchedule(
      sessions,
      {
        preferredStyles: ["salsa", "contemporary"],
        unavailable: [{ day: "Tuesday", startTime: "6pm", endTime: "9pm" }],
        maxClasses: 2
      },
      new Date("2026-03-10T12:00:00.000Z")
    );

    expect(result.selectedSessionIds).toEqual(["salsa-workshop"]);
    expect(result.skipped.some((item) => item.id === "contemporary-beginner")).toBe(true);
  });

  it("generates ICS for selected sessions and reports missing IDs", () => {
    const result = generateScheduleIcs(
      sessions,
      { sessionIds: ["contemporary-beginner", "missing"], calendarName: "Dance Week" },
      new Date("2026-03-10T12:00:00.000Z")
    );

    expect(result.filename).toBe("dance-week.ics");
    expect(result.icsText).toContain("BEGIN:VCALENDAR");
    expect(result.icsText).toContain("SUMMARY:Beginner Contemporary");
    expect(result.included).toHaveLength(1);
    expect(result.skipped).toEqual([{ id: "missing", title: "missing", reason: "Session not found." }]);
  });
});
