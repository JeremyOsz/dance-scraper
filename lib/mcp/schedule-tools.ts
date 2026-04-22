import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";
import { z } from "zod";
import { buildMultiSessionIcs, buildScheduleCalendarFilename, getSessionCalendarTiming } from "@/lib/calendar-export";
import { DANCE_TYPES } from "@/lib/dance-types";
import { filterSessions } from "@/lib/filter-sessions";
import { LEVELS } from "@/lib/levels";
import type { DanceSession, DayOfWeek } from "@/lib/types";

const MAX_RESULTS_LIMIT = 100;
const DEFAULT_RESULT_LIMIT = 25;
const DEFAULT_PLANNED_CLASSES = 5;
const DEFAULT_RANGE_DAYS = 56;

const daySchema = z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

export const searchDanceClassesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  type: z.array(z.string()).optional(),
  level: z.array(z.string()).optional(),
  venue: z.array(z.string()).optional(),
  day: z.array(daySchema).optional(),
  workshopsOnly: z.boolean().optional(),
  maxResults: z.number().int().positive().max(MAX_RESULTS_LIMIT).optional()
});

export const unavailableWindowSchema = z.object({
  day: daySchema.optional(),
  date: z.string().optional(),
  startTime: z.string(),
  endTime: z.string()
});

export const planDanceScheduleSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  preferredStyles: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  venues: z.array(z.string()).optional(),
  days: z.array(daySchema).optional(),
  unavailable: z.array(unavailableWindowSchema).optional(),
  workshopsOnly: z.boolean().optional(),
  includeWorkshops: z.boolean().optional(),
  maxClasses: z.number().int().positive().max(20).optional(),
  goals: z.string().optional()
});

export const generateScheduleIcsSchema = z.object({
  sessionIds: z.array(z.string()).min(1),
  calendarName: z.string().optional()
});

export type SearchDanceClassesInput = z.infer<typeof searchDanceClassesSchema>;
export type PlanDanceScheduleInput = z.infer<typeof planDanceScheduleSchema>;
export type GenerateScheduleIcsInput = z.infer<typeof generateScheduleIcsSchema>;

export type McpSessionSummary = {
  id: string;
  title: string;
  venue: string;
  details: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  occurrenceDate: string | null;
  occurrenceStart: string | null;
  occurrenceEnd: string | null;
  allDay: boolean;
  timezone: "Europe/London";
  tags: string[];
  audience: DanceSession["audience"];
  isWorkshop: boolean;
  bookingUrl: string;
  sourceUrl: string;
  canExportToCalendar: boolean;
};

export type PlannedSession = McpSessionSummary & {
  score: number;
  matchReasons: string[];
  conflictNotes: string[];
};

function todayIso(now: Date) {
  return format(now, "yyyy-MM-dd");
}

function defaultToIso(now: Date) {
  return format(addDays(now, DEFAULT_RANGE_DAYS), "yyyy-MM-dd");
}

function clampCount(value: number | undefined, fallback: number, max: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function normalizeTerms(values: string[] | undefined) {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function canonicalize(values: string[] | undefined, allowed: readonly string[]) {
  if (!values?.length) return undefined;
  const byLower = new Map(allowed.map((value) => [value.toLowerCase(), value]));
  return values.map((value) => byLower.get(value.trim().toLowerCase()) ?? value).filter(Boolean);
}

function containsAny(session: DanceSession, terms: string[]) {
  if (terms.length === 0) return false;
  const haystack = [session.title, session.details ?? "", session.venue, ...session.tags].join(" ").toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function parseClockMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  const rawHours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isFinite(rawHours) || !Number.isFinite(minutes) || rawHours > 23 || minutes > 59) {
    return null;
  }

  const meridiem = match[3]?.toLowerCase();
  let hours = rawHours;
  if (meridiem) {
    hours = rawHours % 12;
    if (meridiem === "pm") hours += 12;
  }
  return hours * 60 + minutes;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function sessionSummary(session: DanceSession, now: Date): McpSessionSummary {
  const timing = getSessionCalendarTiming(session, now);

  return {
    id: session.id,
    title: session.title,
    venue: session.venue,
    details: session.details,
    dayOfWeek: session.dayOfWeek,
    startTime: session.startTime,
    endTime: session.endTime,
    startDate: session.startDate,
    endDate: session.endDate,
    occurrenceDate: timing ? format(timing.start, "yyyy-MM-dd") : null,
    occurrenceStart: timing && !timing.allDay ? timing.start.toISOString() : null,
    occurrenceEnd: timing && !timing.allDay ? timing.end.toISOString() : null,
    allDay: timing?.allDay ?? false,
    timezone: session.timezone,
    tags: session.tags,
    audience: session.audience,
    isWorkshop: session.isWorkshop,
    bookingUrl: session.bookingUrl,
    sourceUrl: session.sourceUrl,
    canExportToCalendar: Boolean(timing)
  };
}

function sortSummaries(a: McpSessionSummary, b: McpSessionSummary) {
  const aTime = a.occurrenceStart ?? a.occurrenceDate ?? "9999";
  const bTime = b.occurrenceStart ?? b.occurrenceDate ?? "9999";
  return aTime.localeCompare(bTime) || a.venue.localeCompare(b.venue) || a.title.localeCompare(b.title);
}

function filterByOccurrenceRange(summaries: McpSessionSummary[], from: string, to: string) {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);

  return summaries.filter((session) => {
    if (!session.occurrenceDate) {
      return false;
    }
    const occurrence = parseISO(session.occurrenceDate);
    return !isBefore(occurrence, fromDate) && !isAfter(occurrence, toDate);
  });
}

export function searchDanceClasses(
  sessions: DanceSession[],
  input: SearchDanceClassesInput = {},
  now = new Date()
) {
  const parsed = searchDanceClassesSchema.parse(input);
  const from = parsed.from ?? todayIso(now);
  const to = parsed.to ?? defaultToIso(now);
  const maxResults = clampCount(parsed.maxResults, DEFAULT_RESULT_LIMIT, MAX_RESULTS_LIMIT);
  const anchor = parseISO(from);
  const timingNow = Number.isNaN(anchor.getTime()) ? now : anchor;

  const filtered = filterSessions(sessions, {
    from,
    to,
    q: parsed.q,
    type: canonicalize(parsed.type, DANCE_TYPES),
    level: canonicalize(parsed.level, LEVELS),
    venue: parsed.venue,
    day: parsed.day,
    workshopsOnly: parsed.workshopsOnly
  });

  const results = filterByOccurrenceRange(
    filtered.map((session) => sessionSummary(session, timingNow)).sort(sortSummaries),
    from,
    to
  ).slice(0, maxResults);

  return {
    from,
    to,
    count: results.length,
    sessions: results
  };
}

function conflictNotes(summary: McpSessionSummary, unavailable: PlanDanceScheduleInput["unavailable"]) {
  const notes: string[] = [];
  if (!summary.occurrenceDate || !summary.dayOfWeek) return notes;

  const sessionStart = parseClockMinutes(summary.startTime);
  const sessionEnd = parseClockMinutes(summary.endTime) ?? (sessionStart === null ? null : sessionStart + 60);
  if (sessionStart === null || sessionEnd === null) return notes;

  for (const window of unavailable ?? []) {
    if (window.date && window.date !== summary.occurrenceDate) continue;
    if (window.day && window.day !== summary.dayOfWeek) continue;

    const windowStart = parseClockMinutes(window.startTime);
    const windowEnd = parseClockMinutes(window.endTime);
    if (windowStart === null || windowEnd === null) continue;

    if (overlaps(sessionStart, sessionEnd, windowStart, windowEnd)) {
      notes.push(`Overlaps unavailable time ${window.day ?? window.date ?? "selected day"} ${window.startTime}-${window.endTime}.`);
    }
  }

  return notes;
}

function scoreSession(session: DanceSession, summary: McpSessionSummary, input: PlanDanceScheduleInput) {
  let score = 0;
  const matchReasons: string[] = [];
  const preferredStyles = normalizeTerms(input.preferredStyles);
  const levels = normalizeTerms(input.levels);
  const venues = normalizeTerms(input.venues);
  const goals = normalizeTerms(input.goals ? [input.goals] : undefined);

  if (containsAny(session, preferredStyles)) {
    score += 4;
    matchReasons.push("Matches preferred style.");
  }

  if (containsAny(session, levels)) {
    score += 3;
    matchReasons.push("Matches preferred level.");
  }

  if (venues.some((venue) => session.venue.toLowerCase().includes(venue))) {
    score += 2;
    matchReasons.push("Matches preferred venue.");
  }

  if (input.days?.length && summary.dayOfWeek && input.days.includes(summary.dayOfWeek)) {
    score += 2;
    matchReasons.push("Fits preferred day.");
  }

  if (input.includeWorkshops && session.isWorkshop) {
    score += 1;
    matchReasons.push("Includes workshop format.");
  }

  if (containsAny(session, goals)) {
    score += 1;
    matchReasons.push("Matches stated goals.");
  }

  if (matchReasons.length === 0) {
    matchReasons.push("Fits the requested date range.");
  }

  return { score, matchReasons };
}

export function planDanceSchedule(sessions: DanceSession[], input: PlanDanceScheduleInput = {}, now = new Date()) {
  const parsed = planDanceScheduleSchema.parse(input);
  const maxClasses = clampCount(parsed.maxClasses, DEFAULT_PLANNED_CLASSES, 20);
  const search = searchDanceClasses(
    sessions,
    {
      from: parsed.from,
      to: parsed.to,
      type: canonicalize(parsed.preferredStyles, DANCE_TYPES),
      level: canonicalize(parsed.levels, LEVELS),
      venue: parsed.venues,
      day: parsed.days,
      workshopsOnly: parsed.workshopsOnly,
      maxResults: MAX_RESULTS_LIMIT
    },
    now
  );
  const byId = new Map(sessions.map((session) => [session.id, session]));

  const planned = search.sessions
    .map((summary): PlannedSession => {
      const session = byId.get(summary.id)!;
      const scored = scoreSession(session, summary, parsed);
      const notes = conflictNotes(summary, parsed.unavailable);
      return {
        ...summary,
        score: scored.score - notes.length * 10,
        matchReasons: scored.matchReasons,
        conflictNotes: notes
      };
    })
    .sort((a, b) => b.score - a.score || sortSummaries(a, b));

  const recommendations = planned.filter((session) => session.conflictNotes.length === 0).slice(0, maxClasses);
  const skipped = planned
    .filter((session) => session.conflictNotes.length > 0 || !recommendations.some((item) => item.id === session.id))
    .slice(0, 20)
    .map((session) => ({
      id: session.id,
      title: session.title,
      venue: session.venue,
      reasons: session.conflictNotes.length ? session.conflictNotes : ["Lower-ranked match for this request."]
    }));

  return {
    from: search.from,
    to: search.to,
    selectedSessionIds: recommendations.map((session) => session.id),
    recommendations,
    skipped,
    calendarName: "London Dance Calendar"
  };
}

export function generateScheduleIcs(sessions: DanceSession[], input: GenerateScheduleIcsInput, now = new Date()) {
  const parsed = generateScheduleIcsSchema.parse(input);
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const requested = parsed.sessionIds.map((id) => byId.get(id)).filter((session): session is DanceSession => Boolean(session));
  const missing = parsed.sessionIds
    .filter((id) => !byId.has(id))
    .map((id) => ({ id, title: id, reason: "Session not found." }));
  const result = buildMultiSessionIcs(requested, { calendarName: parsed.calendarName, now });

  return {
    icsText: result.ics,
    filename: buildScheduleCalendarFilename(parsed.calendarName),
    included: result.included.map((session) => sessionSummary(session, now)),
    skipped: [...missing, ...result.skipped],
    importInstructions: "Import this .ics file into your calendar app, or save it and open it with Google Calendar, Apple Calendar, Outlook, or another calendar client."
  };
}
