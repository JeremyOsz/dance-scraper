import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchHtml } from "../../scripts/scrape/adapters/common";
import { parseFiveRhythmsSearchHtml, scrapeFiveRhythmsLondon } from "../../scripts/scrape/adapters/five-rhythms-london";
import { parseHackneyBathsEventsHtml, scrapeHackneyBaths } from "../../scripts/scrape/adapters/hackney-baths";

vi.mock("../../scripts/scrape/adapters/common", () => ({ fetchHtml: vi.fn() }));
const fixture = (name: string) => readFileSync(`tests/unit/fixtures/${name}`, "utf8");
beforeEach(() => vi.resetAllMocks());

describe("official replacement programmes", () => {
  it("reads London weekly and dated classes from the official England community page", async () => {
    vi.mocked(fetchHtml).mockResolvedValue(fixture("five-rhythms-community.html"));
    const output = await scrapeFiveRhythmsLondon();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(20);
    expect(fetchHtml).toHaveBeenCalledWith("https://www.5rhythms.com/who-we-are/teacher-communities/europe/england/");
    expect(output.classes).toContainEqual(expect.objectContaining({title: "EMBODIMENT", dayOfWeek: "Monday", startDate: null}));
    expect(output.classes).toContainEqual(expect.objectContaining({title: "MOTION London", startDate: "2026-11-30", endDate: "2026-11-30", dayOfWeek: "Monday"}));
    expect(output.classes.every(row => !/online|1:1|onlilne/i.test(row.title))).toBe(true);
    expect(output.classes.some(row => row.title.includes("Oxford"))).toBe(false);
    expect(new Set(output.classes.map(row => row.bookingUrl)).size).toBe(output.classes.length);
  });

  it("extracts dated dance sessions and excludes concerts, art and breathwork", async () => {
    vi.mocked(fetchHtml).mockResolvedValue(fixture("eastway-baths-events.html"));
    const output = await scrapeHackneyBaths();
    expect(output.ok).toBe(true);
    expect(output.classes).toHaveLength(11);
    expect(fetchHtml).toHaveBeenCalledWith("https://www.eastwaybaths.co.uk/events");
    expect(output.classes).toContainEqual(expect.objectContaining({title: "Ecstatic Dance UK - SUN•DAY", startDate: "2026-11-08", endDate: "2026-11-08", dayOfWeek: "Sunday", time: "10:00 - 13:00", address: "80 Eastway", postcode: "E9 5JH"}));
    expect(output.classes).toContainEqual(expect.objectContaining({title: "Ecstatic Dance UK • The Evening Sessions", startDate: "2026-11-11", time: "18:30 - 21:30"}));
    expect(output.classes.some(row => /Giant Steps|Sicily|Breathwork|Choir/.test(row.title))).toBe(false);
    expect(output.classes.every(row => row.bookingUrl.startsWith("https://www.eventbrite.co.uk/"))).toBe(true);
  });

  it.each([scrapeFiveRhythmsLondon, scrapeHackneyBaths])("reports an unrecognised or missing programme as an error", async (scrape) => {
    vi.mocked(fetchHtml).mockResolvedValue("<html><h1>Welcome</h1></html>");
    const output = await scrape();
    expect(output.ok).toBe(false);
    expect(output.error).toMatch(/programme|listings/i);
  });

  it("does not assign a weekday to undated classes or infer weekly recurrence from a next-class date", () => {
    const rows = parseFiveRhythmsSearchHtml(`<div id="classesRight">
      <a href="/classes/undated">Undated dance</a> London <a href="/teachers/A">Teacher A</a><br>
      <a href="/classes/dated">Dated dance</a> Next Class 8 Nov 2026 London <a href="/teachers/B">Teacher B</a><br>
      <a href="/classes/other-city">Other city</a> Next Class 8 Nov 2026 Brighton <a href="/teachers/C">Teacher C</a><br>
    </div>`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({title: "Dated dance", startDate: "2026-11-08", endDate: "2026-11-08", dayOfWeek: "Sunday"});
  });

  it("rejects Baths cards without valid dates and removes duplicate event cards", () => {
    const card = `<div class="eb-event-card"><h3>Ecstatic Dance</h3><div class="eb-event-date">November 8, 2026</div><div class="eb-space-meta">10am to 1pm</div><a class="eb-event-tickets" href="/tickets">Tickets</a></div>`;
    const rows = parseHackneyBathsEventsHtml(card + card + card.replace("November 8, 2026", "Coming soon"));
    expect(rows).toHaveLength(1);
    expect(rows[0].bookingUrl).toBe("https://www.eastwaybaths.co.uk/tickets");
  });

  it.each([scrapeFiveRhythmsLondon, scrapeHackneyBaths])("preserves network failures as errors", async (scrape) => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("Connection timed out"));
    expect(await scrape()).toMatchObject({ok: false, classes: [], error: "Connection timed out"});
  });
});
