import fs from "node:fs";
import path from "node:path";
import type { DanceSession, VenueKey } from "../../lib/types";

const MAX_RUNS = 90;

export type VenueScrapeChangeStat = {
  key: VenueKey;
  venue: string;
  scrapeOk: boolean;
  previousSessionCount: number;
  newSessionCount: number;
  /** Only defined when scrapeOk; compares normalized session fingerprints before vs after this run. */
  changed: boolean | null;
};

export type ScrapeStatsFile = {
  version: 1;
  runs: Array<{
    at: string;
    venues: VenueScrapeChangeStat[];
    summary: { scrapedVenues: number; okVenues: number; changedAmongOk: number };
  }>;
};

export function fingerprintVenueSessions(sessions: DanceSession[]): string {
  return [...sessions]
    .map((s) => [s.id, s.startDate ?? "", s.endDate ?? "", s.title, s.bookingUrl, s.startTime ?? "", s.endTime ?? ""].join("\u001f"))
    .sort()
    .join("\n");
}

export function buildVenueChangeStats(
  results: Array<{ venueKey: VenueKey; venue: string; ok: boolean }>,
  previousSessions: DanceSession[] | undefined,
  freshSessions: DanceSession[]
): VenueScrapeChangeStat[] {
  return results.map((r) => {
    const prev = previousSessions?.filter((s) => s.venue === r.venue) ?? [];
    const next = freshSessions.filter((s) => s.venue === r.venue);
    if (!r.ok) {
      return {
        key: r.venueKey,
        venue: r.venue,
        scrapeOk: false,
        previousSessionCount: prev.length,
        newSessionCount: next.length,
        changed: null
      };
    }
    return {
      key: r.venueKey,
      venue: r.venue,
      scrapeOk: true,
      previousSessionCount: prev.length,
      newSessionCount: next.length,
      changed: fingerprintVenueSessions(prev) !== fingerprintVenueSessions(next)
    };
  });
}

const MIN_OK_SAMPLES_FOR_TIER = 5;
const DEFAULT_INTERVAL_HOURS = 24;

/**
 * Derives a suggested hours-between-scrapes per venue from recent `changed` vs successful runs.
 * Used with `--outdated` so quiet sources are scraped less often.
 */
export function computeIntervalHoursByVenueKey(stats: ScrapeStatsFile | null, allVenueKeys: VenueKey[]): Map<VenueKey, number> {
  const out = new Map<VenueKey, number>();
  const aggregates = new Map<VenueKey, { ok: number; changed: number }>();

  for (const key of allVenueKeys) {
    aggregates.set(key, { ok: 0, changed: 0 });
  }

  if (stats?.runs) {
    for (const run of stats.runs) {
      for (const row of run.venues) {
        if (!row.scrapeOk) continue;
        const agg = aggregates.get(row.key);
        if (!agg) continue;
        agg.ok += 1;
        if (row.changed === true) agg.changed += 1;
      }
    }
  }

  for (const key of allVenueKeys) {
    const agg = aggregates.get(key)!;
    let hours = DEFAULT_INTERVAL_HOURS;
    if (agg.ok >= MIN_OK_SAMPLES_FOR_TIER) {
      const rate = agg.changed / agg.ok;
      if (rate >= 0.35) hours = 24;
      else if (rate >= 0.12) hours = 48;
      else if (rate >= 0.04) hours = 72;
      else hours = 168;
    }
    out.set(key, hours);
  }

  return out;
}

export function readScrapeStatsFile(statsPath: string): ScrapeStatsFile | null {
  if (!fs.existsSync(statsPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(statsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ScrapeStatsFile>;
    if (parsed?.version === 1 && Array.isArray(parsed.runs)) {
      return { version: 1, runs: parsed.runs };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function appendScrapeStatsRun(statsPath: string, atIso: string, venues: VenueScrapeChangeStat[]): void {
  const dir = path.dirname(statsPath);
  fs.mkdirSync(dir, { recursive: true });

  let file: ScrapeStatsFile = { version: 1, runs: [] };
  if (fs.existsSync(statsPath)) {
    try {
      const raw = fs.readFileSync(statsPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<ScrapeStatsFile>;
      if (parsed?.version === 1 && Array.isArray(parsed.runs)) {
        file = { version: 1, runs: parsed.runs };
      }
    } catch {
      file = { version: 1, runs: [] };
    }
  }

  const okVenues = venues.filter((v) => v.scrapeOk);
  const changedAmongOk = okVenues.filter((v) => v.changed === true).length;

  const run = {
    at: atIso,
    venues,
    summary: {
      scrapedVenues: venues.length,
      okVenues: okVenues.length,
      changedAmongOk
    }
  };

  file.runs = [run, ...file.runs].slice(0, MAX_RUNS);
  fs.writeFileSync(statsPath, JSON.stringify(file, null, 2));
}
