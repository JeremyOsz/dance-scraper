import { format } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const organizerUrls = [
  "https://www.eventbrite.com/o/73047023743",
  "https://www.eventbrite.com/o/8588572090",
  "https://www.eventbrite.com/o/18505959226"
];

type EventbriteEvent = {
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  name?: string;
};

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

function extractEventsFromLd(ldEntry: unknown): EventbriteEvent[] {
  if (!ldEntry || typeof ldEntry !== "object") return [];

  const obj = ldEntry as Record<string, unknown>;
  if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
    return obj.itemListElement
      .map((item) => (item as { item?: EventbriteEvent }).item)
      .filter((event): event is EventbriteEvent => Boolean(event));
  }

  return [];
}

export async function scrapeEcstaticDanceLondon(): Promise<AdapterOutput> {
  try {
    const classes: AdapterOutput["classes"] = [];

    for (const organizerUrl of organizerUrls) {
      const html = await fetchHtml(organizerUrl);
      const ldEntries = extractJsonLd(html);
      const events = ldEntries.flatMap(extractEventsFromLd);

      for (const event of events) {
        if (!event.name || !event.url || !event.startDate) continue;

        const lowered = `${event.name} ${event.description ?? ""}`.toLowerCase();
        if (!/(ecstatic|conscious dance|5rhythms|five rhythms|movement|dance)/i.test(lowered)) {
          continue;
        }

        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : null;

        classes.push({
          venue: "Ecstatic Dance London",
          title: event.name,
          details: (event.description ?? "").replace(/\s+/g, " ").trim() || null,
          dayOfWeek: format(start, "EEEE"),
          time: `${format(start, "HH:mm")}${end ? ` - ${format(end, "HH:mm")}` : ""}`,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(start, "yyyy-MM-dd"),
          bookingUrl: event.url,
          sourceUrl: organizerUrl
        });
      }
    }

    return {
      venueKey: "ecstaticDanceLondon",
      venue: "Ecstatic Dance London",
      sourceUrl: organizerUrls[0],
      classes: Array.from(new Map(classes.map((c) => [c.title + c.startDate + c.bookingUrl, c])).values()),
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
