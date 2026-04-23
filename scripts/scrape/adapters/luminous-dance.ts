import { format } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const organizerUrls = [
  "https://www.eventbrite.com/o/73047023743",
  "https://www.eventbrite.com/o/8588572090",
  "https://www.eventbrite.com/o/18505959226",
  "https://www.eventbrite.co.uk/o/ecstatic-dance-uk-17916431216"
];
const luminousDandelionIcsUrl = "https://dandelion.events/o/luminous/events.ics?slug=luminous";
const luminousDandelionPageUrl = "https://dandelion.events/o/luminous/events";

const browserLikeHeaders = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
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

function decodeIcsText(value: string | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function readField(block: string, key: string): string | undefined {
  const regex = new RegExp(`^${key}(?:;[^:\\n]+)?:([\\s\\S]*?)(?=\\n[A-Z-]+(?:;[^:\\n]+)?:|\\nEND:VEVENT|$)`, "m");
  const match = block.match(regex);
  if (!match?.[1]) return undefined;
  return match[1].replace(/\n[ \t]/g, "").trim();
}

function parseIcsDate(value: string | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  if (text.endsWith("Z")) {
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
  }
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
}

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
      // Ignore invalid JSON-LD fragments.
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

function isLuminous(text: string) {
  return /\bluminous\b/i.test(text);
}

function toLocalDayStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function scrapeLuminousDance(): Promise<AdapterOutput> {
  try {
    const classes: AdapterOutput["classes"] = [];
    const today = toLocalDayStart();

    for (const organizerUrl of organizerUrls) {
      const html = await fetchHtml(organizerUrl, browserLikeHeaders);
      const ldEntries = extractJsonLd(html);
      const ldEvents = ldEntries.flatMap(extractEventsFromLd);
      const events = ldEvents.length > 0 ? ldEvents : extractEventsFromNextData(html);

      for (const event of events) {
        const lowered = `${event.name} ${event.description ?? ""}`.toLowerCase();
        if (!isLuminous(lowered)) continue;

        const start = new Date(event.startDate);
        if (Number.isNaN(start.getTime())) continue;
        if (start < today) continue;
        const end = event.endDate ? new Date(event.endDate) : null;
        const safeEnd = end && !Number.isNaN(end.getTime()) ? end : null;

        classes.push({
          venue: "Luminous Dance",
          title: event.name ?? "Luminous Dance",
          details: (event.description ?? "").replace(/\s+/g, " ").trim() || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${safeEnd ? ` - ${format(safeEnd, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(safeEnd ?? start, "yyyy-MM-dd"),
          bookingUrl: event.url ?? organizerUrl,
          sourceUrl: organizerUrl
        });
      }
    }

    try {
      const icsRaw = await fetchHtml(luminousDandelionIcsUrl, browserLikeHeaders);
      const eventBlocks = (icsRaw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []).map((block) => block.trim());
      for (const eventBlock of eventBlocks) {
        const title = decodeIcsText(readField(eventBlock, "SUMMARY"));
        const description = decodeIcsText(readField(eventBlock, "DESCRIPTION"));
        const location = decodeIcsText(readField(eventBlock, "LOCATION"));
        const start = parseIcsDate(readField(eventBlock, "DTSTART"));
        const end = parseIcsDate(readField(eventBlock, "DTEND"));
        if (!title || !start) continue;
        if (start < today) continue;

        const lowered = `${title} ${description ?? ""}`.toLowerCase();
        if (!isLuminous(lowered)) continue;

        classes.push({
          venue: "Luminous Dance",
          title,
          details: [location, description].filter(Boolean).join(" • ") || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${end ? ` - ${format(end, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end ?? start, "yyyy-MM-dd"),
          bookingUrl: description?.match(/^https?:\/\/\S+$/)?.[0] ?? luminousDandelionIcsUrl,
          sourceUrl: luminousDandelionPageUrl
        });
      }
    } catch {
      // Keep Eventbrite data even if Dandelion is unavailable.
    }

    return {
      venueKey: "luminousDance",
      venue: "Luminous Dance",
      sourceUrl: luminousDandelionPageUrl,
      classes: Array.from(new Map(classes.map((c) => [toKey(c.title, c.startDate, c.time), c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "luminousDance",
      venue: "Luminous Dance",
      sourceUrl: luminousDandelionPageUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
