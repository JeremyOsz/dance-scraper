import { format } from "date-fns";
import { getForwardDayWindow, isSessionActiveOnDate } from "@/lib/date";
import type { DanceSession } from "@/lib/types";

export type UpcomingSessionOccurrence = {
  session: DanceSession;
  date: Date;
  dateIso: string;
};

export function getUpcomingSessionOccurrences(
  sessions: DanceSession[],
  anchor: Date,
  {
    maxDays = 28,
    maxItems = 16,
    uniqueSessions = false
  }: { maxDays?: number; maxItems?: number; uniqueSessions?: boolean } = {}
): UpcomingSessionOccurrence[] {
  const dates = getForwardDayWindow(anchor, maxDays);
  const occurrences: UpcomingSessionOccurrence[] = [];

  for (const date of dates) {
    const dateIso = format(date, "yyyy-MM-dd");
    for (const session of sessions) {
      if (isSessionActiveOnDate(session, dateIso)) {
        occurrences.push({ session, date, dateIso });
      }
    }
  }

  const sortedOccurrences = occurrences.sort((a, b) => {
    const dateCmp = a.dateIso.localeCompare(b.dateIso);
    if (dateCmp !== 0) return dateCmp;

    const timeCmp = (a.session.startTime ?? "99:99").localeCompare(b.session.startTime ?? "99:99");
    if (timeCmp !== 0) return timeCmp;

    const venueCmp = a.session.venue.localeCompare(b.session.venue);
    if (venueCmp !== 0) return venueCmp;

    return a.session.title.localeCompare(b.session.title);
  });

  if (!uniqueSessions) {
    return sortedOccurrences.slice(0, maxItems);
  }

  const seenIds = new Set<string>();
  return sortedOccurrences
    .filter(({ session }) => {
      if (seenIds.has(session.id)) {
        return false;
      }
      seenIds.add(session.id);
      return true;
    })
    .slice(0, maxItems);
}
