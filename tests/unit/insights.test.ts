import { describe, expect, it } from "vitest";
import { buildInsights } from "../../lib/insights";
import type { DanceSession } from "../../lib/types";

const sampleSessions: DanceSession[] = [
  {
    id: "monday-1",
    venue: "TripSpace",
    title: "Contemporary Basics",
    details: null,
    dayOfWeek: "Monday",
    startTime: "18:00",
    endTime: "19:00",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/1",
    sourceUrl: "https://example.com/1",
    tags: ["contemporary"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "monday-2",
    venue: "TripSpace",
    title: "Salsa Partnerwork",
    details: null,
    dayOfWeek: "Monday",
    startTime: "20:00",
    endTime: "21:00",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/2",
    sourceUrl: "https://example.com/2",
    tags: ["salsa"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "tuesday-1",
    venue: "Rambert",
    title: "Salsa Footwork",
    details: null,
    dayOfWeek: "Tuesday",
    startTime: "19:00",
    endTime: "20:00",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/3",
    sourceUrl: "https://example.com/3",
    tags: ["salsa"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "no-day-1",
    venue: "Rambert",
    title: "Undated workshop",
    details: null,
    dayOfWeek: null,
    startTime: null,
    endTime: null,
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/4",
    sourceUrl: "https://example.com/4",
    tags: ["improv"],
    audience: "adult",
    isWorkshop: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  }
];

describe("buildInsights", () => {
  it("computes day totals and excludes sessions with unknown day", () => {
    const insights = buildInsights(sampleSessions);
    const monday = insights.dayTotals.find((entry) => entry.day === "Monday");
    const tuesday = insights.dayTotals.find((entry) => entry.day === "Tuesday");
    const sunday = insights.dayTotals.find((entry) => entry.day === "Sunday");

    expect(insights.totalSessions).toBe(4);
    expect(insights.sessionsWithKnownDay).toBe(3);
    expect(insights.sessionsWithoutKnownDay).toBe(1);
    expect(monday?.count).toBe(2);
    expect(tuesday?.count).toBe(1);
    expect(sunday?.count).toBe(0);
  });

  it("computes top types for each day", () => {
    const insights = buildInsights(sampleSessions);
    const monday = insights.topTypesByDay.find((entry) => entry.day === "Monday");
    const tuesday = insights.topTypesByDay.find((entry) => entry.day === "Tuesday");
    const wednesday = insights.topTypesByDay.find((entry) => entry.day === "Wednesday");

    expect(monday?.topTypes[0]?.type).toBe("Contemporary");
    expect(monday?.topTypes[1]?.type).toBe("Salsa");
    expect(tuesday?.topTypes[0]?.type).toBe("Salsa");
    expect(wednesday?.topTypes).toHaveLength(0);
  });

  it("computes a peak day for each type that has scheduled sessions", () => {
    const insights = buildInsights(sampleSessions);
    const salsa = insights.typeRows.find((entry) => entry.type === "Salsa");
    const contemporary = insights.typeRows.find((entry) => entry.type === "Contemporary");
    const improv = insights.typeRows.find((entry) => entry.type === "Improv");

    expect(salsa?.total).toBe(2);
    expect(salsa?.peakDay).toBe("Monday");
    expect(contemporary?.peakDay).toBe("Monday");
    expect(improv).toBeUndefined();
  });
});
