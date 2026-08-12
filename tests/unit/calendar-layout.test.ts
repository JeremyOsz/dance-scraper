import { describe, expect, it } from "vitest";
import {
  advanceLoadedDayCount,
  getCalendarGridBounds,
  getTimeBucket,
  layoutCalendarEvents,
  matchesTimeBuckets,
  parseTimeToMinutes,
  sortSessionsForVenueAgenda
} from "../../lib/calendar-layout";

describe("parseTimeToMinutes", () => {
  it.each([
    ["19:30", 1170],
    ["19.30", 1170],
    ["7pm", 1140],
    ["7.30 pm", 1170],
    ["12 pm", 720],
    ["12:00 am", 0],
    ["1.40 pm", 820],
    ["09:05", 545]
  ])("normalizes %s", (value, expected) => {
    expect(parseTimeToMinutes(value)).toBe(expected);
  });

  it.each([null, "", "Time TBC", "25:00", "7:99"])("rejects invalid time %s", (value) => {
    expect(parseTimeToMinutes(value)).toBeNull();
  });
});

describe("time buckets", () => {
  it("uses the agreed morning, afternoon, and evening boundaries", () => {
    expect(getTimeBucket(719)).toBe("morning");
    expect(getTimeBucket(720)).toBe("afternoon");
    expect(getTimeBucket(1019)).toBe("afternoon");
    expect(getTimeBucket(1020)).toBe("evening");
  });

  it("keeps unknown times unless a time filter is active", () => {
    expect(matchesTimeBuckets(null, [])).toBe(true);
    expect(matchesTimeBuckets(null, ["morning"])).toBe(false);
    expect(matchesTimeBuckets("18:30", ["evening"])).toBe(true);
    expect(matchesTimeBuckets("18:30", ["morning", "afternoon"])).toBe(false);
  });
});

describe("getCalendarGridBounds", () => {
  it("defaults to 7am–11pm and expands for visible outliers", () => {
    expect(getCalendarGridBounds([])).toEqual({ startMinute: 420, endMinute: 1380 });
    expect(
      getCalendarGridBounds([
        { startTime: "05:30", endTime: "06:30" },
        { startTime: "22:30", endTime: "23:45" }
      ])
    ).toEqual({ startMinute: 300, endMinute: 1440 });
  });
});

describe("layoutCalendarEvents", () => {
  it("assigns overlapping events to deterministic side-by-side lanes", () => {
    const result = layoutCalendarEvents([
      { id: "a", startTime: "10:00", endTime: "11:30" },
      { id: "b", startTime: "10:30", endTime: "11:00" },
      { id: "c", startTime: "12:00", endTime: "13:00" }
    ]);

    expect(result.map(({ event, startMinute, endMinute, column, columnCount }) => ({
      id: event.id,
      startMinute,
      endMinute,
      column,
      columnCount
    }))).toEqual([
      { id: "a", startMinute: 600, endMinute: 690, column: 0, columnCount: 2 },
      { id: "b", startMinute: 630, endMinute: 660, column: 1, columnCount: 2 },
      { id: "c", startMinute: 720, endMinute: 780, column: 0, columnCount: 1 }
    ]);
  });

  it("uses a one-hour layout duration when an end time is absent or invalid", () => {
    const [missingEnd, invalidEnd] = layoutCalendarEvents([
      { id: "missing", startTime: "14:00", endTime: null },
      { id: "invalid", startTime: "16:00", endTime: "15:00" }
    ]);

    expect(missingEnd).toMatchObject({ startMinute: 840, endMinute: 900 });
    expect(invalidEnd).toMatchObject({ startMinute: 960, endMinute: 1020 });
  });

  it("returns unparseable starts separately from positioned events", () => {
    const result = layoutCalendarEvents([
      { id: "timed", startTime: "09:00", endTime: "10:00" },
      { id: "tbc", startTime: null, endTime: null }
    ]);

    expect(result.map((item) => item.event.id)).toEqual(["timed"]);
    expect(result.untimed.map((event) => event.id)).toEqual(["tbc"]);
  });
});

describe("advanceLoadedDayCount", () => {
  it("loads seven more days without passing the 56-day cap", () => {
    expect(advanceLoadedDayCount(7)).toBe(14);
    expect(advanceLoadedDayCount(53)).toBe(56);
    expect(advanceLoadedDayCount(56)).toBe(56);
  });
});

describe("sortSessionsForVenueAgenda", () => {
  it("uses the existing venue priority before sorting times within each venue", () => {
    const result = sortSessionsForVenueAgenda([
      { id: "studio-early", venue: "Danceworks", title: "Studio early", startTime: "08:00", endTime: "09:00" },
      { id: "place-late", venue: "The Place", title: "Place late", startTime: "18:00", endTime: "19:00" },
      { id: "place-early", venue: "The Place", title: "Place early", startTime: "10:00", endTime: "11:00" },
      { id: "place-tbc", venue: "The Place", title: "Place TBC", startTime: null, endTime: null }
    ]);

    expect(result.map((session) => session.id)).toEqual([
      "place-early",
      "place-late",
      "place-tbc",
      "studio-early"
    ]);
  });
});
