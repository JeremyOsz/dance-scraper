import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const archiveUrl = "https://www.siobhandavies.com/events/";
const legacySourceUrl = "https://www.siobhandavies.com/events/classes-2/";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const excludedClassPattern = /\b(yoga|pilates)\b/i;
const toMoveTogetherPathPattern = /\/classes\/to-move-together\/?$/i;
const timeRangePattern =
  /\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?\s*(?:-|–|—|to)\s*(?:\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)|\d{1,2}\s*(?:noon|midnight)|noon|midnight)/i;

export async function scrapeSiobhanDavies(): Promise<AdapterOutput> {
  try {
    let archiveHtml: string | null = null;
    try {
      archiveHtml = await fetchHtml(archiveUrl);
    } catch {
      archiveHtml = null;
    }

    const sourceUrl = archiveHtml ? resolveSourceUrlFromArchive(archiveHtml) : legacySourceUrl;
    const html = await fetchHtml(sourceUrl);
    const classes = parseClasses(html, sourceUrl);
    const unscaryEvents = archiveHtml ? parseUnscarySaturdaysFromArchive(archiveHtml) : [];
    const combined = [...classes, ...unscaryEvents];

    const unique = Array.from(new Map(combined.map((c) => [c.title + c.bookingUrl + (c.dayOfWeek ?? "na"), c])).values());
    const weekdayKeys = new Set(
      unique
        .filter((item) => weekdays.some((day) => item.dayOfWeek === day))
        .map((item) => `${item.title}|${item.bookingUrl}`)
    );
    const cleaned = unique.filter((item) => !(item.dayOfWeek === null && weekdayKeys.has(`${item.title}|${item.bookingUrl}`)));
    const filtered = cleaned.filter((item) => !excludedClassPattern.test(`${item.title} ${item.details ?? ""}`));
    const withMonthlyExpansion = await expandMonthlyOneOffs(filtered, sourceUrl);

    return {
      venueKey: "siobhanDavies",
      venue: "Siobhan Davies Studios",
      sourceUrl,
      classes: withMonthlyExpansion,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "siobhanDavies",
      venue: "Siobhan Davies Studios",
      sourceUrl: legacySourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function resolveSourceUrlFromArchive(html: string): string {
  const $ = cheerio.load(html);
  const archiveMatches = $("article.event a[href]")
    .toArray()
    .filter((el) => /\bdance classes at sds\b/i.test($(el).text().replace(/\s+/g, " ").trim()));
  return selectMostRecentClassesUrl($, archiveMatches) ?? legacySourceUrl;
}

function selectMostRecentClassesUrl($: cheerio.CheerioAPI, links: Element[]): string | null {
  const candidates = links
    .map((el) => {
      const card = $(el).closest("article.event");
      const dateText = card.find(".entry-title span").first().text().replace(/\s+/g, " ").trim();
      return {
        href: el.attribs.href,
        endDate: parseArchiveEndDate(dateText)
      };
    })
    .filter((item) => item.href);

  if (candidates.length === 0) return null;

  const withParsedDates = candidates.filter((item) => item.endDate !== null);
  const preferred = withParsedDates.length > 0
    ? withParsedDates.sort((a, b) => (a.endDate as number) - (b.endDate as number)).at(-1)
    : candidates.at(-1);

  return absoluteUrl(archiveUrl, preferred?.href);
}

function parseArchiveEndDate(text: string): number | null {
  if (!text) return null;
  const parts = text.split(/\s+[–-]\s+/);
  const endPart = (parts.length > 1 ? parts[1] : parts[0])?.trim();
  if (!endPart) return null;

  const match = endPart.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (!match) return null;

  const day = Number(match[1]);
  const monthName = match[2].toLowerCase();
  const year = Number(match[3]);
  const month = monthIndex(monthName);
  if (month === null || Number.isNaN(day) || Number.isNaN(year)) return null;

  return Date.UTC(year, month, day);
}

function monthIndex(name: string): number | null {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const idx = months.findIndex((month) => month.startsWith(name));
  return idx >= 0 ? idx : null;
}

function parseClasses(html: string, sourceUrl: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];

  let currentDay: string | null = null;
  $(".entry-content h2, .entry-content h3, .entry-content h4, .entry-content p, .entry-content div").each((_, el) => {
    const $el = $(el);
    if ($el.is("h2, h3")) {
      const heading = $el.text().trim();
      if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?$/i.test(heading)) {
        currentDay = heading.replace(/s$/i, "");
      } else if (/^weekdays?$/i.test(heading)) {
        currentDay = "Weekdays";
      }
    }

    const heading = $el.is("h4") ? $el.text().trim() : $el.find("h4").first().text().trim();
    const title = heading.replace(/^\s+|\s+$/g, "");
    if (!title) return;
    if (/more info|book now/i.test(title)) return;

    const details = $el.find("p").first().text().trim() || null;
    const text = $el.text().replace(/\s+/g, " ").trim();
    const time = text.match(timeRangePattern)?.[0] ?? null;
    const bookingUrl = absoluteUrl(
      sourceUrl,
      $el.find('a[href*="/classes/"], a[href*="bookwhen"], a[href*="siobhandavies.com/classes"]').first().attr("href")
    );
    if (!bookingUrl) return;

    const days = currentDay === "Weekdays" ? weekdays : [currentDay];
    for (const dayOfWeek of days) {
      classes.push({
        venue: "Siobhan Davies Studios",
        title,
        details,
        dayOfWeek,
        time,
        startDate: null,
        endDate: null,
        bookingUrl,
        sourceUrl
      });
    }
  });

  return classes;
}

function parseUnscarySaturdaysFromArchive(html: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];

  $("article.event").each((_, article) => {
    const link = $(article).find(".entry-title a[href]").first();
    const href = absoluteUrl(archiveUrl, link.attr("href"));
    if (!href) return;

    const title = link.clone().find("span").remove().end().text().replace(/\s+/g, " ").trim();
    if (!/\bunscary\s+saturdays\b/i.test(title)) return;

    const meta = link.find("span").first().text().replace(/\s+/g, " ").trim();
    const startDate = parseArchiveIsoDate(meta);

    classes.push({
      venue: "Siobhan Davies Studios",
      title,
      details: null,
      dayOfWeek: startDate ? isoToDayName(startDate) : null,
      time: parseArchiveTimeRange(meta),
      startDate,
      endDate: startDate,
      bookingUrl: href,
      sourceUrl: href
    });
  });

  return classes;
}

function parseArchiveIsoDate(text: string): string | null {
  const match = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (!match) return null;

  const day = Number(match[1]);
  const month = monthIndex(match[2].toLowerCase());
  const year = Number(match[3]);
  if (month === null || Number.isNaN(day) || Number.isNaN(year)) return null;

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseArchiveTimeRange(text: string): string | null {
  return text.match(timeRangePattern)?.[0] ?? null;
}

async function expandMonthlyOneOffs(classes: AdapterOutput["classes"], sourceUrl: string): Promise<AdapterOutput["classes"]> {
  const expanded = await Promise.all(classes.map((item) => expandClassMonthlyInstances(item, sourceUrl)));
  return expanded.flat();
}

async function expandClassMonthlyInstances(
  klass: AdapterOutput["classes"][number],
  sourceUrl: string
): Promise<AdapterOutput["classes"]> {
  if (!toMoveTogetherPathPattern.test(klass.bookingUrl)) {
    return [klass];
  }

  try {
    const html = await fetchHtml(klass.bookingUrl);
    const $ = cheerio.load(html);
    const timetableText = $(".entry-content h3, .entry-content p")
      .toArray()
      .map((el) => $(el).text().replace(/\s+/g, " ").trim())
      .find((text) => /\bmonthly\b/i.test(text) && /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text));

    if (!timetableText) {
      return [klass];
    }

    const year = inferSeasonYear(sourceUrl);
    const dates = parseMonthDayInstances(timetableText, year);
    if (dates.length === 0) {
      return [klass];
    }

    return dates.map((iso) => ({
      ...klass,
      dayOfWeek: isoToDayName(iso),
      startDate: iso,
      endDate: iso
    }));
  } catch {
    return [klass];
  }
}

function inferSeasonYear(sourceUrl: string): number {
  const match = sourceUrl.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : new Date().getUTCFullYear();
}

function parseMonthDayInstances(text: string, year: number): string[] {
  const matches = Array.from(text.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?=[^\d]|\d[.:])/g));
  const dates = matches
    .map(([, monthToken, dayToken]) => {
      const month = monthIndex(monthToken.toLowerCase());
      const day = Number(dayToken);
      if (month === null || Number.isNaN(day)) return null;
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(dates));
}

function isoToDayName(iso: string): string | null {
  const [yearToken, monthToken, dayToken] = iso.split("-");
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(date);
}
