import { format } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const organizerUrl = "https://www.eventbrite.com/o/88584641013";
const organizerUkUrl = "https://www.eventbrite.co.uk/o/daniel-rodriguez-88584641013";

const browserLikeHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
};

type EventbriteEvent = {
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  summary?: string;
  url?: string;
  name?: string;
};

type CompleteEventbriteEvent = EventbriteEvent & {
  name: string;
  url: string;
  startDate: string;
};

function toKey(title: string, startDate: string | null, time: string | null) {
  return `${title.trim().toLowerCase()}|${startDate ?? "na"}|${time ?? "na"}`;
}

function extractJsonLd(html: string): unknown[] {
  const $ = cheerio.load(html);
  const entries: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      entries.push(JSON.parse(raw));
    } catch {
      // Ignore malformed JSON-LD fragments.
    }
  });
  return entries;
}

function collectEvents(value: unknown): EventbriteEvent[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEvents(item));
  }
  if (typeof value !== "object") return [];

  const obj = value as Record<string, unknown>;
  if (obj["@type"] === "Event") {
    return [obj as EventbriteEvent];
  }

  if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
    return obj.itemListElement.flatMap((item) => {
      if (item && typeof item === "object" && "item" in (item as Record<string, unknown>)) {
        return collectEvents((item as { item?: unknown }).item);
      }
      return collectEvents(item);
    });
  }

  return Object.values(obj).flatMap((next) => collectEvents(next));
}

function extractEventsFromLd(ldEntry: unknown): CompleteEventbriteEvent[] {
  return collectEvents(ldEntry).filter((event): event is CompleteEventbriteEvent => {
    return typeof event.name === "string" && typeof event.url === "string" && typeof event.startDate === "string";
  });
}

function extractEventsFromNextData(html: string): CompleteEventbriteEvent[] {
  const $ = cheerio.load(html);
  const rawNextData = $('script[id="__NEXT_DATA__"]').first().text().trim();
  if (!rawNextData) return [];

  try {
    const parsed = JSON.parse(rawNextData) as {
      props?: { pageProps?: { upcomingEvents?: EventbriteEvent[] } };
    };
    const upcomingEvents = parsed?.props?.pageProps?.upcomingEvents;
    if (!Array.isArray(upcomingEvents)) return [];

    const normalized: CompleteEventbriteEvent[] = [];
    for (const event of upcomingEvents) {
      const startDate = event.start_date && event.start_time ? `${event.start_date}T${event.start_time}` : event.start_date;
      if (!startDate || !event.name || !event.url) {
        continue;
      }
      const endDate = event.end_date && event.end_time ? `${event.end_date}T${event.end_time}` : event.end_date;
      normalized.push({
        name: event.name,
        url: event.url,
        startDate,
        ...(endDate ? { endDate } : {}),
        description: event.summary ?? event.description
      });
    }
    return normalized;
  } catch {
    return [];
  }
}

function toLocalDayStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function scrapeDanielRodriguezEventbrite(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(organizerUrl, browserLikeHeaders);
    const ldEntries = extractJsonLd(html);
    const ldEvents = ldEntries.flatMap(extractEventsFromLd);
    const events = ldEvents.length > 0 ? ldEvents : extractEventsFromNextData(html);
    const today = toLocalDayStart();

    const classes = events
      .map((event) => {
        const start = new Date(event.startDate);
        if (Number.isNaN(start.getTime()) || start < today) return null;
        const end = event.endDate ? new Date(event.endDate) : null;
        const safeEnd = end && !Number.isNaN(end.getTime()) ? end : null;

        return {
          venue: "Daniel Rodriguez",
          title: event.name,
          details: (event.description ?? "").replace(/\s+/g, " ").trim() || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${safeEnd ? ` - ${format(safeEnd, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(safeEnd ?? start, "yyyy-MM-dd"),
          bookingUrl: event.url,
          sourceUrl: organizerUkUrl
        };
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event));

    return {
      venueKey: "danielRodriguezEventbrite",
      venue: "Daniel Rodriguez",
      sourceUrl: organizerUkUrl,
      classes: Array.from(new Map(classes.map((c) => [toKey(c.title, c.startDate, c.time), c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "danielRodriguezEventbrite",
      venue: "Daniel Rodriguez",
      sourceUrl: organizerUkUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
