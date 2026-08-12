import type { DanceSessionOutbound } from "@/lib/types";
import type { DanceStyle } from "@/lib/dance-types";
import type { Level } from "@/lib/levels";
import type { TimeBucket } from "@/lib/calendar-layout";

export type CalendarView = "day" | "week" | "month";

export type CalendarFilters = {
  search: string;
  venues: string[];
  locations: string[];
  days: string[];
  styles: DanceStyle[];
  levels: Level[];
  times: TimeBucket[];
  workshopsOnly: boolean;
  coursesOnly: boolean;
  shortlistOnly: boolean;
};

export type CalendarEventSelection = {
  session: DanceSessionOutbound;
  date: Date;
};

export const EMPTY_FILTERS: CalendarFilters = {
  search: "",
  venues: [],
  locations: [],
  days: [],
  styles: [],
  levels: [],
  times: [],
  workshopsOnly: false,
  coursesOnly: false,
  shortlistOnly: false
};
