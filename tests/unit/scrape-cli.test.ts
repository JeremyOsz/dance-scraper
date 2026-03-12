import { describe, expect, it } from "vitest";
import type { DanceSession, ScrapeOutput, VenueKey, VenueStatus } from "../../lib/types";
import { mergeOutputWithPrevious, parseScrapeCliArgs, resolveForcedVenueKeys, selectVenueKeys } from "../../scripts/scrape/cli";

function makeSession(id: string, venue: string): DanceSession {
  return {
    id,
    venue,
    title: `Class ${id}`,
    details: null,
    dayOfWeek: "Monday",
    startTime: "10am",
    endTime: "11am",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: `https://example.com/${id}`,
    sourceUrl: "https://example.com",
    tags: [],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T10:00:00.000Z"
  };
}

function makeStatus(input: Partial<VenueStatus> & Pick<VenueStatus, "key" | "venue">): VenueStatus {
  return {
    key: input.key,
    venue: input.venue,
    sourceUrl: input.sourceUrl ?? "https://example.com",
    count: input.count ?? 0,
    ok: input.ok ?? true,
    lastSuccessAt: input.lastSuccessAt ?? "2026-03-10T10:00:00.000Z",
    lastError: input.lastError ?? null
  };
}

describe("parseScrapeCliArgs", () => {
  it("parses empty/outdated/force flags", () => {
    const args = parseScrapeCliArgs(["--empty", "--outdated", "--force", "rambert,thePlace", "--force=tripSpace"]);
    expect(args.onlyEmptyVenues).toBe(true);
    expect(args.onlyOutdatedVenues).toBe(true);
    expect(args.forceVenueTokens).toEqual(["rambert", "thePlace", "tripSpace"]);
  });

  it("throws on unknown args", () => {
    expect(() => parseScrapeCliArgs(["--unknown"])).toThrow(/Unknown argument/);
  });
});

describe("selectVenueKeys", () => {
  it("selects only forced venues when no filters are provided", () => {
    const selected = selectVenueKeys(
      ["thePlace", "rambert", "tripSpace"],
      null,
      { onlyEmptyVenues: false, onlyOutdatedVenues: false },
      new Set<VenueKey>(["tripSpace"])
    );

    expect([...selected]).toEqual(["tripSpace"]);
  });

  it("intersects filters and then applies forced venues", () => {
    const allVenueKeys: VenueKey[] = ["thePlace", "rambert", "tripSpace"];
    const previous: ScrapeOutput = {
      generatedAt: "2026-03-10T12:00:00.000Z",
      sessions: [],
      venues: [
        makeStatus({
          key: "thePlace",
          venue: "The Place",
          ok: true,
          count: 0,
          lastSuccessAt: "2026-03-10T09:00:00.000Z"
        }),
        makeStatus({
          key: "rambert",
          venue: "Rambert",
          ok: true,
          count: 12,
          lastSuccessAt: "2026-03-10T09:00:00.000Z"
        }),
        makeStatus({
          key: "tripSpace",
          venue: "TripSpace",
          ok: true,
          count: 0,
          lastSuccessAt: "2026-03-11T12:30:00.000Z"
        })
      ]
    };

    const selected = selectVenueKeys(
      allVenueKeys,
      previous,
      { onlyEmptyVenues: true, onlyOutdatedVenues: true },
      new Set<VenueKey>(["rambert"]),
      Date.parse("2026-03-12T12:00:00.000Z")
    );

    expect([...selected].sort()).toEqual(["rambert", "thePlace"]);
  });
});

describe("resolveForcedVenueKeys", () => {
  it("resolves both venue keys and venue labels", () => {
    const result = resolveForcedVenueKeys(
      ["thePlace", "rambert", "trip space", "missing"],
      {
        thePlace: "The Place",
        rambert: "Rambert",
        tripSpace: "TripSpace"
      } as Record<VenueKey, string>
    );

    expect([...result.keys].sort()).toEqual(["rambert", "thePlace", "tripSpace"]);
    expect(result.unknownTokens).toEqual(["missing"]);
  });
});

describe("mergeOutputWithPrevious", () => {
  it("preserves previous valid sessions and success timestamp when fresh scrape fails", () => {
    const previous: ScrapeOutput = {
      generatedAt: "2026-03-10T10:00:00.000Z",
      sessions: [makeSession("prev-rambert", "Rambert"), makeSession("prev-theplace", "The Place")],
      venues: [
        makeStatus({
          key: "rambert",
          venue: "Rambert",
          count: 1,
          ok: true,
          lastSuccessAt: "2026-03-10T10:00:00.000Z"
        }),
        makeStatus({
          key: "thePlace",
          venue: "The Place",
          count: 1,
          ok: true,
          lastSuccessAt: "2026-03-10T10:00:00.000Z"
        })
      ]
    };

    const fresh: ScrapeOutput = {
      generatedAt: "2026-03-12T10:00:00.000Z",
      sessions: [],
      venues: [
        makeStatus({
          key: "rambert",
          venue: "Rambert",
          ok: false,
          count: 0,
          lastSuccessAt: null,
          lastError: "timeout"
        })
      ]
    };

    const merged = mergeOutputWithPrevious(previous, fresh, ["thePlace", "rambert"]);
    const rambertStatus = merged.venues.find((venue) => venue.key === "rambert");

    expect(merged.sessions.map((session) => session.id).sort()).toEqual(["prev-rambert", "prev-theplace"]);
    expect(rambertStatus?.ok).toBe(false);
    expect(rambertStatus?.lastSuccessAt).toBe("2026-03-10T10:00:00.000Z");
  });

  it("replaces previous venue sessions when fresh scrape succeeds", () => {
    const previous: ScrapeOutput = {
      generatedAt: "2026-03-10T10:00:00.000Z",
      sessions: [makeSession("prev-rambert", "Rambert"), makeSession("prev-theplace", "The Place")],
      venues: [
        makeStatus({ key: "rambert", venue: "Rambert", count: 1 }),
        makeStatus({ key: "thePlace", venue: "The Place", count: 1 })
      ]
    };

    const fresh: ScrapeOutput = {
      generatedAt: "2026-03-12T10:00:00.000Z",
      sessions: [makeSession("new-rambert", "Rambert")],
      venues: [
        makeStatus({
          key: "rambert",
          venue: "Rambert",
          ok: true,
          count: 1,
          lastSuccessAt: "2026-03-12T10:00:00.000Z"
        })
      ]
    };

    const merged = mergeOutputWithPrevious(previous, fresh, ["thePlace", "rambert"]);
    expect(merged.sessions.map((session) => session.id).sort()).toEqual(["new-rambert", "prev-theplace"]);
  });
});
