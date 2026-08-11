import type { DanceSession } from "@/lib/types";

export type CourseStatus = "upcoming" | "in-progress" | "dates-tbc";

export type CourseListing = {
  id: string;
  title: string;
  venue: string;
  details: string | null;
  bookingUrl: string;
  sourceUrl: string;
  startDate: string | null;
  endDate: string | null;
  schedules: string[];
  status: CourseStatus;
  members: DanceSession[];
  representative: DanceSession;
  isWorkshop: boolean;
};

type CourseInferenceInput = Pick<DanceSession, "title" | "details" | "bookingUrl"> & {
  isCourse?: boolean;
};

const STRONG_COURSE_TEXT_PATTERNS = [
  /\b(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*[-–]?\s*week\s+(?:course|programme|series)\b/i,
  /\b(?:full|whole)\s+(?:course|term|series)\b/i,
  /\bterm\s+booking\b/i,
  /\b(?:book|booking|enrol|enroll)(?:ed|ing|ment)?\s+(?:for|onto|on)?\s*(?:the\s+)?(?:course|term|series|block)\b/i,
  /\b(?:enrolment|enrollment)\s+(?:is\s+)?(?:required|essential|open|opens|closed|closes)\b/i,
  /\bcourse\s+fee\b/i,
  /\bblock\s+of\s+\d+\s+(?:classes|sessions|weeks)\b/i
];

function isCourseSpecificUrl(bookingUrl: string): boolean {
  try {
    const path = new URL(bookingUrl).pathname;
    return /\/(?:course|courses)(?:\/|$)/i.test(path);
  } catch {
    return false;
  }
}

export function inferIsCourse(input: CourseInferenceInput): boolean {
  if (typeof input.isCourse === "boolean") {
    return input.isCourse;
  }

  if (/\bcourse\b/i.test(input.title) || STRONG_COURSE_TEXT_PATTERNS.some((pattern) => pattern.test(input.details ?? ""))) {
    return true;
  }

  return isCourseSpecificUrl(input.bookingUrl);
}

function normalizeGroupText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalBookingUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch {
    return raw.trim();
  }
}

function courseGroupKey(session: DanceSession): string {
  return [normalizeGroupText(session.venue), normalizeGroupText(session.title), canonicalBookingUrl(session.bookingUrl)].join("|");
}

function minDate(values: Array<string | null>): string | null {
  return values.filter((value): value is string => Boolean(value)).sort()[0] ?? null;
}

function maxDate(values: Array<string | null>): string | null {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function scheduleLabel(session: DanceSession): string | null {
  const time = session.startTime && session.endTime
    ? `${session.startTime}–${session.endTime}`
    : session.startTime ?? session.endTime;
  if (session.dayOfWeek && time) return `${session.dayOfWeek} · ${time}`;
  return session.dayOfWeek ?? time ?? null;
}

function listingStatus(startDate: string | null, endDate: string | null, todayIso: string): CourseStatus {
  if (!startDate) return "dates-tbc";
  return startDate < todayIso && (!endDate || endDate >= todayIso) ? "in-progress" : "upcoming";
}

function buildListing(key: string, members: DanceSession[], todayIso: string): CourseListing | null {
  const startDate = minDate(members.map((member) => member.startDate));
  const endDate = maxDate(members.map((member) => member.endDate ?? member.startDate));
  if (endDate && endDate < todayIso) return null;

  const representative = [...members].sort((a, b) => {
    const aDate = a.startDate ?? "9999-12-31";
    const bDate = b.startDate ?? "9999-12-31";
    return aDate.localeCompare(bDate) || a.id.localeCompare(b.id);
  })[0];
  if (!representative) return null;

  const schedules = Array.from(
    new Set(members.map(scheduleLabel).filter((label): label is string => Boolean(label)))
  );

  return {
    id: key,
    title: representative.title,
    venue: representative.venue,
    details: members.find((member) => member.details)?.details ?? null,
    bookingUrl: representative.bookingUrl,
    sourceUrl: representative.sourceUrl,
    startDate,
    endDate,
    schedules,
    status: listingStatus(startDate, endDate, todayIso),
    members: [...members],
    representative,
    isWorkshop: members.some((member) => member.isWorkshop)
  };
}

export function buildCourseListings(sessions: DanceSession[], todayIso: string): CourseListing[] {
  const groups = new Map<string, DanceSession[]>();
  for (const session of sessions) {
    if (!session.isCourse) continue;
    const key = courseGroupKey(session);
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }

  const statusOrder: Record<CourseStatus, number> = { upcoming: 0, "in-progress": 1, "dates-tbc": 2 };
  return [...groups.entries()]
    .map(([key, members]) => buildListing(key, members, todayIso))
    .filter((listing): listing is CourseListing => Boolean(listing))
    .sort((a, b) => {
      const statusDifference = statusOrder[a.status] - statusOrder[b.status];
      if (statusDifference !== 0) return statusDifference;
      if (a.status === "upcoming") {
        const dateDifference = (a.startDate ?? "9999-12-31").localeCompare(b.startDate ?? "9999-12-31");
        if (dateDifference !== 0) return dateDifference;
      }
      if (a.status === "in-progress") {
        const dateDifference = (a.endDate ?? "9999-12-31").localeCompare(b.endDate ?? "9999-12-31");
        if (dateDifference !== 0) return dateDifference;
      }
      return a.title.localeCompare(b.title) || a.venue.localeCompare(b.venue);
    });
}

export function excerptCourseDetails(details: string, maxLength = 240): string {
  if (details.length <= maxLength) return details;
  const shortened = details.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = shortened.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? shortened.slice(0, lastSpace) : shortened).trimEnd()}…`;
}
