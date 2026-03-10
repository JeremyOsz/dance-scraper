import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchHtml = vi.fn();

vi.mock("../../scripts/scrape/adapters/common", async () => {
  const actual = await vi.importActual<object>("../../scripts/scrape/adapters/common");
  return {
    ...actual,
    fetchHtml
  };
});

function fixture(name: string) {
  return fs.readFileSync(path.join(process.cwd(), "tests/unit/fixtures", name), "utf8");
}

describe("scraper adapters", () => {
  beforeEach(() => {
    fetchHtml.mockReset();
  });

  it("parses The Place adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("the-place.html"));
    const { scrapeThePlace } = await import("../../scripts/scrape/adapters/the-place");
    const output = await scrapeThePlace();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.title).toContain("Contemporary");
  });

  it("parses Rambert adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("rambert.html"));
    const { scrapeRambert } = await import("../../scripts/scrape/adapters/rambert");
    const output = await scrapeRambert();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
  });

  it("parses Siobhan Davies adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("siobhan.html"));
    const { scrapeSiobhanDavies } = await import("../../scripts/scrape/adapters/siobhan-davies");
    const output = await scrapeSiobhanDavies();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.dayOfWeek).toBe("Wednesday");
  });

  it("parses TripSpace adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("tripspace.html"));
    const { scrapeTripSpace } = await import("../../scripts/scrape/adapters/trip-space");
    const output = await scrapeTripSpace();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("TripSpace");
  });

  it("parses Chisenhale adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("chisenhale.html"));
    const { scrapeChisenhale } = await import("../../scripts/scrape/adapters/chisenhale");
    const output = await scrapeChisenhale();
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toContain("Monday Night Improvisation");
    expect(output.classes.map((item) => item.title)).not.toContain("About");
    expect(output.classes.map((item) => item.title)).not.toContain("Rise Up (6-7 Years)");
  });

  it("parses CI Calendar London adapter", async () => {
    fetchHtml
      .mockResolvedValueOnce(fixture("ci-calendar.html"))
      .mockResolvedValue(fixture("ci-feed.ics"));
    const { scrapeCiCalendarLondon } = await import("../../scripts/scrape/adapters/ci-calendar");
    const output = await scrapeCiCalendarLondon();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("CI Calendar London");
    expect(output.classes[0]?.title).toContain("Contact Improvisation");
  });

  it("parses Bachata Community adapter", async () => {
    fetchHtml
      .mockResolvedValueOnce(fixture("bachata-home.html"))
      .mockResolvedValue(fixture("bachata-month.json"));
    const { scrapeBachataCommunity } = await import("../../scripts/scrape/adapters/bachata-community");
    const output = await scrapeBachataCommunity();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Bachata Community");
    expect(output.classes[0]?.title).toContain("Bachata");
  });

  it("parses Ecstatic Dance London adapter from Eventbrite organizers", async () => {
    fetchHtml.mockResolvedValue(fixture("eventbrite-organizer.html"));
    const { scrapeEcstaticDanceLondon } = await import("../../scripts/scrape/adapters/ecstatic-dance-london");
    const output = await scrapeEcstaticDanceLondon();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Ecstatic Dance London");
  });

  it("parses Eventbrite organizer JSON-LD graph and skips malformed dates", async () => {
    fetchHtml.mockResolvedValue(fixture("eventbrite-organizer-graph.html"));
    const { scrapeEcstaticDanceLondon } = await import("../../scripts/scrape/adapters/ecstatic-dance-london");
    const output = await scrapeEcstaticDanceLondon();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(1);
    expect(output.classes[0]?.title).toBe("Luminous New Moon Monday Dance");
    expect(output.classes[0]?.startDate).toBe("2026-03-16");
    expect(output.classes[0]?.endDate).toBe("2026-03-16");
  });

  it("parses Luminous events from Dandelion ICS feed", async () => {
    fetchHtml
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("dandelion-luminous.ics"));
    const { scrapeEcstaticDanceLondon } = await import("../../scripts/scrape/adapters/ecstatic-dance-london");
    const output = await scrapeEcstaticDanceLondon();
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toContain("Luminous New Moon Monday Dance x FX10K");
    expect(output.classes.some((item) => item.bookingUrl.includes("dandelion.events/events/6985e5beb0c9d9576952ec22"))).toBe(true);
  });

  it("parses Five Rhythms London adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("five-rhythms.html"));
    const { scrapeFiveRhythmsLondon } = await import("../../scripts/scrape/adapters/five-rhythms-london");
    const output = await scrapeFiveRhythmsLondon();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Five Rhythms London");
  });

  it("parses SuperMario Salsa adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("supermario-schedule.html"));
    const { scrapeSuperMarioSalsa } = await import("../../scripts/scrape/adapters/supermario-salsa");
    const output = await scrapeSuperMarioSalsa();
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.dayOfWeek)).toContain("Monday");
    expect(output.classes.map((item) => item.dayOfWeek)).toContain("Tuesday");
  });

  it("parses Salsa Rueda (Rueda Libre) adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("rueda-libre.ics"));
    const { scrapeSalsaRuedaRuedaLibre } = await import("../../scripts/scrape/adapters/salsa-rueda-rueda-libre");
    const output = await scrapeSalsaRuedaRuedaLibre();
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toContain("Rueda Libre Wednesday");
  });

  it("parses Cubaneando adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("rueda-libre.ics"));
    const { scrapeCubaneando } = await import("../../scripts/scrape/adapters/cubaneando");
    const output = await scrapeCubaneando();
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toContain("Cubaneando");
  });

  it("parses Butoh Mutation adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("butoh-mutation.html"));
    const { scrapeButohMutation } = await import("../../scripts/scrape/adapters/butoh-mutation");
    const output = await scrapeButohMutation();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Butoh Mutation");
  });

  it("parses Posthuman Theatre Butoh adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("posthuman-butoh.html"));
    const { scrapePosthumanTheatreButoh } = await import("../../scripts/scrape/adapters/posthuman-theatre-butoh");
    const output = await scrapePosthumanTheatreButoh();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Posthuman Theatre Butoh");
  });

  it("parses Hackney Baths adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("hackney-baths.html"));
    const { scrapeHackneyBaths } = await import("../../scripts/scrape/adapters/hackney-baths");
    const output = await scrapeHackneyBaths();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Hackney Baths");
  });

  it("parses Wednesday Moving adapter", async () => {
    fetchHtml.mockResolvedValueOnce(fixture("wednesday-moving-home.html")).mockResolvedValueOnce(fixture("wednesday-moving.csv"));
    const { scrapeWednesdayMoving } = await import("../../scripts/scrape/adapters/wednesday-moving");
    const output = await scrapeWednesdayMoving();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBe(2);
    expect(output.classes[0]?.venue).toBe("Wednesday Moving");
    expect(output.classes[0]?.dayOfWeek).toBe("Wednesday");
  });

  it("handles malformed HTML gracefully", async () => {
    fetchHtml.mockResolvedValue(fixture("malformed.html"));
    const { scrapeThePlace } = await import("../../scripts/scrape/adapters/the-place");
    const output = await scrapeThePlace();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(0);
  });
});
