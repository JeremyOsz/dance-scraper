import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { parseCalendarQuery, serializeCalendarQuery } from "@/components/calendar-next/calendar-query-state";

const options = {
  venueNames: ["The Place", "Rambert"],
  locationNames: ["South Bank", "The Place, Studio 1"],
  defaultDate: new Date("2026-08-20T12:00:00.000Z")
};

describe("calendar query state", () => {
  it("parses supported values and rejects unknown filter values", () => {
    const state = parseCalendarQuery(new URLSearchParams(
      "view=day&date=2026-08-24&q=ballet&venue=Rambert,Unknown&location=South+Bank&day=Monday,Noday&style=Ballet,Unknown&level=Open+Level,Unknown&time=evening,night&workshops=1&courses=1&shortlist=1"
    ), options);

    expect(state.view).toBe("day");
    expect(format(state.anchorDate, "yyyy-MM-dd")).toBe("2026-08-24");
    expect(state.filters).toEqual({
      search: "ballet",
      venues: ["Rambert"],
      locations: ["South Bank"],
      days: ["Monday"],
      styles: ["Ballet"],
      levels: ["Open Level"],
      times: ["evening"],
      workshopsOnly: true,
      coursesOnly: true,
      shortlistOnly: true
    });
  });

  it("uses the supplied date and rolling-week defaults for invalid query values", () => {
    const state = parseCalendarQuery(new URLSearchParams("view=agenda&date=not-a-date"), options);

    expect(state.view).toBe("week");
    expect(format(state.anchorDate, "yyyy-MM-dd")).toBe("2026-08-20");
    expect(state.filters.search).toBe("");
  });

  it("serializes the existing shareable URL format", () => {
    const query = serializeCalendarQuery({
      view: "month",
      anchorDate: new Date("2026-09-01T12:00:00.000Z"),
      filters: {
        search: "  floor work  ",
        venues: ["The Place"],
        locations: ["The Place, Studio 1"],
        days: ["Tuesday"],
        styles: ["Contemporary"],
        levels: ["Intermediate"],
        times: ["morning"],
        workshopsOnly: true,
        coursesOnly: false,
        shortlistOnly: true
      }
    });

    expect(query).toBe("view=month&date=2026-09-01&q=floor+work&venue=The+Place&location=The+Place%2C+Studio+1&day=Tuesday&style=Contemporary&level=Intermediate&time=morning&workshops=1&shortlist=1");
  });
});
