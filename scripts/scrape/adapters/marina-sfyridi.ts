import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.eventbrite.co.uk/e/circadian-bodies-march-dance-classes-tickets-1984132482667";

type EventLd = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
};

const MONTH_TO_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function extractFallbackDate(text: string): Date | null {
  const match = text.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\b/i
  );
  if (!match) return null;
  const month = MONTH_TO_INDEX[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, month, day);
}

function formatDayOfWeek(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(date);
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatTime(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function firstText(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = (value ?? "").replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return null;
}

function findEventLd(value: unknown): EventLd | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEventLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as { "@type"?: string | string[]; "@graph"?: unknown[] };
  const types = Array.isArray(obj["@type"]) ? obj["@type"] : obj["@type"] ? [obj["@type"]] : [];
  if (types.some((type) => /event$/i.test(type))) return value as EventLd;
  if (Array.isArray(obj["@graph"])) {
    for (const node of obj["@graph"]) {
      const found = findEventLd(node);
      if (found) return found;
    }
  }
  return null;
}

export async function scrapeMarinaSfyridi(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);

    let eventData: EventLd | null = null;
    for (const element of $("script[type='application/ld+json']").toArray()) {
      const raw = $(element).html();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        eventData = findEventLd(parsed);
        if (eventData) break;
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    }

    const parsedStart = parseIsoDate(eventData?.startDate);
    const parsedEnd = parseIsoDate(eventData?.endDate);
    const fallbackDate = extractFallbackDate(
      `${eventData?.description ?? ""} ${$("meta[name='description']").attr("content") ?? ""} ${$("body").text()}`
    );
    const start = parsedStart ?? fallbackDate;
    const end = parsedEnd;
    const startText = parsedStart ? formatTime(start) : null;
    const endText = parsedEnd ? formatTime(end) : null;
    const time = startText && endText ? `${startText} - ${endText}` : startText;

    const title = firstText([
      eventData?.name,
      $("h1").first().text()
    ]);
    const details = firstText([
      eventData?.description,
      $("meta[name='description']").attr("content")
    ]);

    if (!title) {
      return {
        venueKey: "marinaSfyridi",
        venue: "Marina Sfyridi",
        sourceUrl,
        classes: [],
        ok: true,
        error: null
      };
    }

    return {
      venueKey: "marinaSfyridi",
      venue: "Marina Sfyridi",
      sourceUrl,
      classes: [
        {
          venue: "Marina Sfyridi",
          title,
          details,
          dayOfWeek: formatDayOfWeek(start),
          time,
          startDate: formatDate(start),
          endDate: formatDate(end ?? start),
          bookingUrl: firstText([eventData?.url, sourceUrl]) ?? sourceUrl,
          sourceUrl
        }
      ],
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "marinaSfyridi",
      venue: "Marina Sfyridi",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
