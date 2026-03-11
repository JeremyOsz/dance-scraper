import { describe, expect, it } from "vitest";
import { filterSessions } from "../../lib/filter-sessions";
import type { DanceSession } from "../../lib/types";

const sample: DanceSession[] = [
  {
    id: "1",
    venue: "TripSpace",
    title: "Open Level Workshop",
    details: "Improvisation",
    dayOfWeek: "Monday",
    startTime: "6pm",
    endTime: "8pm",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    timezone: "Europe/London",
    bookingUrl: "https://tripspace.co.uk",
    sourceUrl: "https://tripspace.co.uk",
    tags: ["improvisation"],
    audience: "open",
    isWorkshop: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "2",
    venue: "Rambert",
    title: "Evening Class",
    details: "Intermediate technique",
    dayOfWeek: "Tuesday",
    startTime: "7pm",
    endTime: "8pm",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    timezone: "Europe/London",
    bookingUrl: "https://rambert.org.uk",
    sourceUrl: "https://rambert.org.uk",
    tags: ["contemporary"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  }
];

describe("filterSessions", () => {
  it("filters by venue and workshop flag", () => {
    const filtered = filterSessions(sample, {
      venue: ["TripSpace"],
      workshopsOnly: true
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });

  it("filters by date range", () => {
    const filtered = filterSessions(sample, {
      from: "2026-04-01",
      to: "2026-04-30"
    });
    expect(filtered).toHaveLength(0);
  });

  it("filters by dance type", () => {
    const filtered = filterSessions(sample, {
      type: ["Improv"]
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });

  it("filters by level", () => {
    const filtered = filterSessions(sample, {
      level: ["Intermediate"]
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("2");
  });

  it("can match Other dance type", () => {
    const filtered = filterSessions(sample, {
      type: ["Other"]
    });
    expect(filtered).toHaveLength(0);
  });

  it("excludes sessions with unknown day when day filter is selected", () => {
    const undatedDaySession: DanceSession = {
      ...sample[0],
      id: "3",
      dayOfWeek: null
    };
    const filtered = filterSessions([...sample, undatedDaySession], {
      day: ["Monday"]
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });
});
