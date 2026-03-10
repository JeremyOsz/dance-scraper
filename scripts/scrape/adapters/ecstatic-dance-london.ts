import { format } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const organizerUrls = [
  "https://www.eventbrite.com/o/73047023743",
  "https://www.eventbrite.com/o/8588572090",
  "https://www.eventbrite.com/o/18505959226"
];
const luminousDandelionIcsUrl = "https://dandelion.events/o/luminous/events.ics?slug=luminous";

const browserLikeHeaders = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
};

type EventbriteEvent = {
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  name?: string;
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

function extractEventsFromLd(ldEntry: unknown): EventbriteEvent[] {
  return collectEvents(ldEntry).filter((event) => Boolean(event.name && event.url && event.startDate));
}

export async function scrapeEcstaticDanceLondon(): Promise<AdapterOutput> {
  try {
    const classes: AdapterOutput["classes"] = [];

    for (const organizerUrl of organizerUrls) {
      const html = await fetchHtml(organizerUrl, browserLikeHeaders);
      const ldEntries = extractJsonLd(html);
      const events = ldEntries.flatMap(extractEventsFromLd);

      for (const event of events) {
        const lowered = `${event.name} ${event.description ?? ""}`.toLowerCase();
        if (!/(dance|ecstatic|conscious|movement|salsa|rueda|bachata|butoh|cuban|latin|theatre)/i.test(lowered)) {
          continue;
        }

        const start = new Date(event.startDate);
        if (Number.isNaN(start.getTime())) continue;
        const end = event.endDate ? new Date(event.endDate) : null;
        const safeEnd = end && !Number.isNaN(end.getTime()) ? end : null;

        classes.push({
          venue: "Ecstatic Dance London",
          title: event.name,
          details: (event.description ?? "").replace(/\s+/g, " ").trim() || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${safeEnd ? ` - ${format(safeEnd, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(safeEnd ?? start, "yyyy-MM-dd"),
          bookingUrl: event.url,
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

        const lowered = `${title} ${description ?? ""}`.toLowerCase();
        if (!/(dance|ecstatic|conscious|movement|salsa|rueda|bachata|butoh|cuban|latin|theatre)/i.test(lowered)) {
          continue;
        }

        classes.push({
          venue: "Ecstatic Dance London",
          title,
          details: [location, description].filter(Boolean).join(" • ") || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${end ? ` - ${format(end, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end ?? start, "yyyy-MM-dd"),
          bookingUrl: description?.match(/^https?:\/\/\S+$/)?.[0] ?? luminousDandelionIcsUrl,
          sourceUrl: "https://dandelion.events/o/luminous/events"
        });
      }
    } catch {
      // Keep Eventbrite data even if Dandelion is unavailable.
    }

    return {
      venueKey: "ecstaticDanceLondon",
      venue: "Ecstatic Dance London",
      sourceUrl: organizerUrls[0],
      classes: Array.from(new Map(classes.map((c) => [toKey(c.title, c.startDate, c.time), c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "ecstaticDanceLondon",
      venue: "Ecstatic Dance London",
      sourceUrl: organizerUrls[0],
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
