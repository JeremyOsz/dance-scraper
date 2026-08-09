import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://linktr.ee/queersalsaldn";
const venue = "Queer Salsa";
const COURSE_URL_PATTERN = /^https:\/\/www\.queersalsa\.co\.uk\/queersalsa-courses\/p\//i;
const OUTSAVVY_URL_PATTERN = /^https:\/\/www\.outsavvy\.com\/event\//i;

type EventData = {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLinkedUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, sourceUrl);
    if (!COURSE_URL_PATTERN.test(url.href) && !OUTSAVVY_URL_PATTERN.test(url.href)) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function extractListingUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = $("a[href]")
    .toArray()
    .map((link) => normalizeLinkedUrl($(link).attr("href")))
    .filter((url): url is string => Boolean(url));
  return Array.from(new Set(urls));
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function londonDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function londonDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" }).format(date);
}

function londonTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function parseCoursePage(html: string, bookingUrl: string, now: Date): ScrapedClass[] {
  const $ = cheerio.load(html);
  const title = normalizeText($("h1.product-title, h1").first().text());
  const description = $(".product-description").first();
  const detailRoot = description.length > 0 ? description : $("main").first();
  const paragraphs = detailRoot.find("p").toArray().map((node) => normalizeText($(node).text())).filter(Boolean);
  const details = paragraphs.length > 0 ? paragraphs.join(" • ") : normalizeText(detailRoot.text());
  if (!title || !/salsa/i.test(`${title} ${details}`)) return [];

  const dateMatches = Array.from(
    new Map(
      Array.from(details.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)).map((match) => [`${Number(match[1])}/${Number(match[2])}`, match])
    ).values()
  );
  const timeMatch = details.match(/\b((?:[01]?\d|2[0-3]):\d{2})\s*(?:-|–|—|to)\s*((?:[01]?\d|2[0-3]):\d{2})\b/i);
  if (dateMatches.length === 0 || !timeMatch) return [];

  const currentMonth = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "numeric" }).format(now));
  let year = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric" }).format(now));
  let previousMonth: number | null = null;
  const seenDates = new Set<string>();
  const classes: ScrapedClass[] = [];

  for (const match of dateMatches) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (previousMonth === null && month < currentMonth - 1) year += 1;
    if (previousMonth !== null && month < previousMonth) year += 1;
    previousMonth = month;
    const date = isoDate(year, month, day);
    if (!date || seenDates.has(date)) continue;
    seenDates.add(date);
    const dateValue = new Date(`${date}T12:00:00Z`);
    classes.push({
      venue,
      title,
      details: details || null,
      dayOfWeek: londonDay(dateValue),
      time: `${timeMatch[1]} - ${timeMatch[2]}`,
      startDate: date,
      endDate: date,
      bookingUrl,
      sourceUrl
    });
  }

  return classes;
}

function isEventType(value: EventData["@type"]): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => typeof item === "string" && /Event$/i.test(item));
}

function collectEvents(value: unknown, events: EventData[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectEvents(item, events);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (isEventType(record["@type"] as EventData["@type"])) events.push(record as EventData);
  if (record["@graph"]) collectEvents(record["@graph"], events);
}

function decodeEntities(value: string | undefined): string {
  return normalizeText(cheerio.load(`<span>${value ?? ""}</span>`)("span").text());
}

function parseEventPage(html: string, bookingUrl: string, now: Date): ScrapedClass[] {
  const $ = cheerio.load(html);
  const events: EventData[] = [];
  for (const script of $("script[type='application/ld+json']").toArray()) {
    const raw = $(script).html();
    if (!raw) continue;
    try {
      collectEvents(JSON.parse(raw), events);
    } catch {
      // Ignore malformed metadata blocks and continue with the remaining ones.
    }
  }

  const today = londonDate(now);
  return events.flatMap((event): ScrapedClass[] => {
    const start = event.startDate ? new Date(event.startDate) : null;
    const end = event.endDate ? new Date(event.endDate) : start;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return [];
    const startDate = londonDate(start);
    if (startDate < today) return [];
    const title = decodeEntities(event.name);
    if (!title) return [];
    return [{
      venue,
      title,
      details: decodeEntities(event.description) || null,
      dayOfWeek: londonDay(start),
      time: `${londonTime(start)} - ${londonTime(end)}`,
      startDate,
      endDate: londonDate(end),
      bookingUrl,
      sourceUrl
    }];
  });
}

export async function scrapeQueerSalsa(): Promise<AdapterOutput> {
  try {
    const linktreeHtml = await fetchHtml(sourceUrl);
    const classes: ScrapedClass[] = [];
    const now = new Date();

    for (const listingUrl of extractListingUrls(linktreeHtml).slice(0, 12)) {
      try {
        const html = await fetchHtml(listingUrl);
        classes.push(
          ...(COURSE_URL_PATTERN.test(listingUrl)
            ? parseCoursePage(html, listingUrl, now)
            : parseEventPage(html, listingUrl, now))
        );
      } catch {
        // Keep other current listings if one linked page is temporarily unavailable.
      }
    }

    const unique = Array.from(
      new Map(classes.map((item) => [`${item.bookingUrl}|${item.startDate}|${item.title}`, item])).values()
    );
    return { venueKey: "queerSalsa", venue, sourceUrl, classes: unique, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "queerSalsa",
      venue,
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
