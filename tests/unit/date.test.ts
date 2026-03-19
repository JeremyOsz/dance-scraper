import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getForwardDayWindow, getWeekDates } from "../../lib/date";

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
