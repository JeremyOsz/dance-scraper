import { addDays, format, parseISO } from "date-fns";
import type { DanceSession } from "@/lib/types";
import { resolveSessionDatePastExclusions } from "@/lib/session-excluded-dates";

type SessionTiming = {
  start: Date;
  end: Date;
  allDay: boolean;
};

export type MultiSessionIcsResult = {
  ics: string;
  included: DanceSession[];
  skipped: { id: string; title: string; reason: string }[];
};

const DAY_TO_INDEX: Record<Exclude<DanceSession["dayOfWeek"], null>, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

function parseDate(session: DanceSession, now: Date): Date | null {
  const nowLocal = new Date(now);
  const todayMidnight = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());

  const startDate = session.startDate ? parseISO(session.startDate) : null;
  const hasValidStartDate = Boolean(startDate && !Number.isNaN(startDate.getTime()));
  const normalizedStartDate = hasValidStartDate
    ? new Date(startDate!.getFullYear(), startDate!.getMonth(), startDate!.getDate())
    : null;
  const endDate = session.endDate ? parseISO(session.endDate) : null;
  const hasValidEndDate = Boolean(endDate && !Number.isNaN(endDate.getTime()));
  const normalizedEndDate = hasValidEndDate
    ? new Date(endDate!.getFullYear(), endDate!.getMonth(), endDate!.getDate())
    : null;

  let candidate: Date | null = null;

  if (normalizedStartDate) {
    if (normalizedStartDate >= todayMidnight) {
      candidate = normalizedStartDate;
    } else if (!session.dayOfWeek) {
      candidate = normalizedStartDate;
    }
  }

  if (candidate === null && session.dayOfWeek) {
    const target = DAY_TO_INDEX[session.dayOfWeek];
    const distance = (target - todayMidnight.getDay() + 7) % 7;
    let nextOccurrence = addDays(todayMidnight, distance);

    if (normalizedStartDate && nextOccurrence < normalizedStartDate) {
      nextOccurrence = normalizedStartDate;
    }

    if (normalizedEndDate && nextOccurrence > normalizedEndDate) {
      return null;
    }

    candidate = nextOccurrence;
  }

  if (candidate === null) {
    return null;
  }

  if (normalizedEndDate && candidate > normalizedEndDate) {
    return null;
  }

  return resolveSessionDatePastExclusions(session, candidate, normalizedEndDate);
}

function foldIcsLine(line: string, maxLineLength = 75): string[] {
  if (line.length <= maxLineLength) {
    return [line];
  }

  const folded: string[] = [];
  let index = 0;
  while (index < line.length) {
    const chunkSize = index === 0 ? maxLineLength : maxLineLength - 1;
    const chunk = line.slice(index, index + chunkSize);
    folded.push(index === 0 ? chunk : ` ${chunk}`);
    index += chunkSize;
  }
  return folded;
}

function foldIcsLines(lines: string[]): string[] {
  return lines.flatMap((line) => foldIcsLine(line));
}

function parseClockTime(value: string | null): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = value.trim().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  const rawHours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isFinite(rawHours) || !Number.isFinite(minutes) || rawHours > 23 || minutes > 59) {
    return null;
  }

  const meridiem = match[3]?.toLowerCase();
  if (!meridiem) {
    return { hours: rawHours, minutes };
  }

  let hours = rawHours % 12;
  if (meridiem === "pm") {
    hours += 12;
  }
  return { hours, minutes };
}

export function getSessionCalendarTiming(session: DanceSession, now = new Date()): SessionTiming | null {
  const date = parseDate(session, now);
  if (!date) {
    return null;
  }

  const startClock = parseClockTime(session.startTime);
  const endClock = parseClockTime(session.endTime);

  if (!startClock) {
    const start = new Date(date);
    const end = addDays(start, 1);
    return { start, end, allDay: true };
  }

  const start = new Date(date);
  start.setHours(startClock.hours, startClock.minutes, 0, 0);

  const end = new Date(start);
  if (endClock) {
    end.setHours(endClock.hours, endClock.minutes, 0, 0);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
  } else {
    end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
  }

  return { start, end, allDay: false };
}

export function canAddSessionToCalendar(session: DanceSession, now = new Date()) {
  return Boolean(getSessionCalendarTiming(session, now));
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toUtcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function toLocalStamp(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss");
}

export function buildCalendarFilename(session: DanceSession) {
  const slug = session.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "dance-session"}.ics`;
}

export function buildScheduleCalendarFilename(calendarName = "London Dance Calendar") {
  const slug = calendarName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "london-dance-calendar"}.ics`;
}

function buildSessionEventLines(session: DanceSession, now: Date) {
  const timing = getSessionCalendarTiming(session, now);
  if (!timing) {
    throw new Error("Session does not have enough date information for calendar export.");
  }

  const description = [session.details, `Booking: ${session.bookingUrl}`, `Source: ${session.sourceUrl}`]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VEVENT",
    `UID:${escapeText(session.id)}@dance-scraper.local`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `SUMMARY:${escapeText(session.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(session.venue)}`,
    timing.allDay
      ? `DTSTART;VALUE=DATE:${format(timing.start, "yyyyMMdd")}`
      : `DTSTART;TZID=Europe/London:${toLocalStamp(timing.start)}`,
    timing.allDay
      ? `DTEND;VALUE=DATE:${format(timing.end, "yyyyMMdd")}`
      : `DTEND;TZID=Europe/London:${toLocalStamp(timing.end)}`,
    `URL:${escapeText(session.bookingUrl)}`,
    "END:VEVENT"
  ];
}

export function buildSessionIcs(session: DanceSession, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dance Scraper//London Dance Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...buildSessionEventLines(session, now),
    "END:VCALENDAR"
  ];

  return `${foldIcsLines(lines).join("\r\n")}\r\n`;
}

export function buildMultiSessionIcs(
  sessions: DanceSession[],
  options: { calendarName?: string; now?: Date } = {}
): MultiSessionIcsResult {
  const now = options.now ?? new Date();
  const calendarName = options.calendarName?.trim() || "London Dance Calendar";
  const included: DanceSession[] = [];
  const skipped: MultiSessionIcsResult["skipped"] = [];
  const eventLines: string[] = [];

  for (const session of sessions) {
    try {
      eventLines.push(...buildSessionEventLines(session, now));
      included.push(session);
    } catch {
      skipped.push({
        id: session.id,
        title: session.title,
        reason: "Session does not contain enough date information for calendar export."
      });
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dance Scraper//London Dance Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    ...eventLines,
    "END:VCALENDAR"
  ];

  return {
    ics: `${foldIcsLines(lines).join("\r\n")}\r\n`,
    included,
    skipped
  };
}
