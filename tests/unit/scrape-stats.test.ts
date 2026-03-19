import { describe, expect, it } from "vitest";
import type { DanceSession, VenueKey } from "../../lib/types";
import {
  buildVenueChangeStats,
  computeIntervalHoursByVenueKey,
  fingerprintVenueSessions,
  type ScrapeStatsFile
} from "../../scripts/scrape/scrape-stats";

function makeSession(venue: string, title: string, startDate: string | null = null): DanceSession {
  return {
    id: "id",
    venue,
    title,
    details: null,
    dayOfWeek: "Monday",
    startTime: "10am",
    endTime: "11am",
    startDate,
    endDate: startDate,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/x",
    sourceUrl: "https://example.com",
    tags: [],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-01T12:00:00.000Z"
  };
}

describe("scrape change stats", () => {
  it("fingerprint is stable for same sessions", () => {
    const a = [makeSession("V", "A", "2026-01-01")];
    expect(fingerprintVenueSessions(a)).toBe(fingerprintVenueSessions([...a]));
  });

  it("detects change when session set differs", () => {
    const prev = [makeSession("V", "A", "2026-01-01")];
    const next = [makeSession("V", "A", "2026-01-01"), makeSession("V", "B", "2026-02-01")];
    expect(fingerprintVenueSessions(prev)).not.toBe(fingerprintVenueSessions(next));
  });

  it("buildVenueChangeStats marks failed scrapes with changed null", () => {
    const prev: DanceSession[] = [makeSession("V", "A", null)];
    const next: DanceSession[] = [];
    const stats = buildVenueChangeStats(
      [{ venueKey: "rambert" as VenueKey, venue: "V", ok: false }],
      prev,
      next
    );
    expect(stats[0].scrapeOk).toBe(false);
    expect(stats[0].changed).toBe(null);
  });

  it("buildVenueChangeStats compares ok venues", () => {
    const s = makeSession("V", "A", null);
    const stats = buildVenueChangeStats([{ venueKey: "rambert" as VenueKey, venue: "V", ok: true }], [s], [s]);
    expect(stats[0].changed).toBe(false);
    const stats2 = buildVenueChangeStats(
      [{ venueKey: "rambert" as VenueKey, venue: "V", ok: true }],
      [s],
      [makeSession("V", "B", null)]
    );
    expect(stats2[0].changed).toBe(true);
  });
});

function okRow(key: VenueKey, changed: boolean) {
  return {
    key,
    venue: "V",
    scrapeOk: true as const,
    previousSessionCount: 1,
    newSessionCount: 1,
    changed
  };
}

describe("computeIntervalHoursByVenueKey", () => {
  const keys: VenueKey[] = ["rambert", "thePlace"];

  it("defaults to 24h until enough ok samples", () => {
    const stats: ScrapeStatsFile = {
      version: 1,
      runs: [{ at: "2026-01-01T00:00:00.000Z", venues: [okRow("rambert", false)], summary: { scrapedVenues: 1, okVenues: 1, changedAmongOk: 0 } }]
    };
    const m = computeIntervalHoursByVenueKey(stats, keys);
    expect(m.get("rambert")).toBe(24);
  });

  it("tiers stable venues to 7d after 5 ok samples", () => {
    const stats: ScrapeStatsFile = {
      version: 1,
      runs: Array.from({ length: 5 }, (_, i) => ({
        at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
        venues: [okRow("rambert", false)],
        summary: { scrapedVenues: 1, okVenues: 1, changedAmongOk: 0 }
      }))
    };
    expect(computeIntervalHoursByVenueKey(stats, keys).get("rambert")).toBe(168);
  });

  it("keeps volatile venues on 24h", () => {
    const stats: ScrapeStatsFile = {
      version: 1,
      runs: Array.from({ length: 5 }, (_, i) => ({
        at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
        venues: [okRow("rambert", true)],
        summary: { scrapedVenues: 1, okVenues: 1, changedAmongOk: 1 }
      }))
    };
    expect(computeIntervalHoursByVenueKey(stats, keys).get("rambert")).toBe(24);
  });
});
