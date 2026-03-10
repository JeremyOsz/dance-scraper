import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";
import type { DanceSession, DayOfWeek } from "@/lib/types";

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

export function getWeekDates(anchor: Date) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
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

  if (!session.dayOfWeek) return true;
  const dayName = format(parseISO(dateIso), "EEEE") as Exclude<DayOfWeek, null>;
  return dayName === session.dayOfWeek;
}
