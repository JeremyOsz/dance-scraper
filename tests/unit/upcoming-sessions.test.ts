import { describe, expect, it } from "vitest";
import type { DanceSession } from "../../lib/types";
import { getUpcomingSessionOccurrences } from "../../lib/upcoming-sessions";

function makeSession(overrides: Partial<DanceSession>): DanceSession {
  return {
    id: "session",
    venue: "TripSpace",
    title: "Morning Class",
    details: null,
    dayOfWeek: "Monday",
    startTime: "10:00",
    endTime: "11:00",
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

describe("getUpcomingSessionOccurrences", () => {
  it("returns bounded upcoming dated occurrences in date and time order", () => {
    const sessions = [
      makeSession({ id: "late", title: "Late Class", dayOfWeek: "Monday", startTime: "20:00" }),
      makeSession({ id: "early", title: "Early Class", dayOfWeek: "Monday", startTime: "09:00" }),
      makeSession({ id: "tuesday", title: "Tuesday Class", dayOfWeek: "Tuesday", startTime: "12:00" })
    ];

    const occurrences = getUpcomingSessionOccurrences(sessions, new Date(2026, 3, 27), {
      maxDays: 2,
      maxItems: 2
    });

    expect(occurrences.map((occurrence) => `${occurrence.dateIso}:${occurrence.session.id}`)).toEqual([
      "2026-04-27:early",
      "2026-04-27:late"
    ]);
  });

  it("does not include undated sessions", () => {
    const occurrences = getUpcomingSessionOccurrences(
      [makeSession({ id: "undated", dayOfWeek: null, startDate: null, endDate: null })],
      new Date(2026, 3, 27),
      { maxDays: 7 }
    );

    expect(occurrences).toHaveLength(0);
  });

  it("can return only the first upcoming occurrence for each recurring session", () => {
    const occurrences = getUpcomingSessionOccurrences(
      [
        makeSession({ id: "weekly", title: "Weekly Class", dayOfWeek: "Monday", startTime: "10:00" }),
        makeSession({ id: "dated", title: "Dated Class", dayOfWeek: "Wednesday", startDate: "2026-04-29", startTime: "18:00" })
      ],
      new Date(2026, 3, 27),
      { maxDays: 14, maxItems: 4, uniqueSessions: true }
    );

    expect(occurrences.map((occurrence) => `${occurrence.dateIso}:${occurrence.session.id}`)).toEqual([
      "2026-04-27:weekly",
      "2026-04-29:dated"
    ]);
  });
});
