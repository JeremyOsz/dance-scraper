import { describe, expect, it } from "vitest";
import type { DanceSession } from "@/lib/types";
import { buildMultiSessionIcs, buildSessionIcs, canAddSessionToCalendar, getSessionCalendarTiming } from "@/lib/calendar-export";

const baseSession: DanceSession = {
  id: "sess-1",
  venue: "Test Venue",
  title: "Evening Flow",
  details: "Open level class",
  dayOfWeek: null,
  startTime: "7:00 pm",
  endTime: "8:30 pm",
  startDate: "2026-03-20",
  endDate: null,
  timezone: "Europe/London",
  bookingUrl: "https://example.com/book",
  sourceUrl: "https://example.com/source",
  tags: ["flow"],
  audience: "adult",
  isWorkshop: false,
  lastSeenAt: "2026-03-10T00:00:00.000Z"
};

describe("calendar export", () => {
  it("builds timed calendar event from startDate + time", () => {
    const timing = getSessionCalendarTiming(baseSession, new Date("2026-03-10T12:00:00.000Z"));
    expect(timing).not.toBeNull();
    expect(timing?.allDay).toBe(false);
    expect(timing?.start.getHours()).toBe(19);
    expect(timing?.end.getHours()).toBe(20);
  });

  it("uses next dayOfWeek occurrence when startDate missing", () => {
    const session: DanceSession = {
      ...baseSession,
      startDate: null,
      dayOfWeek: "Wednesday",
      startTime: "6:00 pm",
      endTime: "7:00 pm"
    };
    const timing = getSessionCalendarTiming(session, new Date("2026-03-10T12:00:00.000Z"));
    expect(timing).not.toBeNull();
    expect(timing?.start.getDate()).toBe(11);
  });

  it("skips excluded week for recurring sessions when choosing next occurrence", () => {
    const session: DanceSession = {
      ...baseSession,
      startDate: null,
      dayOfWeek: "Wednesday",
      startTime: "6:00 pm",
      endTime: "7:00 pm",
      excludedDateRanges: [{ start: "2026-03-11", end: "2026-03-11" }]
    };
    const timing = getSessionCalendarTiming(session, new Date("2026-03-10T12:00:00.000Z"));
    expect(timing).not.toBeNull();
    expect(timing?.start.getFullYear()).toBe(2026);
    expect(timing?.start.getMonth()).toBe(2);
    expect(timing?.start.getDate()).toBe(18);
  });

  it("returns false when no date can be inferred", () => {
    const session: DanceSession = {
      ...baseSession,
      startDate: null,
      dayOfWeek: null
    };
    expect(canAddSessionToCalendar(session)).toBe(false);
  });

  it("builds ICS with title and booking URL", () => {
    const ics = buildSessionIcs(baseSession, new Date("2026-03-10T12:00:00.000Z"));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Evening Flow");
    expect(ics).toContain("https://example.com/book");
  });

  it("prefers next dayOfWeek occurrence over stale startDate", () => {
    const session: DanceSession = {
      ...baseSession,
      dayOfWeek: "Wednesday",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      startTime: "6:00 pm",
      endTime: "7:00 pm"
    };
    const timing = getSessionCalendarTiming(session, new Date("2026-03-10T12:00:00.000Z"));
    expect(timing).not.toBeNull();
    expect(timing?.start.toISOString().slice(0, 10)).toBe("2026-03-11");
  });

  it("uses provided now value for DTSTAMP", () => {
    const now = new Date("2026-03-10T12:34:56.000Z");
    const ics = buildSessionIcs(baseSession, now);
    expect(ics).toContain("DTSTAMP:20260310T123456Z");
  });

  it("folds long description lines in ICS output", () => {
    const session: DanceSession = {
      ...baseSession,
      details: `Long details ${"x".repeat(300)}`
    };
    const ics = buildSessionIcs(session, new Date("2026-03-10T12:00:00.000Z"));
    const descriptionLines = ics
      .split("\r\n")
      .filter((line) => line.startsWith("DESCRIPTION:") || line.startsWith(" "));
    expect(descriptionLines.length).toBeGreaterThan(1);
  });

  it("builds a multi-session calendar and skips sessions without timing", () => {
    const missingTiming: DanceSession = {
      ...baseSession,
      id: "sess-missing",
      title: "No Timing",
      startDate: null,
      dayOfWeek: null
    };
    const result = buildMultiSessionIcs([baseSession, missingTiming], {
      calendarName: "My Dance Plan",
      now: new Date("2026-03-10T12:00:00.000Z")
    });

    expect(result.ics).toContain("X-WR-CALNAME:My Dance Plan");
    expect(result.ics).toContain("UID:sess-1@dance-scraper.local");
    expect(result.ics).not.toContain("UID:sess-missing@dance-scraper.local");
    expect(result.included).toHaveLength(1);
    expect(result.skipped).toEqual([
      {
        id: "sess-missing",
        title: "No Timing",
        reason: "Session does not contain enough date information for calendar export."
      }
    ]);
  });
});
