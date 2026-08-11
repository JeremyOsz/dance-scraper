import type { DanceSession, ScrapeOutput } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { getUpcomingSessionOccurrences } from "@/lib/upcoming-sessions";

export type LocationProfile = {
  slug: string;
  name: string;
  address: string | null;
  postcode: string | null;
  borough: string | null;
  mapQuery: string;
  organizers: string[];
  classCount: number;
  sessions: DanceSession[];
  latestSeenAt: string | null;
};

function organizerOf(session: DanceSession) {
  return session.organizer ?? session.venue;
}

function mostCommon(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en-GB"))[0]?.[0] ?? null;
}

export function getLocationProfiles(data: ScrapeOutput): LocationProfile[] {
  const grouped = new Map<string, DanceSession[]>();
  for (const session of data.sessions) {
    const name = session.locationName?.trim();
    if (!name) continue;
    grouped.set(name, [...(grouped.get(name) ?? []), session]);
  }

  const usedSlugs = new Set<string>();
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en-GB"))
    .flatMap(([name, allSessions]) => {
      const anchor = new Date(data.generatedAt);
      const sessions = Number.isNaN(anchor.getTime())
        ? allSessions
        : getUpcomingSessionOccurrences(allSessions, anchor, { maxDays: 365, maxItems: 2_000, uniqueSessions: true })
            .map((occurrence) => occurrence.session);
      if (sessions.length === 0) return [];
      const address = mostCommon(sessions.map((session) => session.address));
      const postcode = mostCommon(sessions.map((session) => session.postcode));
      const borough = mostCommon(sessions.map((session) => session.borough));
      const slugBase = slugify(name) || "location";
      let slug = slugBase;
      let suffix = 2;
      while (usedSlugs.has(slug)) slug = `${slugBase}-${suffix++}`;
      usedSlugs.add(slug);
      const latestSeenAt = sessions.map((session) => session.lastSeenAt).filter(Boolean).sort().at(-1) ?? null;

      return [{
        slug,
        name,
        address,
        postcode,
        borough,
        mapQuery: [name, address, postcode].filter(Boolean).join(", "),
        organizers: [...new Set(sessions.map(organizerOf))].sort((a, b) => a.localeCompare(b, "en-GB")),
        classCount: sessions.length,
        sessions,
        latestSeenAt
      }];
    });
}

export function getLocationBySlug(data: ScrapeOutput, slug: string): LocationProfile | null {
  return getLocationProfiles(data).find((location) => location.slug === slug) ?? null;
}
