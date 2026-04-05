import { afterEach, describe, expect, it } from "vitest";
import type { DanceSession } from "../../lib/types";
import { FEATURED_RULES, isFeaturedSession, isFeaturedVenueName } from "../../lib/featured";

const defaultRules = FEATURED_RULES.map((rule) => ({ ...rule }));

const baseSession: DanceSession = {
  id: "session-1",
  venue: "The Place",
  title: "Adrian Flow",
  details: null,
  dayOfWeek: "Monday",
  startTime: "18:00",
  endTime: "19:00",
  startDate: null,
  endDate: null,
  timezone: "Europe/London",
  bookingUrl: "https://example.com/booking",
  sourceUrl: "https://example.com/source",
  tags: ["somatic"],
  audience: "adult",
  isWorkshop: false,
  lastSeenAt: "2026-03-24T00:00:00.000Z"
};

afterEach(() => {
  FEATURED_RULES.splice(0, FEATURED_RULES.length, ...defaultRules.map((rule) => ({ ...rule })));
});

describe("featured rules", () => {
  it("matches by venue key", () => {
    FEATURED_RULES.push({ venueKey: "thePlace" });

    expect(isFeaturedSession(baseSession)).toBe(true);
    expect(isFeaturedVenueName("The Place")).toBe(true);
  });

  it("matches by title and tag rules", () => {
    FEATURED_RULES.push({ titleContains: "adrian" });
    FEATURED_RULES.push({ tag: "somatic" });

    expect(isFeaturedSession(baseSession)).toBe(true);
  });

  it("requires all fields in a single rule to match", () => {
    FEATURED_RULES.push({ venueKey: "thePlace", tag: "not-present" });

    expect(isFeaturedSession(baseSession)).toBe(false);
  });

  it("features Luminous Dance by venue and Play and Expression Workshop by title", () => {
    const luminousSession: DanceSession = {
      ...baseSession,
      venue: "Luminous Dance",
      title: "Luminous New Moon Monday Dance"
    };
    const playSession: DanceSession = {
      ...baseSession,
      venue: "Rachel Mann & Marlon Who Henry",
      title: "Play and Expression Workshop"
    };

    expect(isFeaturedSession(luminousSession)).toBe(true);
    expect(isFeaturedVenueName("Luminous Dance")).toBe(true);
    expect(isFeaturedSession(playSession)).toBe(true);
  });
});
