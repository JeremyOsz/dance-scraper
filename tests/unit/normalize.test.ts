import { describe, expect, it } from "vitest";
import { buildOutput } from "../../scripts/scrape/normalize";

describe("buildOutput", () => {
  it("deduplicates by normalized id", () => {
    const output = buildOutput([
      {
        venueKey: "tripSpace",
        venue: "TripSpace",
        sourceUrl: "https://tripspace.co.uk",
        ok: true,
        error: null,
        classes: [
          {
            venue: "TripSpace",
            title: "Class A",
            details: null,
            dayOfWeek: "Monday",
            time: "6pm - 7pm",
            startDate: null,
            endDate: null,
            bookingUrl: "https://tripspace.co.uk/a",
            sourceUrl: "https://tripspace.co.uk"
          },
          {
            venue: "TripSpace",
            title: "Class A",
            details: null,
            dayOfWeek: "Monday",
            time: "6pm - 7pm",
            startDate: null,
            endDate: null,
            bookingUrl: "https://tripspace.co.uk/a",
            sourceUrl: "https://tripspace.co.uk"
          }
        ]
      }
    ]);

    expect(output.sessions).toHaveLength(1);
    expect(output.venues[0]?.count).toBe(2);
  });
});
