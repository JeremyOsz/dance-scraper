import { isAfter, isBefore, parseISO } from "date-fns";
import type { DanceSession } from "@/lib/types";
import { matchesDanceStyle, matchesDanceType } from "@/lib/dance-types";
import { matchesSessionLevel } from "@/lib/levels";

type Filters = {
  from?: string;
  to?: string;
  venue?: string[];
  organizer?: string[];
  location?: string[];
  day?: string[];
  type?: string[];
  style?: string[];
  level?: string[];
  q?: string;
  workshopsOnly?: boolean;
  coursesOnly?: boolean;
};

function containsTerm(value: string | null, q: string) {
  return (value ?? "").toLowerCase().includes(q);
}

export function filterSessions(all: DanceSession[], filters: Filters): DanceSession[] {
  const q = filters.q?.trim().toLowerCase();

  return all.filter((session) => {
    if (filters.workshopsOnly && !session.isWorkshop) {
      return false;
    }

    if (filters.coursesOnly && !session.isCourse) {
      return false;
    }

    if (filters.venue?.length && !filters.venue.includes(session.venue)) {
      return false;
    }

    if (filters.organizer?.length && !filters.organizer.includes(session.organizer ?? session.venue)) {
      return false;
    }

    if (filters.location?.length && (!session.locationName || !filters.location.includes(session.locationName))) {
      return false;
    }

    if (filters.day?.length && (!session.dayOfWeek || !filters.day.includes(session.dayOfWeek))) {
      return false;
    }

    if (filters.type?.length && !filters.type.some((selectedType) => matchesDanceType(session, selectedType))) {
      return false;
    }

    if (filters.style?.length && !filters.style.some((selectedStyle) => matchesDanceStyle(session, selectedStyle))) {
      return false;
    }

    if (filters.level?.length && !filters.level.some((selectedLevel) => matchesSessionLevel(session, selectedLevel))) {
      return false;
    }

    if (filters.from && session.endDate && isBefore(parseISO(session.endDate), parseISO(filters.from))) {
      return false;
    }

    if (filters.to && session.startDate && isAfter(parseISO(session.startDate), parseISO(filters.to))) {
      return false;
    }

    if (q) {
      const hit =
        containsTerm(session.title, q) ||
        containsTerm(session.details, q) ||
        containsTerm(session.organizer ?? session.venue, q) ||
        containsTerm(session.locationName ?? null, q) ||
        containsTerm(session.address ?? null, q) ||
        containsTerm(session.postcode ?? null, q) ||
        containsTerm(session.borough ?? null, q) ||
        session.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (session.styles ?? []).some((style) => style.toLowerCase().includes(q));
      if (!hit) {
        return false;
      }
    }

    return true;
  });
}
