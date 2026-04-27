import { ORDERED_DAYS } from "@/lib/date";
import { inferDanceTypes } from "@/lib/dance-types";
import type { ScrapeOutput, VenueStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { getVenueMapQuery, VENUES } from "@/lib/venues";

export type StudioProfile = {
  slug: string;
  name: string;
  sourceUrl: string;
  mapQuery: string;
  ok: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  listedCount: number;
  classCount: number;
  workshopCount: number;
  topTypes: string[];
  activeDays: string[];
  sampleTitles: string[];
  summary: string | null;
  latestSeenAt: string | null;
};

function toSummaryText(input: string | null) {
  if (!input) {
    return null;
  }
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
}

function pickSummary(status: VenueStatus, details: Array<string | null>) {
  const firstDetail = details.find((item) => typeof item === "string" && item.trim().length > 0) ?? null;
  const summary = toSummaryText(firstDetail);
  if (summary) {
    return summary;
  }

  if (!status.ok && status.lastError) {
    return `Latest scrape issue: ${status.lastError}`;
  }
  if (status.count === 0) {
    return "No upcoming classes were found in the latest scrape.";
  }
  return null;
}

function getTopKeys(countByKey: Map<string, number>, max = 3) {
  return [...countByKey.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, max)
    .map(([key]) => key);
}

export function getStudioProfiles(data: ScrapeOutput): StudioProfile[] {
  const usedSlugs = new Set<string>();
  const sortedByName = [...data.venues].sort((a, b) => a.venue.localeCompare(b.venue, "en-GB"));

  return sortedByName.map((status) => {
    const sessions = data.sessions.filter((session) => session.venue === status.venue);
    const countByType = new Map<string, number>();
    const countByDay = new Map<string, number>();
    const details: Array<string | null> = [];
    const sampleTitles = new Set<string>();
    let workshopCount = 0;

    for (const session of sessions) {
      for (const type of inferDanceTypes(session)) {
        countByType.set(type, (countByType.get(type) ?? 0) + 1);
      }
      if (session.dayOfWeek) {
        countByDay.set(session.dayOfWeek, (countByDay.get(session.dayOfWeek) ?? 0) + 1);
      }
      if (session.isWorkshop) {
        workshopCount += 1;
      }
      details.push(session.details);
      if (sampleTitles.size < 3 && session.title.trim()) {
        sampleTitles.add(session.title.trim());
      }
    }

    const topTypes = getTopKeys(countByType);
    const orderedDays = ORDERED_DAYS.filter((day) => (countByDay.get(day) ?? 0) > 0);
    const mapQuery = VENUES[status.key]?.mapQuery ?? getVenueMapQuery(status.venue);
    const slugBase = slugify(status.venue) || "studio";
    let slug = slugBase;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const latestSeenAt =
      sessions
        .map((session) => session.lastSeenAt)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .at(-1) ?? null;

    return {
      slug,
      name: status.venue,
      sourceUrl: status.sourceUrl,
      mapQuery,
      ok: status.ok,
      lastSuccessAt: status.lastSuccessAt,
      lastError: status.lastError,
      listedCount: status.count,
      classCount: sessions.length,
      workshopCount,
      topTypes,
      activeDays: orderedDays,
      sampleTitles: [...sampleTitles],
      summary: pickSummary(status, details),
      latestSeenAt
    };
  });
}

export function getStudioBySlug(data: ScrapeOutput, slug: string): StudioProfile | null {
  return getStudioProfiles(data).find((studio) => studio.slug === slug) ?? null;
}
