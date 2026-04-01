import { addMonths, format, isValid, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://bachatacommunity.space/";
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
