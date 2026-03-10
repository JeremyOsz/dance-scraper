import { addMonths, format } from "date-fns";
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

export async function scrapeBachataCommunity(): Promise<AdapterOutput> {
  try {
    const page = await fetchHtml(sourceUrl);
    const calendarIds = Array.from(
      new Set((page.match(/data-calendar-id="(\d+)"/g) ?? []).map((m) => Number(m.match(/"(\d+)"/)?.[1] ?? 0)).filter(Boolean))
    );

    const ids = calendarIds.length ? calendarIds : [1, 2];
    const anchor = new Date();
    const months = [anchor, addMonths(anchor, 1)];

    const classes: AdapterOutput["classes"] = [];

    for (const calendarId of ids) {
      for (const monthDate of months) {
        const year = format(monthDate, "yyyy");
        const month = format(monthDate, "M");
        const endpoint = `${apiBase}?year=${year}&month=${month}&calendar_id=${calendarId}`;
        const raw = await fetchHtml(endpoint);
        const data = JSON.parse(raw) as MonthEvents;

        for (const [date, events] of Object.entries(data)) {
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
              dayOfWeek: format(new Date(`${date}T00:00:00`), "EEEE"),
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
      ok: true,
      error: null
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
