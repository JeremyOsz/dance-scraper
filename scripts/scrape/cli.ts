import fs from "node:fs";
import path from "node:path";
import type { ScrapeOutput, VenueKey } from "../../lib/types";
import type { AdapterOutput } from "./types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type ScrapeCliOptions = {
  onlyEmptyVenues: boolean;
  onlyOutdatedVenues: boolean;
  forceVenueTokens: string[];
  showHelp: boolean;
};

export type ScraperDefinition = {
  key: VenueKey;
  scrape: () => Promise<AdapterOutput>;
};

export function parseScrapeCliArgs(argv: string[]): ScrapeCliOptions {
  const options: ScrapeCliOptions = {
    onlyEmptyVenues: false,
    onlyOutdatedVenues: false,
    forceVenueTokens: [],
    showHelp: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--empty" || arg === "--only-empty") {
      options.onlyEmptyVenues = true;
      continue;
    }

    if (arg === "--outdated" || arg === "--stale") {
      options.onlyOutdatedVenues = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
      continue;
    }

    if (arg === "--force") {
      const nextArg = argv[index + 1];
      if (!nextArg || nextArg.startsWith("-")) {
        throw new Error("Missing value for --force. Example: --force rambert,thePlace");
      }
      options.forceVenueTokens.push(...splitVenueTokens(nextArg));
      index += 1;
      continue;
    }

    if (arg.startsWith("--force=")) {
      options.forceVenueTokens.push(...splitVenueTokens(arg.slice("--force=".length)));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function readPreviousOutput(
  outputFilePath = path.join(process.cwd(), "data", "classes.normalized.json")
): ScrapeOutput | null {
  if (!fs.existsSync(outputFilePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(outputFilePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ScrapeOutput>;
    if (!parsed || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.venues)) {
      return null;
    }
    return parsed as ScrapeOutput;
  } catch {
    return null;
  }
}

export function resolveForcedVenueKeys(
  forceVenueTokens: string[],
  venueNameByKey: Record<VenueKey, string>
): { keys: Set<VenueKey>; unknownTokens: string[] } {
  const aliasToKey = new Map<string, VenueKey>();

  for (const [rawKey, venueName] of Object.entries(venueNameByKey)) {
    const key = rawKey as VenueKey;
    aliasToKey.set(normalizeToken(key), key);
    aliasToKey.set(normalizeToken(venueName), key);
  }

  const keys = new Set<VenueKey>();
  const unknownTokens: string[] = [];

  for (const token of forceVenueTokens) {
    const key = aliasToKey.get(normalizeToken(token));
    if (key) {
      keys.add(key);
    } else {
      unknownTokens.push(token);
    }
  }

  return { keys, unknownTokens };
}

export function selectVenueKeys(
  allVenueKeys: VenueKey[],
  previousOutput: ScrapeOutput | null,
  options: Pick<ScrapeCliOptions, "onlyEmptyVenues" | "onlyOutdatedVenues">,
  forcedVenueKeys: Set<VenueKey>,
  nowMs = Date.now()
): Set<VenueKey> {
  const hasFilter = options.onlyEmptyVenues || options.onlyOutdatedVenues;
  let selected = hasFilter ? new Set(allVenueKeys) : new Set<VenueKey>();
  if (!hasFilter && forcedVenueKeys.size === 0) {
    selected = new Set(allVenueKeys);
  }
  const previousStatusByKey = new Map(previousOutput?.venues.map((status) => [status.key, status]) ?? []);

  if (options.onlyEmptyVenues) {
    if (!previousOutput) {
      selected = new Set<VenueKey>();
    } else {
      const empty = new Set<VenueKey>();
      for (const status of previousOutput.venues) {
        if (status.ok && status.count === 0) {
          empty.add(status.key);
        }
      }
      selected = intersectSets(selected, empty);
    }
  }

  if (options.onlyOutdatedVenues) {
    const outdated = new Set<VenueKey>();

    if (!previousOutput) {
      for (const key of allVenueKeys) {
        outdated.add(key);
      }
    } else {
      for (const key of allVenueKeys) {
        const previousStatus = previousStatusByKey.get(key);
        const parsedSuccessTime = previousStatus?.lastSuccessAt ? Date.parse(previousStatus.lastSuccessAt) : Number.NaN;
        if (!Number.isFinite(parsedSuccessTime)) {
          outdated.add(key);
          continue;
        }
        if (nowMs - parsedSuccessTime > ONE_DAY_MS) {
          outdated.add(key);
        }
      }
    }

    selected = intersectSets(selected, outdated);
  }

  for (const key of forcedVenueKeys) {
    selected.add(key);
  }

  return selected;
}

export function mergeOutputWithPrevious(
  previousOutput: ScrapeOutput | null,
  freshOutput: ScrapeOutput,
  allVenueKeys: VenueKey[]
): ScrapeOutput {
  if (!previousOutput) {
    return freshOutput;
  }

  const previousStatusByKey = new Map(previousOutput.venues.map((status) => [status.key, status]));
  const mergedStatusByKey = new Map(previousOutput.venues.map((status) => [status.key, status]));
  const freshStatusByKey = new Map(freshOutput.venues.map((status) => [status.key, status]));

  for (const [key, freshStatus] of freshStatusByKey) {
    const previousStatus = previousStatusByKey.get(key);
    mergedStatusByKey.set(key, {
      ...freshStatus,
      lastSuccessAt: freshStatus.ok ? freshStatus.lastSuccessAt : previousStatus?.lastSuccessAt ?? null
    });
  }

  const successfulFreshStatuses = freshOutput.venues.filter((status) => status.ok);
  const staleSessionVenues = new Set<string>();
  for (const status of successfulFreshStatuses) {
    staleSessionVenues.add(status.venue);
    const previousVenueName = previousStatusByKey.get(status.key)?.venue;
    if (previousVenueName) {
      staleSessionVenues.add(previousVenueName);
    }
  }

  const preservedPreviousSessions = previousOutput.sessions.filter((session) => !staleSessionVenues.has(session.venue));
  const mergedSessions = [...preservedPreviousSessions, ...freshOutput.sessions];

  const orderedKeys = new Set(allVenueKeys);
  const mergedVenues = [
    ...allVenueKeys.map((key) => mergedStatusByKey.get(key)).filter((status): status is NonNullable<typeof status> => !!status),
    ...Array.from(mergedStatusByKey.values()).filter((status) => !orderedKeys.has(status.key))
  ];

  return {
    generatedAt: freshOutput.generatedAt,
    sessions: mergedSessions,
    venues: mergedVenues
  };
}

export function formatCliHelp(allVenueKeys: VenueKey[]): string {
  return [
    "Usage: npm run scrape -- [options]",
    "",
    "Options:",
    "  --empty               Only scrape venues that previously had a valid scrape with zero classes",
    "  --outdated            Only scrape venues whose last valid scrape is older than 24 hours",
    "  --force <venues>      Force specific venues (keys or names, comma-separated)",
    "  --help                Show help",
    "",
    "Venue keys:",
    `  ${allVenueKeys.join(", ")}`
  ].join("\n");
}

function splitVenueTokens(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function intersectSets<T>(left: Set<T>, right: Set<T>): Set<T> {
  const intersection = new Set<T>();
  for (const item of left) {
    if (right.has(item)) {
      intersection.add(item);
    }
  }
  return intersection;
}
