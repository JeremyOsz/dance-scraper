import { describe, expect, it } from "vitest";
import { DANCE_STYLE_GROUPS, DANCE_STYLES } from "../../lib/dance-types";
import {
  DANCE_STYLE_GUIDES,
  getDanceStyleGuideBySlug,
  getDanceStyleGuides,
  getStyleCalendarHref
} from "../../lib/style-guides";

const guideableStyles = DANCE_STYLES.filter((style) => style !== "Other");
const validRatings = new Set(["low", "medium", "high"]);
const ratingKeys = [
  "technique",
  "partnering",
  "intensity",
  "beginnerFriendliness",
  "mobilityAdaptability",
  "rhythmEmphasis"
] as const;

describe("dance style guides", () => {
  it("contains exactly one complete guide for every named canonical style", () => {
    const guides = getDanceStyleGuides();

    expect(guides).toHaveLength(guideableStyles.length);
    expect(new Set(guides.map((guide) => guide.style))).toEqual(new Set(guideableStyles));
    expect(Object.keys(DANCE_STYLE_GUIDES)).toHaveLength(guideableStyles.length);
  });

  it("uses unique stable slugs and valid canonical groups", () => {
    const guides = getDanceStyleGuides();
    const validGroups = new Set(DANCE_STYLE_GROUPS.map((group) => group.label));

    expect(new Set(guides.map((guide) => guide.slug)).size).toBe(guides.length);
    for (const guide of guides) {
      expect(guide.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(validGroups.has(guide.group)).toBe(true);
      expect(DANCE_STYLE_GROUPS.find((group) => group.label === guide.group)?.styles).toContain(guide.style as never);
    }
  });

  it("provides copy, six valid ratings, and authoritative further reading", () => {
    for (const guide of getDanceStyleGuides()) {
      expect(guide.overview.length).toBeGreaterThan(35);
      expect(guide.history.length).toBeGreaterThan(80);
      expect(guide.whatToExpect.length).toBeGreaterThan(60);
      expect(guide.accessGuidance.length).toBeGreaterThan(60);

      for (const key of ratingKeys) {
        expect(validRatings.has(guide.ratings[key])).toBe(true);
      }

      expect(guide.sources.length).toBeGreaterThanOrEqual(2);
      expect(guide.sources.length).toBeLessThanOrEqual(4);
      for (const source of guide.sources) {
        expect(source.label.trim().length).toBeGreaterThan(2);
        expect(() => new URL(source.url)).not.toThrow();
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("looks up guides by slug and builds an exact canonical calendar filter", () => {
    expect(getDanceStyleGuideBySlug("argentine-tango")?.style).toBe("Argentine Tango");
    expect(getDanceStyleGuideBySlug("not-a-style")).toBeUndefined();
    expect(getStyleCalendarHref("Ballroom & Latin")).toBe("/?style=Ballroom%20%26%20Latin");
  });
});
