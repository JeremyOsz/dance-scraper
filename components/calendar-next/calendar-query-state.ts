import { format, isValid, parseISO, startOfDay } from "date-fns";
import { DANCE_STYLES, expandLegacyDanceTypes, type DanceStyle } from "@/lib/dance-types";
import { ORDERED_DAYS } from "@/lib/date";
import { LEVELS, type Level } from "@/lib/levels";
import type { DayOfWeek } from "@/lib/types";
import type { TimeBucket } from "@/lib/calendar-layout";
import type { CalendarFilters, CalendarView } from "./types";

const TIME_BUCKETS: TimeBucket[] = ["morning", "afternoon", "evening"];

export type CalendarQueryState = {
  view: CalendarView;
  anchorDate: Date;
  filters: CalendarFilters;
};

type CalendarQueryOptions = {
  venueNames: string[];
  locationNames: string[];
  defaultDate?: Date;
};

function parseCsv(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

export function parseCalendarQuery(searchParams: URLSearchParams, options: CalendarQueryOptions): CalendarQueryState {
  const fallbackDate = startOfDay(options.defaultDate ?? new Date());
  const parsedDate = parseISO(searchParams.get("date") ?? "");
  const viewParam = searchParams.get("view");
  const canonicalStyles = parseCsv(searchParams, "style").filter((value): value is DanceStyle => DANCE_STYLES.includes(value as DanceStyle));

  return {
    view: viewParam === "day" || viewParam === "month" ? viewParam : "week",
    anchorDate: isValid(parsedDate) ? startOfDay(parsedDate) : fallbackDate,
    filters: {
      search: searchParams.get("q") ?? "",
      venues: parseCsv(searchParams, "venue").filter((venue) => options.venueNames.includes(venue)),
      locations: parseCsv(searchParams, "location").filter((location) => options.locationNames.includes(location)),
      days: parseCsv(searchParams, "day").filter((value): value is Exclude<DayOfWeek, null> => ORDERED_DAYS.includes(value as Exclude<DayOfWeek, null>)),
      styles: canonicalStyles.length > 0 ? canonicalStyles : expandLegacyDanceTypes(parseCsv(searchParams, "type")),
      levels: parseCsv(searchParams, "level").filter((value): value is Level => LEVELS.includes(value as Level)),
      times: parseCsv(searchParams, "time").filter((value): value is TimeBucket => TIME_BUCKETS.includes(value as TimeBucket)),
      workshopsOnly: searchParams.get("workshops") === "1",
      coursesOnly: searchParams.get("courses") === "1",
      shortlistOnly: searchParams.get("shortlist") === "1"
    }
  };
}

export function serializeCalendarQuery(state: CalendarQueryState) {
  const params = new URLSearchParams();
  const { filters } = state;
  params.set("view", state.view);
  params.set("date", format(state.anchorDate, "yyyy-MM-dd"));
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.venues.length) params.set("venue", filters.venues.join(","));
  if (filters.locations.length) params.set("location", filters.locations.join(","));
  if (filters.days.length) params.set("day", filters.days.join(","));
  if (filters.styles.length) params.set("style", filters.styles.join(","));
  if (filters.levels.length) params.set("level", filters.levels.join(","));
  if (filters.times.length) params.set("time", filters.times.join(","));
  if (filters.workshopsOnly) params.set("workshops", "1");
  if (filters.coursesOnly) params.set("courses", "1");
  if (filters.shortlistOnly) params.set("shortlist", "1");
  return params.toString();
}
