import { describe, expect, it } from "vitest";
import {
  buildCanonicalRobots,
  buildMetaDescription,
  buildPageTitle,
  buildStudioSeoText,
  hasSearchParamValues,
  SITE_NAME
} from "../../lib/seo";

describe("seo helpers", () => {
  it("builds concise page titles that include the public product name", () => {
    const title = buildPageTitle("London Dance Classes & Workshops");

    expect(title).toContain("London Dance Classes");
    expect(title).toContain(SITE_NAME);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("builds bounded meta descriptions", () => {
    const description = buildMetaDescription(
      "Browse current adult dance and movement classes across London by date, style, level, and venue. Explore ballet, salsa, contemporary, contact improvisation, improv, workshops, and open classes from many London studios.",
      155
    );

    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).not.toMatch(/\s$/);
  });

  it("uses noindex for filtered or query-param calendar URLs while keeping the root indexable", () => {
    expect(buildCanonicalRobots({ isProduction: true, hasQuery: false })).toEqual({
      index: true,
      follow: true
    });
    expect(buildCanonicalRobots({ isProduction: true, hasQuery: true })).toEqual({
      index: false,
      follow: true
    });
  });

  it("detects meaningful search params from Next metadata inputs", () => {
    expect(hasSearchParamValues({})).toBe(false);
    expect(hasSearchParamValues({ mode: "calendar" })).toBe(true);
    expect(hasSearchParamValues({ venue: ["The Place", "Rambert"] })).toBe(true);
    expect(hasSearchParamValues({ empty: "" })).toBe(false);
  });

  it("generates unique concise studio metadata text", () => {
    const place = buildStudioSeoText({
      name: "The Place",
      classCount: 42,
      topTypes: ["Contemporary", "Ballet"],
      activeDays: ["Monday", "Tuesday"],
      ok: true
    });
    const rambert = buildStudioSeoText({
      name: "Rambert",
      classCount: 18,
      topTypes: ["Contemporary"],
      activeDays: ["Wednesday"],
      ok: true
    });

    expect(place.title).not.toEqual(rambert.title);
    expect(place.description).not.toEqual(rambert.description);
    expect(place.title.length).toBeLessThanOrEqual(60);
    expect(place.description.length).toBeLessThanOrEqual(155);
  });
});
