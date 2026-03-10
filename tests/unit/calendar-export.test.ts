import { describe, expect, it } from "vitest";
import type { DanceSession } from "@/lib/types";
import { buildSessionIcs, canAddSessionToCalendar, getSessionCalendarTiming } from "@/lib/calendar-export";

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
});

