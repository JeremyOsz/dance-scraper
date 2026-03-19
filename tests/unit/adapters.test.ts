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

vi.mock("playwright", () => {
  const mockFrame = {
    waitForSelector: vi.fn(async () => {}),
    evaluate: vi.fn(async () => [
      {
        time: "7:00pm",
        teacher: "Teacher",
        className: "Example Class",
        level: "Open",
        studio: "Studio 1",
        price: "Free"
      }
    ])
  };

  const mockIframeHandle = {
    contentFrame: vi.fn(() => mockFrame)
  };

  const mockPage = {
    goto: vi.fn(async () => {}),
    waitForSelector: vi.fn(async () => {}),
    locator: vi.fn(() => ({
      first: () => ({
        elementHandle: vi.fn(async () => mockIframeHandle)
      })
    })),
    waitForTimeout: vi.fn(async () => {}),
    frames: vi.fn(() => [])
  };

  const mockBrowser = {
    newPage: vi.fn(async () => mockPage),
    close: vi.fn(async () => {})
  };

  return {
    chromium: {
      launch: vi.fn(async () => mockBrowser)
    }
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
  "marinaSfyridi",
  "lookAtMovement",
  "theManorMvmt",
  "eastLondonDance",
  "conTumbaoSalsa",
  "underTheSunDance",
  "balletForYou",
  "fieldworksDance"
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
    expect(output.classes[0]?.venue).toBe("Butoh Mutations");
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
    fetchHtml.mockResolvedValue(`
      <div>
        <healcode-widget data-type="schedules" data-widget-id="2314186103cf"></healcode-widget>
      </div>
    `);
    fetchJson.mockResolvedValue({
      class_sessions: `
        <div class="bw-widget__day">
          <div class="bw-widget__date date-2026-03-12">Thursday, March 12</div>
          <div class="bw-session">
            <div class="bw-session__name">Classical Ballet - Dmitri Gruzdev - GEN - £13</div>
            <div class="bw-session__staff">Dmitri Gruzdev</div>
            <div class="bw-session__level">General</div>
            <div class="bw-session__room"><span>Room:</span>Studio 2</div>
            <div class="bw-session__location">Danceworks</div>
            <div class="bw-session__description"><div>Technique focused ballet class.</div></div>
            <time class="hc_starttime" datetime="2026-03-12T10:00">10:00</time>
            <time class="hc_endtime" datetime="2026-03-12T11:30">11:30</time>
            <button class="bw-widget__cta" data-url="https://cart.mindbodyonline.com/sites/96024/cart/add_booking?item%5Bmbo_id%5D=93935">
              Book
            </button>
          </div>
        </div>
      `
    });
    const { scrapeDanceworks } = await import("../../scripts/scrape/adapters/danceworks");
    const output = await scrapeDanceworks();
    expect(output.ok).toBe(true);
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("/widgets/schedules/2314186103cf/load_markup?"));
    expect(output.classes.length).toBe(1);
    expect(output.classes[0]?.venue).toBe("Danceworks");
    expect(output.classes[0]?.title).toContain("Classical Ballet");
    expect(output.classes[0]?.dayOfWeek).toBe("Thursday");
    expect(output.classes[0]?.time).toBe("10:00 - 11:30");
    expect(output.classes[0]?.startDate).toBe("2026-03-12");
  });

  it("parses Pineapple Dance Studios adapter", async () => {
    fetchHtml.mockResolvedValue(`
      <div>
        <healcode-widget data-type="schedules" data-widget-id="4a14005545cf"></healcode-widget>
      </div>
    `);
    fetchJson.mockResolvedValue({
      class_sessions: `
        <div class="bw-widget__day">
          <div class="bw-widget__date date-2026-03-12">Thursday, March 12</div>
          <div class="bw-session">
            <div class="bw-session__name">Ballet (Beg) £12 Christina</div>
            <div class="bw-session__staff">Christina Mittelmaier</div>
            <div class="bw-session__level">Beg</div>
            <div class="bw-session__room"><span>Room:</span>Studio 11</div>
            <div class="bw-session__location">In Studio Classes</div>
            <div class="bw-session__description"><div>Intro ballet class for adults.</div></div>
            <time class="hc_starttime" datetime="2026-03-12T10:15">10:15</time>
            <time class="hc_endtime" datetime="2026-03-12T11:45">11:45</time>
            <button class="bw-widget__cta" data-url="https://cart.mindbodyonline.com/sites/94863/cart/add_booking?item%5Bmbo_id%5D=717323">
              Book
            </button>
          </div>
        </div>
      `
    });
    const { scrapePineappleDanceStudios } = await import("../../scripts/scrape/adapters/pineapple-dance-studios");
    const output = await scrapePineappleDanceStudios();
    expect(output.ok).toBe(true);
    expect(fetchJson).toHaveBeenCalledWith(expect.stringContaining("/widgets/schedules/4a14005545cf/load_markup?"));
    expect(output.classes.length).toBe(1);
    expect(output.classes[0]?.venue).toBe("Pineapple Dance Studios");
    expect(output.classes[0]?.title).toContain("Ballet");
    expect(output.classes[0]?.dayOfWeek).toBe("Thursday");
    expect(output.classes[0]?.time).toBe("10:15 - 11:45");
    expect(output.classes[0]?.startDate).toBe("2026-03-12");
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

  it("parses Marina Sfyridi Eventbrite adapter", async () => {
    fetchHtml.mockResolvedValue(`
      <html>
        <head>
          <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Event",
                  name: "Circadian Bodies - March Dance Classes",
                  description: "Monthly movement and dance classes in London.",
                  startDate: "2026-03-22T10:30:00+00:00",
                  endDate: "2026-03-22T12:00:00+00:00",
                  url: "https://www.eventbrite.co.uk/e/circadian-bodies-march-dance-classes-tickets-1984132482667"
                }
              ]
            })}
          </script>
        </head>
      </html>
    `);
    const { scrapeMarinaSfyridi } = await import("../../scripts/scrape/adapters/marina-sfyridi");
    const output = await scrapeMarinaSfyridi();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(1);
    expect(output.classes[0]?.venue).toBe("Marina Sfyridi");
    expect(output.classes[0]?.title).toContain("Circadian Bodies");
    expect(output.classes[0]?.dayOfWeek).toBe("Sunday");
    expect(output.classes[0]?.time).toBe("10:30 - 12:00");
    expect(output.classes[0]?.startDate).toBe("2026-03-22");
  });

  it("parses Marina Sfyridi Eventbrite EducationEvent schema", async () => {
    fetchHtml.mockResolvedValue(`
      <html>
        <head>
          <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationEvent",
              name: "Circadian Bodies March Dance Classes",
              description: "In person dance classes",
              startDate: "2026-03-05T18:00:00Z",
              endDate: "2026-03-26T20:30:00Z",
              url: "https://www.eventbrite.co.uk/e/circadian-bodies-march-dance-classes-tickets-1984132482667"
            })}
          </script>
        </head>
      </html>
    `);
    const { scrapeMarinaSfyridi } = await import("../../scripts/scrape/adapters/marina-sfyridi");
    const output = await scrapeMarinaSfyridi();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(1);
    expect(output.classes[0]?.venue).toBe("Marina Sfyridi");
    expect(output.classes[0]?.dayOfWeek).toBe("Thursday");
    expect(output.classes[0]?.time).toBe("18:00 - 20:30");
    expect(output.classes[0]?.startDate).toBe("2026-03-05");
    expect(output.classes[0]?.endDate).toBe("2026-03-26");
  });

  it("parses Look At Movement adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeLookAtMovement } = await import("../../scripts/scrape/adapters/look-at-movement");
    const output = await scrapeLookAtMovement();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Look At Movement (Tanztheatre)");
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
    const escapedSessionData = JSON.stringify({ access_token: "test-teamup-token" }).replace(/"/g, "\\u0022");
    fetchHtml.mockResolvedValue(`
      <html>
        <body>
          <script>
            window.TEAMUP_USER_SESSION_DATA = JSON.parse("${escapedSessionData}");
          </script>
        </body>
      </html>
    `);
    fetchJson.mockResolvedValue({
      next: null,
      results: [
        {
          name: "Popping",
          description: "<p>Mondays, 7pm - 8:20pm - Beginner Level</p>",
          starts_at: "2026-03-23T19:00:00+00:00",
          ends_at: "2026-03-23T20:20:00+00:00",
          customer_url: "/p/5799650-east-london-dance/e/57985420-popping/",
          venue: 43266,
          status: "active"
        }
      ]
    });
    const { scrapeEastLondonDance } = await import("../../scripts/scrape/adapters/east-london-dance");
    const output = await scrapeEastLondonDance();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("East London Dance");
    expect(output.classes[0]?.time).toBe("7pm - 8:20pm");
    expect(output.classes[0]?.bookingUrl).toContain("/p/5799650-east-london-dance/e/");
  });

  it("parses Under the Sun Dance adapter", async () => {
    fetchHtml.mockResolvedValue(fixture("generic-venue-schedule.html"));
    const { scrapeUnderTheSunDance } = await import("../../scripts/scrape/adapters/under-the-sun-dance");
    const output = await scrapeUnderTheSunDance();
    expect(output.ok).toBe(true);
    expect(output.classes.length).toBeGreaterThan(0);
    expect(output.classes[0]?.venue).toBe("Under the Sun Dance");
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

  it("parses Ballet for You adapter", async () => {
    fetchHtml
      .mockResolvedValueOnce(`
      <html>
        <body>
          <div id="mainNavWrapper">
            <div class="folder">
              <div class="folder-toggle">Beginners</div>
              <div class="subnav">
                <a href="/level-1">Level 1</a>
              </div>
            </div>
            <div class="folder">
              <div class="folder-toggle">Special Courses</div>
              <div class="subnav">
                <a href="/ballet-floor-barre">Ballet Floor-barre</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
      .mockResolvedValueOnce(`
      <html>
        <head>
          <meta property="og:title" content="Level 1 — Ballet for You" />
        </head>
        <body>
          <div class="sqs-code-container"><div class="boxed"><h1>Beginners Level 1 Ballet</h1></div></div>
          <div class="sqs-html-content">
            <p><strong>Day:</strong> Thursdays <strong>Time:</strong> 6.30-7.30pm <strong>Place:</strong> New City Fitness <strong>Dates:</strong> 15th January - 26th March 2026</p>
            <a href="/enrol-now">Click here to enrol</a>
          </div>
        </body>
      </html>
    `)
      .mockResolvedValueOnce(`
      <html>
        <head>
          <meta property="og:title" content="Ballet Floor-Barre — Ballet for You" />
        </head>
        <body>
          <div class="sqs-code-container"><div class="boxed"><h1>Ballet Floor-barre with PBT</h1></div></div>
          <div class="sqs-html-content">
            <h1>Saturdays</h1>
            <p><strong>Day:</strong> Saturdays <strong>Time:</strong> 11.15am-12.25pm <strong>Place:</strong> New City Fitness <strong>Dates:</strong> 17th January - 28th March 2026</p>
            <a href="/enrol-now">Click here to enrol</a>
          </div>
        </body>
      </html>
    `);
    const { scrapeBalletForYou } = await import("../../scripts/scrape/adapters/ballet-for-you");
    const output = await scrapeBalletForYou();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(2);
    expect(output.classes[0]?.venue).toBe("Ballet for You");
    expect(output.classes[0]?.title).toContain("Beginners Level 1 Ballet");
    expect(output.classes[0]?.dayOfWeek).toBe("Thursdays");
    expect(output.classes[0]?.sourceUrl).toBe("https://www.balletforyou.co.uk/level-1");
    expect(output.classes[1]?.title).toContain("Ballet Floor-barre");
    expect(output.classes[1]?.dayOfWeek).toBe("Saturdays");
    expect(output.classes[1]?.sourceUrl).toBe("https://www.balletforyou.co.uk/ballet-floor-barre");
    expect(output.classes[0]?.bookingUrl).toBe("https://www.balletforyou.co.uk/enrol-now");
  });

  it("parses Fieldworks Dance adapter and keeps adult classes only", async () => {
    fetchHtml.mockResolvedValue(fixture("fieldworks-book-online.html"));
    const { scrapeFieldworksDance } = await import("../../scripts/scrape/adapters/fieldworks-dance");
    const output = await scrapeFieldworksDance();

    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(2);
    expect(output.classes.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Absolute Beginner Ballet", "Beginner Contemporary"])
    );
    expect(output.classes.some((item) => /tiny dancer|year olds/i.test(`${item.title} ${item.details ?? ""}`))).toBe(false);
    expect(output.classes[0]?.venue).toBe("Fieldworks Dance");
  });

  it("handles malformed HTML gracefully", async () => {
    fetchHtml.mockResolvedValue(fixture("malformed.html"));
    const { scrapeThePlace } = await import("../../scripts/scrape/adapters/the-place");
    const output = await scrapeThePlace();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(0);
  });
});
