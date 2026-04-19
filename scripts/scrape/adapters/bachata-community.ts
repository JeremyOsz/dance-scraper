import { addMonths, format, isValid, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://bachatacommunity.space/";
const supabaseRpcUrl = "https://stsdtacfauprzrdebmzg.supabase.co/rest/v1/rpc/get_calendar_events";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c2R0YWNmYXVwcnpyZGVibXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjAwODEsImV4cCI6MjA4MDU5NjA4MX0.16NNYdrWeTtl3_AylxmOLK6Vrxf7SEGsZIwMSrJl3OQ";
const sourceCalendarUrl = "https://bachatacommunity.space/london-gb/calendar";
const apiBase = "https://bachatacommunity.space/wp-json/simple-event-calendar/v1/month-events";

type MonthEvents = Record<
  string,
  Array<{
    event_name: string;
    event_start_time: string;
    event_end_time: string;
    event_address: string;
    event_url: string;
    calendar_id: string;
  }>
>;

type SupabaseCalendarEvent = {
  event_id: string;
  name: string;
  location: string | null;
  instance_date: string | null;
  occurrence_starts_at: string | null;
  occurrence_ends_at: string | null;
  start_time?: string | null;
  end_time?: string | null;
  city_slug?: string | null;
};

function parseMonthEvents(raw: string): MonthEvents {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const result: MonthEvents = {};
  for (const [dateKey, events] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(events)) continue;
    const normalizedEvents = events
      .filter((event): event is MonthEvents[string][number] => Boolean(event) && typeof event === "object")
      .map((event) => ({
        event_name: String(event.event_name ?? ""),
        event_start_time: String(event.event_start_time ?? ""),
        event_end_time: String(event.event_end_time ?? ""),
        event_address: String(event.event_address ?? ""),
        event_url: String(event.event_url ?? ""),
        calendar_id: String(event.calendar_id ?? "")
      }))
      .filter((event) => Boolean(event.event_name.trim()));
    if (normalizedEvents.length) result[dateKey] = normalizedEvents;
  }

  return result;
}

function parseSupabaseEvents(raw: string): SupabaseCalendarEvent[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      event_id: String(item.event_id ?? ""),
      name: String(item.name ?? ""),
      location: item.location ? String(item.location) : null,
      instance_date: item.instance_date ? String(item.instance_date) : null,
      occurrence_starts_at: item.occurrence_starts_at ? String(item.occurrence_starts_at) : null,
      occurrence_ends_at: item.occurrence_ends_at ? String(item.occurrence_ends_at) : null,
      start_time: item.start_time ? String(item.start_time) : null,
      end_time: item.end_time ? String(item.end_time) : null,
      city_slug: item.city_slug ? String(item.city_slug) : null
    }))
    .filter((item) => Boolean(item.event_id && item.name));
}

function formatTimeRange(startIso: string | null, endIso: string | null): string | null {
  if (!startIso && !endIso) return null;
  const start = startIso ? parseISO(startIso) : null;
  const end = endIso ? parseISO(endIso) : null;
  const startLabel = start && isValid(start) ? format(start, "HH:mm") : null;
  const endLabel = end && isValid(end) ? format(end, "HH:mm") : null;
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel ?? endLabel;
}

async function fetchBachataFromSupabase(anchorDate: Date): Promise<AdapterOutput["classes"]> {
  const rangeStart = new Date(anchorDate);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = addMonths(rangeStart, 2);
  rangeEnd.setHours(23, 59, 59, 999);

  const endpoint =
    `${supabaseRpcUrl}?` +
    `range_start=${encodeURIComponent(rangeStart.toISOString())}` +
    `&range_end=${encodeURIComponent(rangeEnd.toISOString())}` +
    `&city_slug_param=london-gb`;
  const raw = await fetchHtml(endpoint, {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`
  });
  const events = parseSupabaseEvents(raw);
  const classes: AdapterOutput["classes"] = [];

  for (const event of events) {
    const dateIso = event.instance_date && /^\d{4}-\d{2}-\d{2}$/.test(event.instance_date) ? event.instance_date : null;
    const dayOfWeek = dateIso ? format(parseISO(dateIso), "EEEE") : null;
    const startsAt = event.occurrence_starts_at ?? event.start_time ?? null;
    const endsAt = event.occurrence_ends_at ?? event.end_time ?? null;
    classes.push({
      venue: "Bachata Community",
      title: normalizeTitle(event.name),
      details: [stripHtml(event.location), "Bachata Calendar (London)"].filter(Boolean).join(" • ") || null,
      dayOfWeek,
      time: formatTimeRange(startsAt, endsAt),
      startDate: dateIso,
      endDate: dateIso,
      bookingUrl: `https://bachatacommunity.space/event/${event.event_id}`,
      sourceUrl: sourceCalendarUrl
    });
  }

  return Array.from(new Map(classes.map((c) => [c.title + c.startDate + c.bookingUrl, c])).values());
}

function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCalendarLabel(calendarId: number): string {
  if (calendarId === 1) return "Socials Calendar";
  if (calendarId === 2) return "Classes Calendar";
  return `Calendar ${calendarId}`;
}

function normalizeTitle(title: string): string {
  return title.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").replace(/\s+/g, " ").trim();
}

async function fetchBachataMonth(endpoint: string): Promise<string> {
  const headers = {
    Accept: "application/json, text/plain, */*",
    Referer: sourceUrl
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchHtml(endpoint, headers);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !/status code (429|5\d\d)/i.test(error.message) || attempt === 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch Bachata month payload");
}

export async function scrapeBachataCommunity(): Promise<AdapterOutput> {
  try {
    try {
      const classes = await fetchBachataFromSupabase(new Date());
      if (classes.length > 0) {
        return {
          venueKey: "bachataCommunity",
          venue: "Bachata Community",
          sourceUrl: sourceCalendarUrl,
          classes,
          ok: true,
          error: null
        };
      }
    } catch {
      // Fall through to legacy WordPress endpoint fallback.
    }

    let calendarIds: number[] = [];
    try {
      const page = await fetchHtml(sourceUrl);
      calendarIds = Array.from(
        new Set((page.match(/data-calendar-id="(\d+)"/g) ?? []).map((m) => Number(m.match(/"(\d+)"/)?.[1] ?? 0)).filter(Boolean))
      );
    } catch {
      calendarIds = [];
    }

    const ids = calendarIds.length ? calendarIds : [1, 2];
    const anchor = new Date();
    const months = [anchor, addMonths(anchor, 1)];

    const classes: AdapterOutput["classes"] = [];
    const endpointErrors: string[] = [];
    let successfulEndpointCount = 0;

    for (const calendarId of ids) {
      for (const monthDate of months) {
        const year = format(monthDate, "yyyy");
        const month = format(monthDate, "M");
        const endpoint = `${apiBase}?year=${year}&month=${month}&calendar_id=${calendarId}`;
        let data: MonthEvents = {};
        try {
          const raw = await fetchBachataMonth(endpoint);
          data = parseMonthEvents(raw);
          successfulEndpointCount += 1;
        } catch (error) {
          endpointErrors.push(`${endpoint}: ${error instanceof Error ? error.message : "Unknown error"}`);
          continue;
        }

        for (const [date, events] of Object.entries(data)) {
          const parsedDate = parseISO(date);
          if (!isValid(parsedDate)) continue;
          for (const event of events) {
            const title = normalizeTitle(event.event_name);
            if (!title) continue;

            const details = [inferCalendarLabel(calendarId), stripHtml(event.event_address)]
              .filter(Boolean)
              .join(" • ");

            const time = [event.event_start_time, event.event_end_time]
              .filter((v) => Boolean(v && v.trim()))
              .join(" - ");

            classes.push({
              venue: "Bachata Community",
              title,
              details: details || null,
              dayOfWeek: format(parsedDate, "EEEE"),
              time: time || null,
              startDate: date,
              endDate: date,
              bookingUrl: event.event_url || sourceUrl,
              sourceUrl
            });
          }
        }
      }
    }

    return {
      venueKey: "bachataCommunity",
      venue: "Bachata Community",
      sourceUrl,
      classes: Array.from(new Map(classes.map((c) => [c.title + c.startDate + c.bookingUrl, c])).values()),
      ok: successfulEndpointCount > 0,
      error:
        successfulEndpointCount > 0
          ? endpointErrors.length
            ? endpointErrors.join(" | ")
            : null
          : endpointErrors.join(" | ") || "Failed to load Bachata Community event calendars"
    };
  } catch (error) {
    return {
      venueKey: "bachataCommunity",
      venue: "Bachata Community",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
