import { addDays, format } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchJson } from "./common";

const sourceUrl = "https://www.themanorldn.com/mvmt";
const bookingApiBase = "https://api.lemonbar.uk/api/admin/booking_sessions";
const bookingDaysToFetch = 7;
const locationId = 1;
const businessTypeIds = [4];

type BookingSession = {
  id: number;
  class_name?: string;
  class_description?: string;
  instructor_name?: string;
  start_date?: string;
  end_date?: string;
  start_time?: {
    hour?: number;
    minutes?: number;
  };
  duration?: {
    hour?: number;
    minutes?: number;
  };
  studio_name?: string;
  restriction?: string;
  business_credit_cost?: number;
  is_hide_from_customer?: boolean;
};

type BookingSessionsResponse = Record<string, BookingSession[]>;

function padTime(value: number): string {
  return String(Math.max(0, value)).padStart(2, "0");
}

function buildDateWindow(from: Date, days: number): string[] {
  return Array.from({ length: days }, (_, offset) => format(addDays(from, offset), "yyyy-MM-dd"));
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function toTimeRange(session: BookingSession): string | null {
  const startHour = session.start_time?.hour;
  const startMinute = session.start_time?.minutes;
  if (typeof startHour !== "number" || typeof startMinute !== "number") return null;

  const durationMinutes = (session.duration?.hour ?? 0) * 60 + (session.duration?.minutes ?? 0);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = startTotal + durationMinutes;
  const endHour = Math.floor(endTotal / 60) % 24;
  const endMinute = endTotal % 60;

  return `${padTime(startHour)}:${padTime(startMinute)} - ${padTime(endHour)}:${padTime(endMinute)}`;
}

function toClass(dateKey: string, session: BookingSession): ScrapedClass | null {
  if (session.is_hide_from_customer) return null;

  const title = normalizeText(session.class_name);
  if (!title) return null;

  const details = normalizeText(
    [session.class_description, session.instructor_name, session.restriction, session.studio_name]
      .map((part) => normalizeText(part))
      .filter(Boolean)
      .join(" | ")
  );

  const day = format(new Date(`${dateKey}T00:00:00`), "EEEE");

  return {
    venue: "The Manor / MVMT",
    title,
    details,
    dayOfWeek: day,
    time: toTimeRange(session),
    startDate: normalizeText(session.start_date)?.slice(0, 10) ?? dateKey,
    endDate: normalizeText(session.end_date)?.slice(0, 10) ?? normalizeText(session.start_date)?.slice(0, 10) ?? dateKey,
    bookingUrl: `${sourceUrl}#mvmt-timetable`,
    sourceUrl
  };
}

export async function scrapeTheManorMvmt(): Promise<AdapterOutput> {
  try {
    const dates = buildDateWindow(new Date(), bookingDaysToFetch);
    const params = new URLSearchParams({
      dates: JSON.stringify(dates),
      business_type_ids: JSON.stringify(businessTypeIds),
      location_id: String(locationId),
      type: "mvmt"
    });
    const response = await fetchJson<BookingSessionsResponse>(`${bookingApiBase}?${params.toString()}`);
    const classes = Object.entries(response).flatMap(([dateKey, sessions]) =>
      sessions.map((session) => toClass(dateKey, session)).filter((entry): entry is ScrapedClass => Boolean(entry))
    );

    return {
      venueKey: "theManorMvmt",
      venue: "The Manor / MVMT",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "theManorMvmt",
      venue: "The Manor / MVMT",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
