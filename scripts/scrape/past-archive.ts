import fs from "node:fs";
import path from "node:path";
import type { DanceSession, PastSessionsArchive } from "../../lib/types";

const MAX_PAST_SESSIONS = 8_000;

export function formatDateInLondon(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(nowMs));
}

export function sessionArchiveDedupeKey(session: DanceSession): string {
  return [session.venue, session.id, session.startDate ?? "", session.endDate ?? "", session.bookingUrl].join("|");
}

function lastCalendarDay(session: DanceSession): string | null {
  return session.endDate ?? session.startDate ?? null;
}

/** True if the session has a concrete calendar day and its last day is strictly before London "today". */
export function isSessionClearlyPast(session: DanceSession, nowMs: number): boolean {
  const lastDay = lastCalendarDay(session);
  if (!lastDay) return false;
  const today = formatDateInLondon(nowMs);
  return lastDay < today;
}

function sortKeyForTrim(session: DanceSession): string {
  return lastCalendarDay(session) ?? "9999-99-99";
}

/**
 * Merges evicted sessions that are clearly past into `data/classes.past.json` (deduped, size-capped).
 */
export function appendPastArchive(
  evictedSessions: DanceSession[],
  archivePath: string,
  nowMs: number,
  updatedAtIso: string
): void {
  const pastOnly = evictedSessions.filter((s) => isSessionClearlyPast(s, nowMs));
  if (pastOnly.length === 0) {
    return;
  }

  const dir = path.dirname(archivePath);
  fs.mkdirSync(dir, { recursive: true });

  let existing: PastSessionsArchive = { updatedAt: "", sessions: [] };
  if (fs.existsSync(archivePath)) {
    try {
      const raw = fs.readFileSync(archivePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PastSessionsArchive>;
      if (parsed && Array.isArray(parsed.sessions)) {
        existing = { updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "", sessions: parsed.sessions };
      }
    } catch {
      existing = { updatedAt: "", sessions: [] };
    }
  }

  const byKey = new Map<string, DanceSession>();
  for (const s of existing.sessions) {
    byKey.set(sessionArchiveDedupeKey(s), s);
  }
  for (const s of pastOnly) {
    byKey.set(sessionArchiveDedupeKey(s), s);
  }

  let merged = [...byKey.values()];
  if (merged.length > MAX_PAST_SESSIONS) {
    merged.sort((a, b) => sortKeyForTrim(a).localeCompare(sortKeyForTrim(b)));
    merged = merged.slice(merged.length - MAX_PAST_SESSIONS);
  }

  const out: PastSessionsArchive = {
    updatedAt: updatedAtIso,
    sessions: merged
  };
  fs.writeFileSync(archivePath, JSON.stringify(out, null, 2));
}
