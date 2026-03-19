import { addDays, format } from "date-fns";
import type { DanceSession } from "@/lib/types";

export function isDateInExcludedRanges(
  dateIso: string,
  ranges: DanceSession["excludedDateRanges"] | undefined
): boolean {
  if (!ranges?.length) return false;
  for (const r of ranges) {
    if (dateIso >= r.start && dateIso <= r.end) return true;
  }
  return false;
}

/** Skip excluded weeks for recurring sessions (+7 days); one-off dates return null if excluded. */
export function resolveSessionDatePastExclusions(
  session: Pick<DanceSession, "dayOfWeek" | "excludedDateRanges">,
  candidate: Date,
  normalizedEndDate: Date | null,
  maxWeeks = 104
): Date | null {
  let current = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  for (let i = 0; i < maxWeeks; i++) {
    const iso = format(current, "yyyy-MM-dd");
    if (normalizedEndDate && current > normalizedEndDate) return null;
    if (!isDateInExcludedRanges(iso, session.excludedDateRanges)) return current;
    if (session.dayOfWeek) current = addDays(current, 7);
    else return null;
  }
  return null;
}
