import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import type { DanceSession } from "../../lib/types";
import { getForwardDayWindow, getWeekDates, isSessionActiveOnDate } from "../../lib/date";

describe("getForwardDayWindow", () => {
  it("returns consecutive local days from anchor midnight", () => {
    const anchor = new Date(2026, 2, 19, 15, 30, 0);
    const window = getForwardDayWindow(anchor, 7);
    expect(window).toHaveLength(7);
    expect(window.map((d) => format(d, "yyyy-MM-dd"))).toEqual([
      "2026-03-19",
      "2026-03-20",
      "2026-03-21",
      "2026-03-22",
      "2026-03-23",
      "2026-03-24",
      "2026-03-25"
    ]);
  });
});

describe("getWeekDates", () => {
  it("still aligns to Monday for ISO week windows", () => {
    const thu = new Date(2026, 2, 19);
    const days = getWeekDates(thu).map((d) => format(d, "yyyy-MM-dd"));
    expect(days[0]).toBe("2026-03-16");
    expect(days[6]).toBe("2026-03-22");
  });
});

function makeSession(overrides: Partial<DanceSession>): DanceSession {
  return {
    id: "test-session",
    venue: "TripSpace",
    title: "Test class",
    details: null,
    dayOfWeek: null,
    startTime: "19:00",
    endTime: "20:00",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/book",
    sourceUrl: "https://example.com/source",
    tags: [],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-04-01T00:00:00.000Z",
    ...overrides
  };
}

describe("isSessionActiveOnDate", () => {
  it("does not expand day-less ranged sessions across every date in the range", () => {
    const session = makeSession({
      dayOfWeek: null,
      startDate: "2026-01-12",
      endDate: "2026-07-06"
    });

    expect(isSessionActiveOnDate(session, "2026-01-12")).toBe(true);
    expect(isSessionActiveOnDate(session, "2026-01-13")).toBe(false);
    expect(isSessionActiveOnDate(session, "2026-03-12")).toBe(false);
  });

  it("still honors weekday recurrence when a day is provided", () => {
    const session = makeSession({
      dayOfWeek: "Wednesday",
      startDate: "2026-01-01",
      endDate: "2026-12-31"
    });

    expect(isSessionActiveOnDate(session, "2026-03-18")).toBe(true);
    expect(isSessionActiveOnDate(session, "2026-03-19")).toBe(false);
  });
});
