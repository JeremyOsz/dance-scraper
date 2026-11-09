import { beforeEach, describe, expect, it, vi } from "vitest";
const { fetchHtml, fetchJson } = vi.hoisted(() => ({ fetchHtml: vi.fn(), fetchJson: vi.fn() }));
vi.mock("../../scripts/scrape/adapters/common", async (original) => ({
  ...await original<object>(), fetchHtml, fetchJson
}));
import { scrapeThePlace } from "../../scripts/scrape/adapters/the-place";

beforeEach(() => vi.resetAllMocks());

describe("The Place booking feed fallback", () => {
  it("keeps bookable adult sessions when the website blocks the crawler", async () => {
    fetchHtml.mockRejectedValue(new Error("Request failed with status code 403"));
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("/instances?")) return [
        { id: "session", start: "2099-07-10T18:30:00", startUtc: "2099-07-10T17:30:00Z", isOnSale: true, cancelled: false },
        { id: "cancelled", start: "2099-07-11T18:30:00", startUtc: "2099-07-11T17:30:00Z", isOnSale: true, cancelled: true },
        { id: "past", start: "2020-01-01T18:30:00", startUtc: "2020-01-01T18:30:00Z", isOnSale: false, cancelled: false }
      ];
      return [
        { id: "adult", name: "C&C 2099-00 Ballet Improvers (Drop in) Teacher", duration: 90, attribute_Type: "C&C Adult Fees", attribute_WebsiteListing: "Class" },
        { id: "kids", name: "Creative Dance for Ages 3-5", duration: 60, attribute_Type: "CYD Fees", attribute_WebsiteListing: "Class" },
        { id: "show", name: "Evening performance", duration: 90, attribute_Type: "Theatre Programme", attribute_WebsiteListing: "Performance" }
      ];
    });
    const result = await scrapeThePlace();
    expect(result.ok).toBe(true);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0]).toMatchObject({ title: "Ballet Improvers (Drop in) Teacher", startDate: "2099-07-10", time: "18:30 - 20:00", isCourse: false });
    expect(result.classes[0].bookingUrl).toContain("EventInstanceId=session");
  });

  it("reports failure if neither source supplies a programme", async () => {
    fetchHtml.mockRejectedValue(new Error("Request failed with status code 403"));
    fetchJson.mockResolvedValue([]);
    expect(await scrapeThePlace()).toMatchObject({ ok: false, classes: [] });
  });

  it("rejects a successful HTTP response that contains only a firewall challenge", async () => {
    fetchHtml.mockResolvedValue("<html><title>Just a moment...</title></html>");
    fetchJson.mockRejectedValue(new Error("Booking feed unavailable"));
    expect(await scrapeThePlace()).toMatchObject({ ok: false, classes: [] });
  });
});
