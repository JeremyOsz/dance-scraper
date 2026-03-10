import { isAfter, isBefore, parseISO } from "date-fns";
import type { DanceSession } from "@/lib/types";
import { matchesDanceType } from "@/lib/dance-types";

type Filters = {
  from?: string;
  to?: string;
  venue?: string[];
  day?: string[];
  type?: string[];
  q?: string;
  workshopsOnly?: boolean;
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

    if (filters.venue?.length && !filters.venue.includes(session.venue)) {
      return false;
    }

    if (filters.day?.length && session.dayOfWeek && !filters.day.includes(session.dayOfWeek)) {
      return false;
    }

    if (filters.type?.length && !filters.type.some((selectedType) => matchesDanceType(session, selectedType))) {
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
        session.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!hit) {
        return false;
      }
    }

    return true;
  });
}
