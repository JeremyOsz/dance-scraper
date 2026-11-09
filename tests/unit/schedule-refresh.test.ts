import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeLondonSchoolOfCapoeira } from "../../scripts/scrape/adapters/london-school-of-capoeira";
import { parseSwinglandHtml } from "../../scripts/scrape/adapters/swingland";
import { parseTangoFeverCalendarHtml } from "../../scripts/scrape/adapters/tango-fever";
import { fetchHtml } from "../../scripts/scrape/adapters/common";

vi.mock("../../scripts/scrape/adapters/common", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../scripts/scrape/adapters/common")>(),
  fetchHtml: vi.fn()
}));

const fixture = (name: string) => readFileSync(resolve("tests/fixtures/schedule-refresh", name), "utf8");

beforeEach(() => vi.resetAllMocks());

describe("current official schedule markup", () => {
  it("reads Capoeira comma headings, paragraph titles and month-first course dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    try {
      vi.mocked(fetchHtml).mockResolvedValueOnce(fixture("capoeira-timetable.html"))
        .mockResolvedValueOnce(fixture("capoeira-course.html"));
      const output = await scrapeLondonSchoolOfCapoeira();
      expect(output.ok).toBe(true);
      expect(output.classes).toHaveLength(11);
      expect(output.classes.filter(row => row.isCourse).map(row => row.startDate)).toEqual([
        "2026-12-01", "2026-12-03", "2026-12-08", "2026-12-10", "2026-12-15", "2026-12-17"
      ]);
      expect(output.classes[0]).toMatchObject({dayOfWeek: "Monday", time: "7:00–8:30 PM"});
      expect(output.classes[0].details).toContain("Suitable for students of all levels");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses Swingland instructional metadata and advertised start rather than doors-open time", () => {
    const rows = parseSwinglandHtml(fixture("swingland.html"));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({title: "A-Train @ The Hammersmith Club", time: "7:15pm", startDate: "2026-11-09"});
    expect(rows[1]).toMatchObject({time: "6:45pm"});
  });

  it("reads the redesigned Punchpass calendar with dates, bookings, teachers and locations", () => {
    const rows = parseTangoFeverCalendarHtml(fixture("tango.html"));
    expect(rows).toHaveLength(47);
    expect(rows.find(row => row.startDate === "2026-11-09" && row.title.includes("Pre-Milonga"))).toMatchObject({
      dayOfWeek: "Monday", time: "19:00", details: expect.stringContaining("Teacher: Rene & Hiba"),
      bookingUrl: expect.stringContaining("/classes/")
    });
    expect(rows.find(row => row.startDate === "2026-12-01" && row.title === "Beginners class - tuesdays"))
      .toMatchObject({ dayOfWeek: "Tuesday", time: "19:30" });
    expect(rows.some(row => /pass/i.test(row.title))).toBe(false);
  });
});
