import { describe, expect, it } from "vitest";
import { buildOutput, dedupeSessionsByStableBookingUrl } from "../../scripts/scrape/normalize";
import type { DanceSession } from "../../lib/types";

function session(partial: Partial<DanceSession> & Pick<DanceSession, "id" | "venue" | "title" | "bookingUrl">): DanceSession {
  return {
    details: null,
    dayOfWeek: "Tuesday",
    startTime: "7pm",
    endTime: "8pm",
    startDate: null,
    endDate: null,
    excludedDateRanges: undefined,
    timezone: "Europe/London",
    sourceUrl: "https://example.com",
    tags: [],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-04-26T00:00:00.000Z",
    ...partial
  };
}

describe("dedupeSessionsByStableBookingUrl", () => {
  it("keeps one TeamUp row per event id at a venue (prefers newer lastSeenAt)", () => {
    const a = session({
      id: "east-london-dance-salsa-x-soca-tuesday-17-00",
      venue: "East London Dance",
      title: "SALSA X SOCA - Road to Carnival",
      bookingUrl: "https://goteamup.com/p/5799650-east-london-dance/e/90432252-salsa-x-soca-road-to-carnival/",
      startTime: "17:00",
      endTime: "21:00",
      lastSeenAt: "2026-04-26T06:17:10.175Z"
    });
    const b = session({
      id: "east-london-dance-salsa-x-soca-tuesday-18-00",
      venue: "East London Dance",
      title: "SALSA X SOCA - Road to Carnival",
      bookingUrl: "https://goteamup.com/p/5799650-east-london-dance/e/90432252-salsa-x-soca-road-to-carnival/",
      startTime: "18:00",
      endTime: "22:00",
      lastSeenAt: "2026-04-26T21:28:08.469Z"
    });
    const out = dedupeSessionsByStableBookingUrl([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(b.id);
    expect(out[0]?.startTime).toBe("18:00");
  });

  it("does not merge different TeamUp events at the same venue", () => {
    const out = dedupeSessionsByStableBookingUrl([
      session({
        id: "eld-a",
        venue: "East London Dance",
        title: "Popping",
        bookingUrl: "https://goteamup.com/p/5799650-east-london-dance/e/57985420-popping/"
      }),
      session({
        id: "eld-b",
        venue: "East London Dance",
        title: "Popping Taster",
        bookingUrl: "https://goteamup.com/p/5799650-east-london-dance/e/57599101-popping-taster/"
      })
    ]);
    expect(out).toHaveLength(2);
  });
});

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

  it("deduplicates near-identical cross-source titles at same slot", () => {
    const output = buildOutput([
      {
        venueKey: "luminousDance",
        venue: "Luminous Dance",
        sourceUrl: "https://dandelion.events/o/luminous/events",
        ok: true,
        error: null,
        classes: [
          {
            venue: "Luminous Dance",
            title: "Luminous x Michael Sebastian @ The Sanctuary &Soul",
            details: "Eventbrite version",
            dayOfWeek: "Friday",
            time: "18:30 - 21:30",
            startDate: "2026-03-20",
            endDate: "2026-03-20",
            bookingUrl: "https://www.eventbrite.com/e/example",
            sourceUrl: "https://www.eventbrite.com/o/73047023743"
          },
          {
            venue: "Luminous Dance",
            title: "Luminous x Michael Sebastian x The Sanctuary &Soul",
            details: "Dandelion version",
            dayOfWeek: "Friday",
            time: "18:30 - 21:30",
            startDate: "2026-03-20",
            endDate: "2026-03-20",
            bookingUrl: "https://dandelion.events/events/example",
            sourceUrl: "https://dandelion.events/o/luminous/events"
          }
        ]
      }
    ]);

    expect(output.sessions).toHaveLength(1);
    expect(output.sessions[0]?.title).toBe("Luminous x Michael Sebastian @ The Sanctuary &Soul");
    expect(output.venues[0]?.count).toBe(2);
  });

  it("normalizes loose time ranges with inferred meridiem and noon", () => {
    const output = buildOutput([
      {
        venueKey: "siobhanDavies",
        venue: "Siobhan Davies Studios",
        sourceUrl: "https://www.siobhandavies.com/events/classes-2/",
        ok: true,
        error: null,
        classes: [
          {
            venue: "Siobhan Davies Studios",
            title: "Morning Class",
            details: null,
            dayOfWeek: "Monday",
            time: "10am – 12noon",
            startDate: null,
            endDate: null,
            bookingUrl: "https://bookwhen.com/example",
            sourceUrl: "https://www.siobhandavies.com/events/classes-2/"
          },
          {
            venue: "Siobhan Davies Studios",
            title: "Evening Class",
            details: null,
            dayOfWeek: "Tuesday",
            time: "6.30 – 8pm",
            startDate: null,
            endDate: null,
            bookingUrl: "https://bookwhen.com/example-2",
            sourceUrl: "https://www.siobhandavies.com/events/classes-2/"
          }
        ]
      }
    ]);

    const morning = output.sessions.find((session) => session.title === "Morning Class");
    const evening = output.sessions.find((session) => session.title === "Evening Class");
    expect(morning?.startTime).toBe("10am");
    expect(morning?.endTime).toBe("12pm");
    expect(evening?.startTime).toBe("6.30 pm");
    expect(evening?.endTime).toBe("8pm");
  });

  it("does not tag Improvers classes as improv", () => {
    const output = buildOutput([
      {
        venueKey: "rambert",
        venue: "Test Venue",
        sourceUrl: "https://example.com",
        ok: true,
        error: null,
        classes: [
          {
            venue: "Test Venue",
            title: "Ballet Improvers",
            details: "Technique and confidence class",
            dayOfWeek: "Wednesday",
            time: "7pm - 8pm",
            startDate: null,
            endDate: null,
            bookingUrl: "https://example.com/class",
            sourceUrl: "https://example.com"
          }
        ]
      }
    ]);

    expect(output.sessions[0]?.tags).not.toContain("improv");
    expect(output.sessions[0]?.tags).toContain("ballet");
  });
});
