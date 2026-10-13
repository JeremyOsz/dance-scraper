import { describe, expect, it } from "vitest";
import { buildInsights } from "../../lib/insights";
import type { DanceSession } from "../../lib/types";

function session(overrides: Partial<DanceSession> = {}): DanceSession {
  return {
    id: "class", venue: "TripSpace", title: "Salsa", details: null,
    dayOfWeek: "Monday", startTime: "18:00", endTime: "19:00",
    startDate: null, endDate: null, timezone: "Europe/London",
    bookingUrl: "https://example.com", sourceUrl: "https://example.com",
    tags: ["salsa"], audience: "adult", isWorkshop: false, isCourse: false,
    lastSeenAt: "2026-10-13T00:00:00.000Z", ...overrides
  };
}

const anchor = "2026-10-13";

describe("buildInsights", () => {
  it("averages recurring and one-off classes across all four weekday occurrences", () => {
    const insights = buildInsights([
      session(),
      session({ id: "one-off", startDate: "2026-10-19", endDate: "2026-10-19" }),
      session({ id: "undated", dayOfWeek: null })
    ], anchor);
    expect(insights.windowStart).toBe(anchor);
    expect(insights.windowEnd).toBe("2026-11-09");
    expect(insights.averagePerDay).toBe(5 / 28);
    expect(insights.dayAverages.find((entry) => entry.day === "Monday")?.average).toBe(1.25);
    expect(insights.dayAverages.find((entry) => entry.day === "Tuesday")?.average).toBe(0);
    expect(insights.topTypesByDay.find((entry) => entry.day === "Monday")?.topTypes[0]).toEqual({ type: "Salsa", average: 1.25 });
    expect(insights.typeRows[0]?.byDay.Monday).toBe(1.25);
    expect(insights.typeRows[0]?.peakAverage).toBe(1.25);
  });

  it("respects term boundaries, exclusions, and the inclusive 28-day window", () => {
    const insights = buildInsights([
      session({ startDate: "2026-10-19", endDate: "2026-11-02", excludedDateRanges: [{ start: "2026-10-26", end: "2026-10-26" }] }),
      session({ id: "expired", endDate: "2026-10-12" }),
      session({ id: "future", startDate: "2026-11-10" }),
      session({ id: "last-day", dayOfWeek: null, startDate: "2026-11-09", endDate: "2026-11-09" })
    ], anchor);
    expect(insights.dayAverages.find((entry) => entry.day === "Monday")?.average).toBe(0.75);
    expect(insights.averagePerDay).toBe(3 / 28);
  });

  it("includes dated classes without a weekday and ranks styles by their average", () => {
    const insights = buildInsights([
      session({ title: "Contemporary", tags: ["contemporary"], startDate: "2026-10-19", endDate: "2026-10-19" }),
      session({ id: "weekly" }),
      session({ id: "dated", dayOfWeek: null, startDate: anchor, endDate: anchor })
    ], anchor);
    expect(insights.topTypesByDay.find((entry) => entry.day === "Monday")?.topTypes[0]?.type).toBe("Salsa");
    expect(insights.typeRows[0]?.peakDay).toBe("Monday");
    expect(insights.dayAverages.find((entry) => entry.day === "Tuesday")?.average).toBe(0.25);
  });

  it("returns zero averages and no styles for empty data", () => {
    const insights = buildInsights([], anchor);
    expect(insights.averagePerDay).toBe(0);
    expect(insights.dayAverages.every((entry) => entry.average === 0)).toBe(true);
    expect(insights.typeRows).toEqual([]);
  });
});
