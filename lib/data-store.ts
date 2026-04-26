import fs from "node:fs";
import path from "node:path";
import type { DanceSession, ScrapeOutput, VenueKey, VenueStatus } from "@/lib/types";
import { VENUES } from "@/lib/venues";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "classes.normalized.json");

const EMPTY_DATA: ScrapeOutput = {
  generatedAt: new Date(0).toISOString(),
  sessions: [],
  venues: []
};

const VENUE_LABEL_TO_KEY = new Map<string, VenueKey>(
  (Object.keys(VENUES) as VenueKey[]).map((key) => [VENUES[key].label.toLowerCase(), key])
);

/** When `classes.normalized.json` omits `venues` (e.g. after a bad merge), rebuild from sessions. */
function inferVenuesFromSessions(sessions: DanceSession[], generatedAt: string): VenueStatus[] {
  const byVenue = new Map<string, DanceSession[]>();
  for (const session of sessions) {
    const label = session.venue?.trim() || "Unknown";
    const list = byVenue.get(label);
    if (list) {
      list.push(session);
    } else {
      byVenue.set(label, [session]);
    }
  }

  const rows: VenueStatus[] = [];
  for (const [venueName, venueSessions] of byVenue) {
    const key = VENUE_LABEL_TO_KEY.get(venueName.toLowerCase()) ?? "customEvents";
    const meta = VENUES[key];
    const sourceUrl = venueSessions[0]?.sourceUrl ?? meta.sourceUrl;
    rows.push({
      venue: venueName,
      key,
      sourceUrl,
      count: venueSessions.length,
      ok: true,
      lastSuccessAt: generatedAt,
      lastError: null
    });
  }

  return rows.sort((a, b) => a.venue.localeCompare(b.venue));
}

/** Siobhan (and similar) emit multiple dated rows that reuse the same `id`; keys and React lists need uniqueness. */
function disambiguateDuplicateSessionIds(sessions: DanceSession[]): DanceSession[] {
  const seen = new Map<string, number>();
  return sessions.map((s) => {
    const n = (seen.get(s.id) ?? 0) + 1;
    seen.set(s.id, n);
    if (n === 1) {
      return s;
    }
    const tag = s.startDate ?? s.endDate ?? `${n}`;
    return { ...s, id: `${s.id}--${tag}` };
  });
}

/** Same ticket URL + venue + calendar day + title (e.g. duplicate Eventbrite time variants — not Gel series pages). */
function clockStartMinutes(t: string | null): number | null {
  if (!t) {
    return null;
  }
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return null;
  }
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function dedupeSameBookingUrlCalendarDay(sessions: DanceSession[]): DanceSession[] {
  const groupKey = (s: DanceSession) => {
    const url = s.bookingUrl?.trim();
    if (!url || !s.startDate) {
      return "";
    }
    return `${url}\0${s.venue}\0${s.startDate}\0${s.title.trim().toLowerCase()}`;
  };

  const byKey = new Map<string, DanceSession[]>();
  for (const s of sessions) {
    const k = groupKey(s);
    if (!k) {
      continue;
    }
    const list = byKey.get(k);
    if (list) {
      list.push(s);
    } else {
      byKey.set(k, [s]);
    }
  }

  const dropIds = new Set<string>();
  for (const [key, list] of byKey) {
    if (list.length <= 1) {
      continue;
    }
    const url = key.split("\0")[0] ?? "";
    if (!/\/e\//i.test(url) || !/eventbrite\./i.test(url)) {
      continue;
    }
    if (!list.every((s) => clockStartMinutes(s.startTime) !== null)) {
      continue;
    }
    const winner = list.reduce((a, b) => {
      const da = Date.parse(a.lastSeenAt);
      const db = Date.parse(b.lastSeenAt);
      if (!Number.isNaN(db) && !Number.isNaN(da) && db !== da) {
        return db > da ? b : a;
      }
      return a.id <= b.id ? a : b;
    });
    for (const s of list) {
      if (s.id !== winner.id) {
        dropIds.add(s.id);
      }
    }
  }

  return sessions.filter((s) => !dropIds.has(s.id));
}

/**
 * Luminous lists the same New Moon Monday on Dandelion and Eventbrite with different titles/times;
 * keep the row with the longest title for that calendar date.
 */
function dedupeLuminousNewMoonMondaySameDate(sessions: DanceSession[]): DanceSession[] {
  const isNewMoonMonday = (s: DanceSession) =>
    s.venue.trim().toLowerCase() === "luminous dance" &&
    s.title.toLowerCase().includes("new moon monday") &&
    Boolean(s.startDate);

  const byDate = new Map<string, DanceSession[]>();
  for (const s of sessions) {
    if (!isNewMoonMonday(s)) {
      continue;
    }
    const list = byDate.get(s.startDate!);
    if (list) {
      list.push(s);
    } else {
      byDate.set(s.startDate!, [s]);
    }
  }

  const dropIds = new Set<string>();
  for (const list of byDate.values()) {
    if (list.length <= 1) {
      continue;
    }
    const winner = list.reduce((a, b) =>
      b.title.trim().length !== a.title.trim().length
        ? b.title.trim().length > a.title.trim().length
          ? b
          : a
        : a.id <= b.id
          ? a
          : b
    );
    for (const s of list) {
      if (s.id !== winner.id) {
        dropIds.add(s.id);
      }
    }
  }

  return sessions.filter((s) => !dropIds.has(s.id));
}

const TEAMUP_EVENT_ID = /\/e\/(\d+)-/;

/** GoTeamUp `/e/{id}-slug/` is stable across duplicate rows that only differ by parsed clock times or slugified ids. */
function teamupBookingStableId(bookingUrl: string | null | undefined): string | null {
  const raw = bookingUrl?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!u.hostname.toLowerCase().includes("goteamup.com")) return null;
    const m = u.pathname.match(TEAMUP_EVENT_ID);
    return m ? `goteamup:${m[1]}` : null;
  } catch {
    return null;
  }
}

/** Same bookable slot listed twice (e.g. overlapping adapters) — collapse to one row. */
function canonicalSessionDedupeKey(s: DanceSession): string {
  const teamup = teamupBookingStableId(s.bookingUrl);
  if (teamup !== null) {
    return [s.venue.toLowerCase(), teamup].join("\0");
  }
  return [
    s.bookingUrl ?? "",
    s.title.trim().toLowerCase(),
    s.startDate ?? "",
    s.dayOfWeek ?? "",
    s.startTime ?? "",
    s.endTime ?? ""
  ].join("\0");
}

function venueWordsInTitleScore(venue: string, title: string): number {
  const t = title.toLowerCase();
  return venue
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
}

function pickPreferredDuplicateSession(a: DanceSession, b: DanceSession): DanceSession {
  const scoreB = venueWordsInTitleScore(b.venue, b.title);
  const scoreA = venueWordsInTitleScore(a.venue, a.title);
  if (scoreB !== scoreA) {
    return scoreB > scoreA ? b : a;
  }
  const seenB = Date.parse(b.lastSeenAt);
  const seenA = Date.parse(a.lastSeenAt);
  if (!Number.isNaN(seenB) && !Number.isNaN(seenA) && seenB !== seenA) {
    return seenB > seenA ? b : a;
  }
  return a.id <= b.id ? a : b;
}

/**
 * Drops sessions that describe the same bookable occurrence (same booking URL, title, and
 * schedule fields). Keeps the row whose venue name best matches the title, then newest
 * {@link DanceSession.lastSeenAt}, then stable {@link DanceSession.id} order.
 */
export function dedupeSessionsByCanonicalBooking(sessions: DanceSession[]): DanceSession[] {
  const minIndexByKey = new Map<string, number>();
  sessions.forEach((s, i) => {
    const k = canonicalSessionDedupeKey(s);
    minIndexByKey.set(k, Math.min(minIndexByKey.get(k) ?? Infinity, i));
  });

  const byKey = new Map<string, DanceSession[]>();
  for (const s of sessions) {
    const k = canonicalSessionDedupeKey(s);
    const list = byKey.get(k);
    if (list) {
      list.push(s);
    } else {
      byKey.set(k, [s]);
    }
  }

  const out: DanceSession[] = [];
  for (const list of byKey.values()) {
    out.push(list.length === 1 ? list[0] : list.reduce(pickPreferredDuplicateSession));
  }

  out.sort((a, b) => (minIndexByKey.get(canonicalSessionDedupeKey(a)) ?? 0) - (minIndexByKey.get(canonicalSessionDedupeKey(b)) ?? 0));
  return out;
}

function mergeVenueRowsWithInferredCounts(
  persisted: VenueStatus[] | undefined,
  sessions: DanceSession[],
  generatedAt: string
): VenueStatus[] {
  const inferred = inferVenuesFromSessions(sessions, generatedAt);
  if (!persisted || persisted.length === 0) {
    return inferred;
  }
  const byName = new Map(persisted.map((v) => [v.venue, v]));
  return inferred.map((row) => {
    const prev = byName.get(row.venue);
    if (!prev) {
      return row;
    }
    return {
      ...row,
      ok: prev.ok,
      lastSuccessAt: prev.lastSuccessAt,
      lastError: prev.lastError,
      key: prev.key,
      sourceUrl: prev.sourceUrl || row.sourceUrl
    };
  });
}

/** Session cleanup applied when loading merged or hand-edited `classes.normalized.json`. Exported for tests. */
export function normalizeSessionsForCoerce(sessions: DanceSession[]): DanceSession[] {
  let s = disambiguateDuplicateSessionIds(sessions);
  s = dedupeSameBookingUrlCalendarDay(s);
  s = dedupeSessionsByCanonicalBooking(s);
  s = dedupeLuminousNewMoonMondaySameDate(s);
  return s;
}

/**
 * Normalizes parsed JSON into a valid {@link ScrapeOutput}. Fills `venues` when missing or empty
 * but sessions exist, so the app never receives `venues: undefined`.
 */
export function coerceScrapeOutput(input: unknown): ScrapeOutput {
  if (!input || typeof input !== "object") {
    return EMPTY_DATA;
  }
  const o = input as Record<string, unknown>;
  const generatedAt =
    typeof o.generatedAt === "string" && o.generatedAt.length > 0 ? o.generatedAt : EMPTY_DATA.generatedAt;
  const rawSessions = Array.isArray(o.sessions) ? (o.sessions as DanceSession[]) : [];
  const persistedVenues = Array.isArray(o.venues) && o.venues.length > 0 ? (o.venues as VenueStatus[]) : undefined;
  const sessions = normalizeSessionsForCoerce(rawSessions);
  const venues = mergeVenueRowsWithInferredCounts(persistedVenues, sessions, generatedAt);

  return { generatedAt, sessions, venues };
}

export function readScrapeOutput(): ScrapeOutput {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return EMPTY_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return coerceScrapeOutput(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY_DATA;
  }
}
