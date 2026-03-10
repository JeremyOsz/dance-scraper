import { format } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.butohuk.com/";
const ticketTailorUrl = "https://www.tickettailor.com/events/thestudysociety/2025925";
const browserLikeHeaders = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
};

type JsonLdEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
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
      // Ignore invalid JSON-LD fragments.
    }
  });
  return entries;
}

function collectEvents(value: unknown): JsonLdEvent[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEvents(item));
  }
  if (typeof value !== "object") return [];

  const obj = value as Record<string, unknown>;
  if (obj["@type"] === "Event") {
    return [obj as JsonLdEvent];
  }

  return Object.values(obj).flatMap((next) => collectEvents(next));
}

function fallbackClass(details: string | null): AdapterOutput["classes"][number] {
  return {
    venue: "Butoh Mutation",
    title: "Butoh Mutation Classes & Workshops",
    details: details ?? "Source currently unavailable. Check venue page for latest schedule.",
    dayOfWeek: null,
    time: null,
    startDate: null,
    endDate: null,
    bookingUrl: sourceUrl,
    sourceUrl
  };
}

export async function scrapeButohMutation(): Promise<AdapterOutput> {
  let metaDescription: string | null = null;
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null;
  } catch {
    // Keep going and try TicketTailor.
  }

  const classes: AdapterOutput["classes"] = [];
  try {
    const html = await fetchHtml(ticketTailorUrl, browserLikeHeaders);
    const events = extractJsonLd(html).flatMap((entry) => collectEvents(entry));

    for (const event of events) {
      const text = `${event.name ?? ""} ${event.description ?? ""}`;
      if (!/butoh/i.test(text)) continue;
      if (!event.startDate) continue;

      const start = new Date(event.startDate);
      if (Number.isNaN(start.getTime())) continue;
      const end = event.endDate ? new Date(event.endDate) : null;
      const safeEnd = end && !Number.isNaN(end.getTime()) ? end : null;

      classes.push({
        venue: "Butoh Mutation",
        title: event.name?.trim() || "Butoh Mutation Classes & Workshops",
        details: (event.description ?? "").replace(/\s+/g, " ").trim() || metaDescription,
        dayOfWeek: format(start, "EEEE"),
        time: `${format(start, "HH:mm")}${safeEnd ? ` - ${format(safeEnd, "HH:mm")}` : ""}`,
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(safeEnd ?? start, "yyyy-MM-dd"),
        bookingUrl: event.url ?? ticketTailorUrl,
        sourceUrl: ticketTailorUrl
      });
    }
  } catch {
    // Keep fallback record when TicketTailor is unavailable.
  }

  return {
    venueKey: "butohMutation",
    venue: "Butoh Mutation",
    sourceUrl,
    classes:
      classes.length > 0
        ? Array.from(new Map(classes.map((session) => [toKey(session.title, session.startDate, session.time), session])).values())
        : [fallbackClass(metaDescription)],
    ok: true,
    error: null
  };
}
