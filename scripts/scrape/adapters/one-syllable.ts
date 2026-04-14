import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchJson } from "./common";

const sourceUrl = "https://1syllable.org/events/category/classes-and-training/";
const apiBaseUrl = "https://1syllable.org/wp-json/tribe/events/v1/events/";

type OneSyllableEvent = {
  id: number;
  title?: string;
  description?: string;
  excerpt?: string;
  url?: string;
  all_day?: boolean;
  utc_start_date?: string;
  utc_end_date?: string;
  venue?: {
    venue?: string;
    address?: string;
    city?: string;
  };
};

type OneSyllableEventsResponse = {
  events?: OneSyllableEvent[];
  total_pages?: number;
};

function stripHtml(html: string | undefined): string | null {
  const raw = (html ?? "").trim();
  if (!raw) return null;
  const $ = cheerio.load(raw);
  const text = $.text().replace(/\s+/g, " ").trim();
  return text || null;
}

function parseUtcDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatLocalDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long"
  }).format(date);
}

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function toClassRow(event: OneSyllableEvent): ScrapedClass | null {
  const title = event.title?.trim();
  const bookingUrl = event.url?.trim() || sourceUrl;
  const start = parseUtcDate(event.utc_start_date);
  const end = parseUtcDate(event.utc_end_date) ?? start;
  if (!title || !start) return null;

  const venueName = event.venue?.venue?.trim() || "1Syllable";
  const venueAddress = [event.venue?.address, event.venue?.city].filter(Boolean).join(", ");
  const bodyText = stripHtml(event.excerpt) ?? stripHtml(event.description);
  const details = [venueAddress || null, bodyText].filter(Boolean).join(" • ") || null;

  const time =
    event.all_day === true || !end
      ? null
      : `${formatLocalTime(start)}${start.getTime() === end.getTime() ? "" : ` - ${formatLocalTime(end)}`}`;

  return {
    venue: venueName,
    title,
    details,
    dayOfWeek: formatLocalDay(start),
    time,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end ?? start),
    bookingUrl,
    sourceUrl: bookingUrl
  };
}

function buildApiUrl(page: number): string {
  const params = new URLSearchParams({
    categories: "classes-and-training",
    per_page: "50",
    page: String(page)
  });
  return `${apiBaseUrl}?${params.toString()}`;
}

export async function scrapeOneSyllable(): Promise<AdapterOutput> {
  try {
    const rows: ScrapedClass[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await fetchJson<OneSyllableEventsResponse>(buildApiUrl(page));
      totalPages = Math.max(1, response.total_pages ?? 1);
      for (const event of response.events ?? []) {
        const row = toClassRow(event);
        if (row) rows.push(row);
      }
      page += 1;
    }

    const uniqueRows = Array.from(new Map(rows.map((row) => [`${row.title}|${row.startDate}|${row.time}`, row])).values());
    return {
      venueKey: "oneSyllable",
      venue: "1Syllable",
      sourceUrl,
      classes: uniqueRows,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "oneSyllable",
      venue: "1Syllable",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
