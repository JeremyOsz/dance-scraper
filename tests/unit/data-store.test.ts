import { describe, expect, it } from "vitest";
import { coerceScrapeOutput, dedupeSessionsByCanonicalBooking } from "@/lib/data-store";
import type { DanceSession } from "@/lib/types";

const base = (over: Partial<DanceSession>): DanceSession => ({
  id: "a",
  venue: "V",
  title: "T",
  details: null,
  dayOfWeek: "Friday",
  startTime: "19:00",
  endTime: null,
  startDate: "2026-04-03",
  endDate: "2026-04-03",
  timezone: "Europe/London",
  bookingUrl: "https://example.com/event",
  sourceUrl: "https://example.com",
  tags: [],
  audience: "adult",
  isWorkshop: false,
  lastSeenAt: "2026-04-01T00:00:00.000Z",
  ...over
});

describe("dedupeSessionsByCanonicalBooking", () => {
  it("keeps one row when two adapters share the same bookable slot", () => {
    const sessions = [
      base({
        id: "salsa-rueda-rueda-libre-cubaneando-friday-19-00",
        venue: "Salsa Rueda (Rueda Libre)",
        title: "Cubaneando",
        bookingUrl: "https://ruedalibre.co.uk/event/cubaneando-presents-weekly-classes-and-saturday-workshop/2026-04-03/"
      }),
      base({
        id: "cubaneando-cubaneando-friday-19-00",
        venue: "Cubaneando",
        title: "Cubaneando",
        bookingUrl: "https://ruedalibre.co.uk/event/cubaneando-presents-weekly-classes-and-saturday-workshop/2026-04-03/"
      })
    ];
    const out = dedupeSessionsByCanonicalBooking(sessions);
    expect(out).toHaveLength(1);
    expect(out[0].venue).toBe("Cubaneando");
    expect(out[0].id).toBe("cubaneando-cubaneando-friday-19-00");
  });

  it("disambiguates repeated ids when dated rows share one id", () => {
    const sessions = [
      base({
        id: "siobhan-davies-studios-to-move-together-friday-6-30-pm",
        venue: "Siobhan Davies Studios",
        title: "TO MOVE TOGETHER",
        startDate: "2026-04-24",
        endDate: "2026-04-24",
        dayOfWeek: "Friday",
        startTime: "6.30 pm",
        endTime: "8pm"
      }),
      base({
        id: "siobhan-davies-studios-to-move-together-friday-6-30-pm",
        venue: "Siobhan Davies Studios",
        title: "TO MOVE TOGETHER",
        startDate: "2026-05-29",
        endDate: "2026-05-29",
        dayOfWeek: "Friday",
        startTime: "6.30 pm",
        endTime: "8pm"
      })
    ];
    const out = coerceScrapeOutput({
      generatedAt: "2026-01-01T00:00:00.000Z",
      sessions,
      venues: []
    });
    const ids = out.sessions.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.some((id) => id.includes("--2026-05-29"))).toBe(true);
  });

  it("collapses duplicate Eventbrite rows for the same URL and calendar day", () => {
    const url =
      "https://www.eventbrite.co.uk/e/expressive-movement-and-dance-improvisation-with-musician-louis-laporte-tickets-1986154463466";
    const sessions = [
      base({
        id: "daniel-rodriguez-expressive-thursday-18-00",
        venue: "Daniel Rodriguez",
        title: "Expressive Movement and Dance Improvisation with musician Louis LaPorte",
        dayOfWeek: "Thursday",
        startTime: "18:00",
        endTime: "20:00",
        startDate: "2026-04-23",
        endDate: "2026-04-23",
        bookingUrl: url,
        lastSeenAt: "2026-04-01T00:00:00.000Z"
      }),
      base({
        id: "daniel-rodriguez-expressive-thursday-19-00",
        venue: "Daniel Rodriguez",
        title: "Expressive Movement and Dance Improvisation with musician Louis LaPorte",
        dayOfWeek: "Thursday",
        startTime: "19:00",
        endTime: "21:00",
        startDate: "2026-04-23",
        endDate: "2026-04-23",
        bookingUrl: url,
        lastSeenAt: "2026-04-19T12:00:00.000Z"
      })
    ];
    const out = coerceScrapeOutput({
      generatedAt: "2026-01-01T00:00:00.000Z",
      sessions,
      venues: []
    });
    const kept = out.sessions.filter((s) => s.bookingUrl === url && s.startDate === "2026-04-23");
    expect(kept).toHaveLength(1);
    expect(["18:00", "19:00"]).toContain(kept[0].startTime);
  });

  it("keeps the longer Luminous New Moon Monday title when two listings share the same date", () => {
    const sessions = [
      base({
        id: "luminous-dance-new-moon-short",
        venue: "Luminous Dance",
        title: "Luminous New Moon Monday Dance",
        dayOfWeek: "Monday",
        startTime: "18:30",
        endTime: "21:30",
        startDate: "2026-04-20",
        endDate: "2026-04-20",
        bookingUrl: "https://www.eventbrite.com/e/x"
      }),
      base({
        id: "luminous-dance-new-moon-long",
        venue: "Luminous Dance",
        title: "Luminous New Moon Monday Dance with DJ AZYRE BLUE",
        dayOfWeek: "Monday",
        startTime: "17:30",
        endTime: "20:30",
        startDate: "2026-04-20",
        endDate: "2026-04-20",
        bookingUrl: "https://dandelion.events/e/b4m54"
      })
    ];
    const out = coerceScrapeOutput({
      generatedAt: "2026-01-01T00:00:00.000Z",
      sessions,
      venues: []
    });
    expect(out.sessions.map((s) => s.id)).toEqual(["luminous-dance-new-moon-long"]);
  });

  it("does not merge different start times on the same Gel page", () => {
    const sessions = [
      base({
        id: "florence-trust-writers-room-bianca-scout-and-elena-isolini-daughter-mary-dance-workshop-tuesday-10-00am",
        venue: "Florence Trust (Writers' Room)",
        title: "Bianca Scout and Elena Isolini (Daughter Mary) Dance Workshop",
        bookingUrl: "https://gel.now/events/97",
        startTime: "10:00am"
      }),
      base({
        id: "britannia-row-bianca-scout-and-elena-isolini-daughter-mary-dance-workshop-tuesday-11-00am",
        venue: "Britannia Row",
        title: "Bianca Scout and Elena Isolini (Daughter Mary) Dance Workshop",
        bookingUrl: "https://gel.now/events/97",
        startTime: "11:00am"
      })
    ];
    expect(dedupeSessionsByCanonicalBooking(sessions)).toHaveLength(2);
  });
});
