import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl =
  "https://www.outsavvy.com/event/32134/dance-movement-flow-workshop-experience?utm_source=ig&utm_medium=social&utm_content=link_in_bio";
const organizerUrl = "https://www.outsavvy.com/organiser/streammovement";

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .replace(/\s+/g, "")
    .toLowerCase();
}

function firstText(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = (value ?? "").replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return null;
}

function normalizeOutsavvyEventUrl(value: string) {
  const withoutOrigin = value.startsWith("http://") || value.startsWith("https://")
    ? new URL(value).pathname + (new URL(value).search || "")
    : value;
  const [pathOnly] = withoutOrigin.split(/[?#]/, 1);
  const cleanedPath = (pathOnly ?? "").replace(/&amp;/g, "&");
  return cleanedPath.startsWith("/event/") ? `https://www.outsavvy.com${cleanedPath}` : null;
}

function extractOrganizerEventUrls(html: string): string[] {
  const matches = [...html.matchAll(/\/event\/\d+\/[^"'\s<)]+/gi)].map((match) => match[0]);
  const urls = matches
    .map((match) => normalizeOutsavvyEventUrl(match))
    .filter((url): url is string => Boolean(url));
  return Array.from(new Set(urls));
}

type EventLd = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

function parseEventClass(html: string, bookingUrl: string): AdapterOutput["classes"][number] | null {
  const $ = cheerio.load(html);

  let eventData: EventLd | null = null;
  for (const element of $("script[type='application/ld+json']").toArray()) {
    const raw = $(element).html();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        eventData = parsed.find((item) => (item as { "@type"?: string })?.["@type"] === "Event") as EventLd | null;
      } else if (typeof parsed === "object" && parsed !== null) {
        const typed = parsed as { "@type"?: string; "@graph"?: unknown[] };
        if (typed["@type"] === "Event") {
          eventData = parsed as EventLd;
        } else if (Array.isArray(typed["@graph"])) {
          eventData = typed["@graph"].find((item) => (item as { "@type"?: string })?.["@type"] === "Event") as EventLd | null;
        }
      }
      if (eventData) break;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  const start = parseIsoDate(eventData?.startDate);
  const end = parseIsoDate(eventData?.endDate);
  const startText = formatTime(start);
  const endText = formatTime(end);
  const time = startText && endText ? `${startText} - ${endText}` : startText;

  const title = firstText([eventData?.name, $("h1").first().text()]);
  const details = firstText([eventData?.description, $("meta[name='description']").attr("content")]);
  if (!title) {
    return null;
  }

  const relevanceText = `${title} ${details ?? ""}`.toLowerCase();
  if (!/(dance|movement|streammovement)/i.test(relevanceText)) {
    return null;
  }

  return {
    venue: "StreamMovement",
    title,
    details,
    dayOfWeek: formatDayOfWeek(start),
    time,
    startDate: formatDate(start),
    endDate: formatDate(end ?? start),
    bookingUrl,
    sourceUrl
  };
}

export async function scrapeAdrianOutsavvy(): Promise<AdapterOutput> {
  try {
    const classes: AdapterOutput["classes"] = [];
    let eventUrls: string[] = [];
    try {
      const organizerHtml = await fetchHtml(organizerUrl);
      eventUrls = extractOrganizerEventUrls(organizerHtml);
    } catch {
      // Fallback below uses sourceUrl directly if organiser page cannot be read.
    }

    if (eventUrls.length === 0) {
      eventUrls = [sourceUrl];
    }

    for (const eventUrl of eventUrls.slice(0, 12)) {
      try {
        const eventHtml = await fetchHtml(eventUrl);
        const eventClass = parseEventClass(eventHtml, eventUrl);
        if (eventClass) {
          classes.push(eventClass);
        }
      } catch {
        // Ignore per-event failures and keep other listings.
      }
    }

    const uniqueClasses = Array.from(
      new Map(classes.map((eventClass) => [`${eventClass.title}|${eventClass.startDate ?? "na"}`, eventClass])).values()
    );

    return {
      venueKey: "adrianOutsavvy",
      venue: "StreamMovement",
      sourceUrl,
      classes: uniqueClasses,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "adrianOutsavvy",
      venue: "StreamMovement",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
