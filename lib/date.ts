import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import type { DanceSession, DayOfWeek } from "@/lib/types";
import { isDateInExcludedRanges } from "@/lib/session-excluded-dates";

export const ORDERED_DAYS: Exclude<DayOfWeek, null>[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

export function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

/** ISO week Mon–Sun (legacy / week-picker jumps still align to Monday via anchor). */
export function getWeekDates(anchor: Date) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

/** `dayCount` consecutive calendar days from local midnight of `anchor` (default 7). */
export function getForwardDayWindow(anchor: Date, dayCount = 7) {
  const start = startOfDay(anchor);
  return eachDayOfInterval({ start, end: addDays(start, dayCount - 1) });
}

export function getMonthGridDates(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return "Time TBC";
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? "Time TBC";
}

export function isSessionActiveOnDate(session: DanceSession, dateIso: string) {
  // Do not render undated/undirected records on every day cell.
  if (!session.dayOfWeek && !session.startDate && !session.endDate) {
    return false;
  }

  if (session.startDate && isBefore(parseISO(dateIso), parseISO(session.startDate))) {
    return false;
  }
  if (session.endDate && isAfter(parseISO(dateIso), parseISO(session.endDate))) {
    return false;
  }

  if (isDateInExcludedRanges(dateIso, session.excludedDateRanges)) {
    return false;
  }

  if (!session.dayOfWeek) return true;
  const dayName = format(parseISO(dateIso), "EEEE") as Exclude<DayOfWeek, null>;
  return dayName === session.dayOfWeek;
}
