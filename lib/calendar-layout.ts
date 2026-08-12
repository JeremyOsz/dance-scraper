import { sortVenueRecordsForUi } from "@/lib/venue-order";

export type TimeBucket = "morning" | "afternoon" | "evening";

type CalendarTimeInput = {
  id: string;
  startTime: string | null;
  endTime: string | null;
};

export type PositionedCalendarEvent<T extends CalendarTimeInput> = {
  event: T;
  startMinute: number;
  endMinute: number;
  column: number;
  columnCount: number;
};

export type CalendarLayoutResult<T extends CalendarTimeInput> = Array<PositionedCalendarEvent<T>> & {
  untimed: T[];
};

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_START_MINUTE = 7 * 60;
const DEFAULT_END_MINUTE = 23 * 60;
const DEFAULT_EVENT_DURATION = 60;

export function advanceLoadedDayCount(current: number, chunk = 7, maximum = 56) {
  return Math.min(current + chunk, maximum);
}

export function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase().replace(/\./g, ":").replace(/\s+/g, " ");
  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];
  if (minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) return null;
    const hour = rawHour % 12 + (meridiem === "pm" ? 12 : 0);
    return hour * 60 + minute;
  }

  if (rawHour < 0 || rawHour > 23) return null;
  return rawHour * 60 + minute;
}

export function getTimeBucket(minutes: number): TimeBucket {
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  return "evening";
}

export function matchesTimeBuckets(value: string | null, buckets: TimeBucket[]) {
  if (buckets.length === 0) return true;
  const minutes = parseTimeToMinutes(value);
  return minutes !== null && buckets.includes(getTimeBucket(minutes));
}

export function sortSessionsForVenueAgenda<
  T extends CalendarTimeInput & { venue: string; organizer?: string | null; title: string }
>(sessions: T[]): T[] {
  const venueCounts = new Map<string, number>();
  for (const session of sessions) {
    const organizer = session.organizer?.trim() || session.venue;
    venueCounts.set(organizer, (venueCounts.get(organizer) ?? 0) + 1);
  }
  const venueRank = new Map(
    sortVenueRecordsForUi(
      [...venueCounts].map(([name, count]) => ({ name, count }))
    ).map((venue, index) => [venue.name, index])
  );

  return [...sessions].sort((a, b) => {
    const aOrganizer = a.organizer?.trim() || a.venue;
    const bOrganizer = b.organizer?.trim() || b.venue;
    const venueDifference = (venueRank.get(aOrganizer) ?? Number.MAX_SAFE_INTEGER) -
      (venueRank.get(bOrganizer) ?? Number.MAX_SAFE_INTEGER);
    if (venueDifference !== 0) return venueDifference;

    const aTime = parseTimeToMinutes(a.startTime) ?? Number.MAX_SAFE_INTEGER;
    const bTime = parseTimeToMinutes(b.startTime) ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

export function getCalendarGridBounds(events: Array<Pick<CalendarTimeInput, "startTime" | "endTime">>) {
  let startMinute = DEFAULT_START_MINUTE;
  let endMinute = DEFAULT_END_MINUTE;

  for (const event of events) {
    const start = parseTimeToMinutes(event.startTime);
    if (start === null) continue;
    const parsedEnd = parseTimeToMinutes(event.endTime);
    const end = parsedEnd !== null && parsedEnd > start ? parsedEnd : Math.min(start + DEFAULT_EVENT_DURATION, MINUTES_PER_DAY);
    startMinute = Math.min(startMinute, Math.floor(start / 60) * 60);
    endMinute = Math.max(endMinute, Math.min(Math.ceil(end / 60) * 60, MINUTES_PER_DAY));
  }

  return { startMinute, endMinute };
}

export function layoutCalendarEvents<T extends CalendarTimeInput>(events: T[]): CalendarLayoutResult<T> {
  const untimed: T[] = [];
  const timed = events
    .map((event, originalIndex) => {
      const startMinute = parseTimeToMinutes(event.startTime);
      if (startMinute === null) {
        untimed.push(event);
        return null;
      }
      const parsedEnd = parseTimeToMinutes(event.endTime);
      const endMinute = parsedEnd !== null && parsedEnd > startMinute
        ? parsedEnd
        : Math.min(startMinute + DEFAULT_EVENT_DURATION, MINUTES_PER_DAY);
      return { event, startMinute, endMinute, originalIndex };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || a.originalIndex - b.originalIndex);

  const positioned: Array<PositionedCalendarEvent<T>> = [];
  let groupStart = 0;
  while (groupStart < timed.length) {
    let groupEnd = groupStart + 1;
    let latestEnd = timed[groupStart]!.endMinute;
    while (groupEnd < timed.length && timed[groupEnd]!.startMinute < latestEnd) {
      latestEnd = Math.max(latestEnd, timed[groupEnd]!.endMinute);
      groupEnd += 1;
    }

    const group = timed.slice(groupStart, groupEnd);
    const laneEndMinutes: number[] = [];
    const withColumns = group.map((item) => {
      let column = laneEndMinutes.findIndex((end) => end <= item.startMinute);
      if (column === -1) {
        column = laneEndMinutes.length;
        laneEndMinutes.push(item.endMinute);
      } else {
        laneEndMinutes[column] = item.endMinute;
      }
      return { ...item, column };
    });
    const columnCount = laneEndMinutes.length;
    positioned.push(...withColumns.map(({ event, startMinute, endMinute, column }) => ({
      event,
      startMinute,
      endMinute,
      column,
      columnCount
    })));
    groupStart = groupEnd;
  }

  const result = positioned as CalendarLayoutResult<T>;
  result.untimed = untimed;
  return result;
}
