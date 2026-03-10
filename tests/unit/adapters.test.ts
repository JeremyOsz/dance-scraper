import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VENUES } from "@/lib/venues";

const fetchHtml = vi.fn();
const fetchJson = vi.fn();

vi.mock("../../scripts/scrape/adapters/common", async () => {
  const actual = await vi.importActual<object>("../../scripts/scrape/adapters/common");
  return {
    ...actual,
    fetchHtml,
    fetchJson
  };
});

function fixture(name: string) {
  return fs.readFileSync(path.join(process.cwd(), "tests/unit/fixtures", name), "utf8");
}

const testedVenueKeys = [
  "thePlace",
  "rambert",
  "siobhanDavies",
  "tripSpace",
  "chisenhaleDanceSpace",
  "ciCalendarLondon",
  "bachataCommunity",
  "ecstaticDanceLondon",
  "luminousDance",
  "fiveRhythmsLondon",
  "superMarioSalsa",
  "salsaRuedaRuedaLibre",
  "cubaneando",
  "butohMutation",
  "posthumanTheatreButoh",
  "hackneyBaths",
  "wednesdayMoving",
  "danceworks",
  "pineappleDanceStudios",
  "baseDanceStudios",
  "salsaSoho",
  "barSalsaTemple",
  "mamboCity",
  "cityAcademy",
  "adrianOutsavvy",
  "lookAtMovement",
  "theManorMvmt",
  "eastLondonDance",
  "conTumbaoSalsa"
] as const;

const ecstaticOrganizerUrls = [
  "https://www.eventbrite.com/o/73047023743",
  "https://www.eventbrite.com/o/8588572090",
  "https://www.eventbrite.com/o/18505959226",
  "https://www.eventbrite.co.uk/o/ecstatic-dance-uk-17916431216"
] as const;

function organizerFixture(title: string, url: string, start: string) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@type": "ItemList",
    itemListElement: [
      {
        position: 1,
        item: {
          "@type": "Event",
          name: title,
          startDate: start,
          endDate: start,
          description: "Conscious dance event in London",
          url
        }
      }
    ]
  })}</script>`;
}

describe("scraper adapters", () => {
  beforeEach(() => {
    fetchHtml.mockReset();
    fetchJson.mockReset();
  });

  it("keeps adapter tests aligned with every supported venue", () => {
    expect([...testedVenueKeys].sort()).toEqual(Object.keys(VENUES).sort());
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

  it("parses Rambert Momence schedule sessions when host widget is present", async () => {
    fetchHtml
      .mockResolvedValueOnce(
        `<section><script host_id="48546" src="https://momence.com/plugin/host-schedule/host-schedule.js"></script></section>`
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          payload: [
            {
              sessionName: "Professional Class",
              level: "Open-level professional morning class",
              startsAt: "2026-03-11T08:00:00.000Z",
              endsAt: "2026-03-11T09:30:00.000Z",
              link: "https://momence.com/s/129355302"
            }
          ],
          pagination: {
            pageSize: 100,
            totalCount: 1
          }
        })
      );
    const { scrapeRambert } = await import("../../scripts/scrape/adapters/rambert");
    const output = await scrapeRambert();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.title).toBe("Professional Class");
    expect(output.classes[0]?.dayOfWeek).toBe("Wednesday");
    expect(output.classes[0]?.time).toBe("08:00 - 09:30");
    expect(output.classes[0]?.startDate).toBe("2026-03-11");
    expect(output.classes[0]?.bookingUrl).toBe("https://momence.com/s/129355302");
  });

  it("parses Siobhan Davies adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("siobhan.html"));
    const { scrapeSiobhanDavies } = await import("../../scripts/scrape/adapters/siobhan-davies");
    const output = await scrapeSiobhanDavies();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.dayOfWeek).toBe("Wednesday");
  });

  it("expands Siobhan 'Weekdays' sections into Monday-Friday", async () => {
    fetchHtml.mockResolvedValue(`
      <div class="entry-content">
        <h3>Weekdays</h3>
        <div>
          <h4>MORNING CLASS</h4>
          <p>Open to experienced movement practitioners.</p>
          <h3>From 28 Apr<br>10am – 12noon</h3>
          <a href="https://bookwhen.com/independentdance">Book now</a>
        </div>
      </div>
    `);
    const { scrapeSiobhanDavies } = await import("../../scripts/scrape/adapters/siobhan-davies");
    const output = await scrapeSiobhanDavies();
    const mornings = output.classes.filter((item) => item.title === "MORNING CLASS");
    expect(output.ok).toBe(true);
    expect(mornings).toHaveLength(5);
    expect(mornings.map((item) => item.dayOfWeek)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    expect(mornings.every((item) => item.time?.includes("10am"))).toBe(true);
    expect(mornings.every((item) => item.time?.includes("12"))).toBe(true);
  });

  it("parses TripSpace adapter from Momence host schedule sessions", async () => {
    fetchHtml
      .mockResolvedValueOnce(
        `<section><script host_id="43797" src="https://momence.com/plugin/host-schedule/host-schedule.js"></script></section>`
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          payload: [
            {
              sessionName: "Open Improvisation",
              level: "All levels",
              startsAt: "2026-03-12T18:30:00.000Z",
              endsAt: "2026-03-12T20:00:00.000Z",
              link: "https://momence.com/s/11111111"
            }
          ],
          pagination: {
            pageSize: 100,
            totalCount: 1
          }
        })
      );
    const { scrapeTripSpace } = await import("../../scripts/scrape/adapters/trip-space");
    const output = await scrapeTripSpace();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.title).toBe("Open Improvisation");
    expect(output.classes[0]?.dayOfWeek).toBe("Thursday");
    expect(output.classes[0]?.time).toBe("18:30 - 20:00");
    expect(output.classes[0]?.startDate).toBe("2026-03-12");
    expect(output.classes[0]?.bookingUrl).toBe("https://momence.com/s/11111111");
    expect(output.classes[0]?.sourceUrl).toBe("https://momence.com/u/tripspace-bKDjuG");
    expect(output.classes[0]?.venue).toBe("TripSpace");
  });

  it("uses default TripSpace Momence host id when embed host_id is missing", async () => {
    fetchHtml
      .mockResolvedValueOnce(`<section><script src="https://momence.com/plugin/host-schedule/host-schedule.js"></script></section>`)
      .mockResolvedValueOnce(
        JSON.stringify({
          payload: [
            {
              sessionName: "Expressive Body Workshop",
              level: "Movement workshop",
              startsAt: "2026-03-15T11:00:00.000Z",
              endsAt: "2026-03-15T13:00:00.000Z",
              link: "https://momence.com/s/22222222"
            }
          ],
          pagination: {
            pageSize: 100,
            totalCount: 1
          }
        })
      );
    const { scrapeTripSpace } = await import("../../scripts/scrape/adapters/trip-space");
    const output = await scrapeTripSpace();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.title).toBe("Expressive Body Workshop");
    expect(fetchHtml).toHaveBeenCalledWith(
      "https://readonly-api.momence.com/host-plugins/host/43797/host-schedule/sessions?pageSize=100&page=0"
    );
  });

  it("falls back to TripSpace dance page parsing when Momence schedule is not present", async () => {
    fetchHtml
      .mockResolvedValueOnce(`<section><h1>Schedule and bookings</h1></section>`)
      .mockRejectedValueOnce(new Error("momence unavailable"))
      .mockResolvedValueOnce(fixture("tripspace.html"));
    const { scrapeTripSpace } = await import("../../scripts/scrape/adapters/trip-space");
    const output = await scrapeTripSpace();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("TripSpace");
  });

  it("parses Chisenhale adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("chisenhale.html"));
    const { scrapeChisenhale } = await import("../../scripts/scrape/adapters/chisenhale");
    const output = await scrapeChisenhale();
    const mondayClass = output.classes.find((item) => item.title === "Monday Night Improvisation");
    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toContain("Monday Night Improvisation");
    expect(output.classes.map((item) => item.title)).not.toContain("About");
    expect(output.classes.map((item) => item.title)).not.toContain("Rise Up (6-7 Years)");
    expect(mondayClass?.startDate).toBe("2026-01-12");
    expect(mondayClass?.endDate).toBe("2026-07-06");
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
    expect(output.classes).toHaveLength(0);
  });

  it("parses Luminous events from Dandelion ICS feed", async () => {
    fetchHtml
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer.html"))
      .mockResolvedValueOnce(fixture("dandelion-luminous.ics"));
    const { scrapeLuminousDance } = await import("../../scripts/scrape/adapters/luminous-dance");
    const output = await scrapeLuminousDance();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Luminous Dance");
    expect(output.classes.map((item) => item.title)).toContain("Luminous New Moon Monday Dance x FX10K");
    expect(output.classes.some((item) => item.bookingUrl.includes("dandelion.events/events/6985e5beb0c9d9576952ec22"))).toBe(true);
  });

  it("parses Luminous events from Eventbrite organizer graph", async () => {
    fetchHtml
      .mockResolvedValueOnce(fixture("eventbrite-organizer-graph.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer-graph.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer-graph.html"))
      .mockResolvedValueOnce(fixture("eventbrite-organizer-graph.html"))
      .mockResolvedValueOnce("BEGIN:VCALENDAR\nEND:VCALENDAR");
    const { scrapeLuminousDance } = await import("../../scripts/scrape/adapters/luminous-dance");
    const output = await scrapeLuminousDance();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Luminous Dance");
    expect(output.classes.map((item) => item.title)).toContain("Luminous New Moon Monday Dance");
  });

  it("queries each Ecstatic Dance organiser and keeps per-organiser events", async () => {
    fetchHtml
      .mockResolvedValueOnce(
        organizerFixture(
          "Ecstatic Dance London Session",
          "https://www.eventbrite.com/e/example-ecstatic",
          "2026-03-21T18:00:00+0000"
        )
      )
      .mockResolvedValueOnce(
        organizerFixture(
          "Luminous New Moon Monday Dance",
          "https://www.eventbrite.com/e/luminous-new-moon-monday-dance",
          "2026-03-16T18:30:00+0000"
        )
      )
      .mockResolvedValueOnce(
        organizerFixture(
          "Conscious Dance Community Night",
          "https://www.eventbrite.com/e/conscious-dance-community-night",
          "2026-03-28T19:00:00+0000"
        )
      )
      .mockResolvedValueOnce(
        organizerFixture(
          "Ecstatic Dance UK - London Gathering",
          "https://www.eventbrite.co.uk/e/ecstatic-dance-uk-london-gathering",
          "2026-03-30T19:00:00+0000"
        )
      )
      .mockResolvedValueOnce("BEGIN:VCALENDAR\nEND:VCALENDAR");

    const { scrapeEcstaticDanceLondon } = await import("../../scripts/scrape/adapters/ecstatic-dance-london");
    const output = await scrapeEcstaticDanceLondon();

    expect(output.ok).toBe(true);
    expect(output.classes.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Ecstatic Dance London Session",
        "Conscious Dance Community Night",
        "Ecstatic Dance UK - London Gathering"
      ])
    );
    expect(output.classes.map((item) => item.title)).not.toContain("Luminous New Moon Monday Dance");
    expect(output.classes.map((item) => item.sourceUrl)).toEqual(
      expect.arrayContaining([
        "https://www.eventbrite.com/o/73047023743",
        "https://www.eventbrite.com/o/18505959226",
        "https://www.eventbrite.co.uk/o/ecstatic-dance-uk-17916431216"
      ])
    );

    const userAgentHeaders = expect.objectContaining({
      "User-Agent": expect.stringContaining("Mozilla/5.0")
    });

    for (const [index, organizerUrl] of ecstaticOrganizerUrls.entries()) {
      expect(fetchHtml).toHaveBeenNthCalledWith(index + 1, organizerUrl, userAgentHeaders);
    }
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
    fetchHtml
      .mockResolvedValueOnce(fixture("butoh-mutation.html"))
      .mockResolvedValueOnce(fixture("butoh-mutation-tickettailor.html"));
    const { scrapeButohMutation } = await import("../../scripts/scrape/adapters/butoh-mutation");
    const output = await scrapeButohMutation();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("Butoh Mutation");
    expect(output.classes.map((item) => item.startDate)).toContain("2026-03-15");
    expect(output.classes.map((item) => item.startDate)).toContain("2026-07-05");
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

  it("parses Danceworks adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeDanceworks } = await import("../../scripts/scrape/adapters/danceworks");
    const output = await scrapeDanceworks();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Danceworks");
  });

  it("parses Pineapple Dance Studios adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapePineappleDanceStudios } = await import("../../scripts/scrape/adapters/pineapple-dance-studios");
    const output = await scrapePineappleDanceStudios();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Pineapple Dance Studios");
  });

  it("parses BASE Dance Studios adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeBaseDanceStudios } = await import("../../scripts/scrape/adapters/base-dance-studios");
    const output = await scrapeBaseDanceStudios();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("BASE Dance Studios");
  });

  it("parses Salsa! Soho adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeSalsaSoho } = await import("../../scripts/scrape/adapters/salsa-soho");
    const output = await scrapeSalsaSoho();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Salsa! Soho");
  });

  it("parses Bar Salsa Temple adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeBarSalsaTemple } = await import("../../scripts/scrape/adapters/bar-salsa-temple");
    const output = await scrapeBarSalsaTemple();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Bar Salsa Temple");
  });

  it("parses MamboCity adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeMamboCity } = await import("../../scripts/scrape/adapters/mambo-city");
    const output = await scrapeMamboCity();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("MamboCity");
  });

  it("parses City Academy adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeCityAcademy } = await import("../../scripts/scrape/adapters/city-academy");
    const output = await scrapeCityAcademy();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("City Academy");
  });

  it("ignores City Academy marketing tiles without schedule metadata", async () => {
    fetchHtml.mockResolvedValue(fixture("city-academy-no-schedule.html"));
    const { scrapeCityAcademy } = await import("../../scripts/scrape/adapters/city-academy");
    const output = await scrapeCityAcademy();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(0);
  });

  it("parses Adrian Outsavvy adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("adrian-outsavvy.html"));
    const { scrapeAdrianOutsavvy } = await import("../../scripts/scrape/adapters/adrian-outsavvy");
    const output = await scrapeAdrianOutsavvy();
    expect(output.ok).toBe(true);
    expect(output.classes[0]?.venue).toBe("StreamMovement");
    expect(output.classes[0]?.title).toContain("Dance");
    expect(output.classes[0]?.dayOfWeek).toBe("Sunday");
    expect(output.classes[0]?.startDate).toBe("2026-04-12");
  });

  it("parses Look At Movement adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeLookAtMovement } = await import("../../scripts/scrape/adapters/look-at-movement");
    const output = await scrapeLookAtMovement();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Look At Movement");
  });

  it("parses The Manor / MVMT adapter", async () => {
    fetchJson.mockResolvedValue(JSON.parse(fixture("manor-mvmt-booking-sessions.json")));
    const { scrapeTheManorMvmt } = await import("../../scripts/scrape/adapters/the-manor-mvmt");
    const output = await scrapeTheManorMvmt();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("The Manor / MVMT");
    expect(output.classes[0]?.bookingUrl).toContain("/mvmt");
  });

  it("returns empty class list when The Manor / MVMT has no upcoming sessions", async () => {
    fetchJson.mockResolvedValue({
      "2026-03-10": [],
      "2026-03-11": []
    });
    const { scrapeTheManorMvmt } = await import("../../scripts/scrape/adapters/the-manor-mvmt");
    const output = await scrapeTheManorMvmt();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(0);
  });

  it("parses East London Dance adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeEastLondonDance } = await import("../../scripts/scrape/adapters/east-london-dance");
    const output = await scrapeEastLondonDance();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("East London Dance");
  });

  it("parses Con Tumbao Salsa adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("contumbao.html"));
    const { scrapeConTumbaoSalsa } = await import("../../scripts/scrape/adapters/con-tumbao-salsa");
    const output = await scrapeConTumbaoSalsa();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(2);
    expect(output.classes.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Salsa on2 Groove & Technique", "Salsa musicality jam"])
    );
    expect(output.classes.every((item) => item.dayOfWeek === "Tuesday")).toBe(true);
    expect(output.classes.some((item) => item.bookingUrl.includes("buy.stripe.com"))).toBe(true);
  });

  it("handles malformed HTML gracefully", async () => {
    fetchHtml.mockResolvedValue(fixture("malformed.html"));
    const { scrapeThePlace } = await import("../../scripts/scrape/adapters/the-place");
    const output = await scrapeThePlace();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(0);
  });
});
