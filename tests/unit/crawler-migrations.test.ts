import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchHtml, fetchJson } = vi.hoisted(() => ({ fetchHtml: vi.fn(), fetchJson: vi.fn() }));
vi.mock("../../scripts/scrape/adapters/common", async (original) => ({
  ...await original<object>(), fetchHtml, fetchJson
}));
import { scrapeBachataCommunity } from "../../scripts/scrape/adapters/bachata-community";
import { scrapeCityAcademy } from "../../scripts/scrape/adapters/city-academy";
const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "tests/fixtures/crawler-migrations", name), "utf8");

beforeEach(() => vi.resetAllMocks());
describe("current upstream calendar integrations", () => {
  it("uses Bachata's v2 RPC and keeps each recurring occurrence", async () => {
    fetchHtml.mockImplementation(async (url: string) => {
      if (!url.includes("/rpc/get_calendar_events_v2?")) throw new Error("Retired endpoint");
      return fixture("bachata-v2.json");
    });
    const result = await scrapeBachataCommunity();
    expect(result.ok).toBe(true);
    expect(result.classes).toHaveLength(2);
    expect(result.classes[0]).toMatchObject({ startDate: "2026-11-10", time: "19:30 - 22:45" });
  });
  it("reports Bachata RPC errors without hiding them behind dead WordPress requests", async () => {
    fetchHtml.mockRejectedValue(new Error("Supabase unavailable"));
    const result = await scrapeBachataCommunity();
    expect(result).toMatchObject({ ok: false, error: "Supabase unavailable" });
    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });
  it("accepts an empty Bachata calendar without requesting retired endpoints", async () => {
    fetchHtml.mockResolvedValue("[]");
    expect(await scrapeBachataCommunity()).toMatchObject({ ok: true, classes: [] });
    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });
  it("paginates City Academy's dance catalogue and parses server-rendered dated tables", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      expect(url).toContain("/wp-json/ca/v1/course-search?department=7&page=");
      return url.endsWith("page=1")
        ? { max_pages: 2, items: [{ title: "Absolute Beginners Ballet", permalink: "https://www.city-academy.com/absolute-beginners-ballet" }] }
        : { max_pages: 2, items: [{ title: "Ballet Taster", permalink: "https://www.city-academy.com/ballet-taster" }] };
    });
    fetchHtml.mockImplementation(async (url: string) => url.endsWith("ballet-taster") ? "<h1>Ballet Taster</h1>" : fixture("city-timetable.html"));
    const result = await scrapeCityAcademy();
    expect(result.ok).toBe(true);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(result.classes).toHaveLength(2);
    expect(result.classes[0]).toMatchObject({
      title: "Absolute Beginners Ballet", startDate: "2026-11-03", endDate: "2026-11-24",
      time: "18:00-19:15", dayOfWeek: "Tuesday", isCourse: true,
      bookingUrl: "https://www.city-academy.com/absolute-beginners-ballet"
    });
    expect(result.classes[0]?.details).toBe("Sylvia Young Theatre School • Tutor: Rowan Hicks • 4 weeks • £80.00");
  });
  it("fails City Academy when the catalogue response no longer has its expected shape", async () => {
    fetchJson.mockResolvedValue({ message: "Unavailable" });
    expect(await scrapeCityAcademy()).toMatchObject({ ok: false });
  });
});
