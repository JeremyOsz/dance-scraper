import { describe, expect, it } from "vitest";
import { extractPlaceCourseSessionDates } from "../../scripts/scrape/adapters/the-place-course-sessions";

describe("extractPlaceCourseSessionDates", () => {
  it("collects unique yyyy-MM-dd from embedded session JSON", () => {
    const html = `
      "startDate": "2026-03-25T18:30:00+00:00",
      "startDate": "2026-04-22T18:30:00+01:00",
      "startDate": "2026-03-25T18:30:00+00:00",
    `;
    expect(extractPlaceCourseSessionDates(html)).toEqual(["2026-03-25", "2026-04-22"]);
  });

  it("returns empty array when no session timestamps", () => {
    expect(extractPlaceCourseSessionDates("<html></html>")).toEqual([]);
  });
});
