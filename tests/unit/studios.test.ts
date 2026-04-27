import { describe, expect, it } from "vitest";
import { getStudioBySlug, getStudioProfiles } from "../../lib/studios";
import type { ScrapeOutput } from "../../lib/types";

const sampleData: ScrapeOutput = {
  generatedAt: "2026-04-19T06:10:31.994Z",
  sessions: [
    {
      id: "rambert-1",
      venue: "Rambert",
      title: "Contemporary Technique",
      details: "Open-level class focused on floorwork and phrase material.",
      dayOfWeek: "Monday",
      startTime: "18:00",
      endTime: "19:30",
      startDate: null,
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/rambert-1",
      sourceUrl: "https://example.com/rambert",
      tags: ["contemporary"],
      audience: "adult",
      isWorkshop: false,
      lastSeenAt: "2026-04-19T06:10:31.994Z"
    },
    {
      id: "rambert-2",
      venue: "Rambert",
      title: "Improvisation Lab",
      details: null,
      dayOfWeek: "Wednesday",
      startTime: "19:00",
      endTime: "20:00",
      startDate: null,
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/rambert-2",
      sourceUrl: "https://example.com/rambert",
      tags: [],
      audience: "adult",
      isWorkshop: true,
      lastSeenAt: "2026-04-19T06:10:31.994Z"
    },
    {
      id: "alpha-1",
      venue: "Alpha Studio",
      title: "Beginner Salsa",
      details: null,
      dayOfWeek: "Tuesday",
      startTime: "18:30",
      endTime: "19:30",
      startDate: null,
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/alpha-1",
      sourceUrl: "https://example.com/alpha",
      tags: ["salsa"],
      audience: "adult",
      isWorkshop: false,
      lastSeenAt: "2026-04-19T06:10:31.994Z"
    }
  ],
  venues: [
    {
      venue: "Rambert",
      key: "rambert",
      sourceUrl: "https://rambert.org.uk/classes/",
      count: 2,
      ok: true,
      lastSuccessAt: "2026-04-19T06:10:31.994Z",
      lastError: null
    },
    {
      venue: "Alpha Studio",
      key: "customEvents",
      sourceUrl: "https://example.com/alpha",
      count: 1,
      ok: false,
      lastSuccessAt: null,
      lastError: "403 forbidden"
    }
  ]
};

describe("getStudioProfiles", () => {
  it("builds per-studio summaries, types, and workshop counts", () => {
    const studios = getStudioProfiles(sampleData);
    const rambert = studios.find((studio) => studio.name === "Rambert");

    expect(studios).toHaveLength(2);
    expect(studios.map((s) => s.name)).toEqual(["Alpha Studio", "Rambert"]);
    expect(rambert).toBeDefined();
    expect(rambert?.classCount).toBe(2);
    expect(rambert?.workshopCount).toBe(1);
    expect(rambert?.topTypes).toContain("Contemporary");
    expect(rambert?.activeDays).toEqual(["Monday", "Wednesday"]);
    expect(rambert?.slug).toBe("rambert");
  });

  it("can look up a studio by slug", () => {
    const studio = getStudioBySlug(sampleData, "alpha-studio");
    expect(studio?.name).toBe("Alpha Studio");
    expect(studio?.ok).toBe(false);
    expect(studio?.lastError).toBe("403 forbidden");
  });
});
