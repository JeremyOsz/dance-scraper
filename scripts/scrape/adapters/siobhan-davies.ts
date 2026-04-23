import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const archiveUrl = "https://www.siobhandavies.com/events/";
const legacySourceUrl = "https://www.siobhandavies.com/events/classes-2/";
const independentDanceClassesUrl = "https://independentdance.co.uk/programme/category/classes/";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const excludedClassPattern = /\b(yoga|pilates)\b/i;
const toMoveTogetherPathPattern = /\/classes\/to-move-together\/?$/i;
const mondayNightImprovisationTitlePattern = /\bmonday\s+night\s+improvisation\b/i;
const morningClassTitlePattern = /^morning class$/i;
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

    const candidateSourceUrls = archiveHtml ? resolveSourceUrlsFromArchive(archiveHtml) : [legacySourceUrl];
    const { sourceUrl, html } = await fetchFirstAvailableSourcePage(candidateSourceUrls);
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
    const withLeaderInfo = await enrichMondayNightImprovisationLeaders(withMonthlyExpansion, sourceUrl);

    return {
      venueKey: "siobhanDavies",
      venue: "Siobhan Davies Studios",
      sourceUrl,
      classes: withLeaderInfo,
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

async function enrichMondayNightImprovisationLeaders(
  classes: AdapterOutput["classes"],
  sourceUrl: string
): Promise<AdapterOutput["classes"]> {
  const hasMondayNightImprovisation = classes.some((item) => mondayNightImprovisationTitlePattern.test(item.title));
  const hasMorningClass = classes.some((item) => morningClassTitlePattern.test(item.title));
  if (!hasMondayNightImprovisation && !hasMorningClass) return classes;

  try {
    const html = await fetchHtml(independentDanceClassesUrl);
    const seasonYear = inferSeasonYear(sourceUrl);
    let result = classes;

    const mondaySessions = extractMondayNightImprovisationSessions(html, seasonYear);
    if (mondaySessions.length > 0) {
      result = result.flatMap((item) => {
        if (!mondayNightImprovisationTitlePattern.test(item.title)) return [item];
        return mondaySessions.map((session) => ({
          ...item,
          title: `${item.title} with ${session.leader}`,
          dayOfWeek: session.startDate ? isoToDayName(session.startDate) : item.dayOfWeek,
          startDate: session.startDate,
          endDate: session.startDate,
          bookingUrl: session.bookingUrl
        }));
      });
    }

    const morningSessions = extractMorningClassSessions(html, seasonYear);
    if (morningSessions.length > 0) {
      const morningTemplate = result.find((item) => morningClassTitlePattern.test(item.title));
      if (morningTemplate) {
        const nonMorning = result.filter((item) => !morningClassTitlePattern.test(item.title));
        const expandedMorning = morningSessions.map((session) => ({
          ...morningTemplate,
          title: `${morningTemplate.title} with ${session.leader}`,
          dayOfWeek: session.startDate ? isoToDayName(session.startDate) : morningTemplate.dayOfWeek,
          startDate: session.startDate,
          endDate: session.startDate,
          bookingUrl: session.bookingUrl
        }));
        result = [...nonMorning, ...expandedMorning];
      }
    }

    return result;
  } catch {
    return classes;
  }
}

function extractMondayNightImprovisationSessions(
  html: string,
  seasonYear: number
): { leader: string; startDate: string | null; bookingUrl: string }[] {
  const $ = cheerio.load(html);
  const sessions: { leader: string; startDate: string | null; bookingUrl: string }[] = [];
  const seen = new Set<string>();

  $(".index-item--event").each((_, el) => {
    const title = $(el).find(".entry-title").first().text().replace(/\s+/g, " ").trim();
    const match = title.match(/^Monday Night Improvisation:\s*(.+)$/i);
    if (!match) return;
    const leader = match[1].replace(/\s+/g, " ").trim().replace(/:$/, "");
    const subtitle = $(el).find(".entry-subtitle").first().text().replace(/\s+/g, " ").trim();
    const startDate = parseIndependentDanceDayMonth(subtitle, seasonYear);
    const bookingUrl = absoluteUrl(independentDanceClassesUrl, $(el).find("a[href]").first().attr("href"));
    if (!leader || !bookingUrl) return;
    const dedupeKey = `${leader}|${startDate ?? "na"}|${bookingUrl}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    sessions.push({ leader, startDate, bookingUrl });
  });

  return sessions;
}

function extractMorningClassSessions(
  html: string,
  seasonYear: number
): { leader: string; startDate: string | null; bookingUrl: string }[] {
  const $ = cheerio.load(html);
  const sessions: { leader: string; startDate: string | null; bookingUrl: string }[] = [];
  const seen = new Set<string>();

  $(".index-item--event").each((_, el) => {
    const title = $(el).find(".entry-title").first().text().replace(/\s+/g, " ").trim();
    const match = title.match(/^Morning Class:\s*(.+)$/i);
    if (!match) return;
    const leader = match[1].replace(/\s+/g, " ").trim().replace(/:$/, "");
    const subtitle = $(el).find(".entry-subtitle").first().text().replace(/\s+/g, " ").trim();
    const dates = parseIndependentDanceDateRange(subtitle, seasonYear);
    const bookingUrl = absoluteUrl(independentDanceClassesUrl, $(el).find("a[href]").first().attr("href"));
    if (!leader || !bookingUrl || dates.length === 0) return;
    for (const startDate of dates) {
      const dedupeKey = `${leader}|${startDate}|${bookingUrl}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      sessions.push({ leader, startDate, bookingUrl });
    }
  });

  return sessions;
}

function parseIndependentDanceDayMonth(value: string, year: number): string | null {
  const match = value.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthIndex(match[2].toLowerCase());
  if (month === null || Number.isNaN(day)) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIndependentDanceDateRange(value: string, year: number): string[] {
  const rangeMatch = value.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s*(?:-|–|—|to)\s*(\d{1,2})\s+([A-Za-z]{3,9})\b/i);
  if (!rangeMatch) {
    const single = parseIndependentDanceDayMonth(value, year);
    return single ? [single] : [];
  }

  const startDay = Number(rangeMatch[1]);
  const startMonth = monthIndex(rangeMatch[2].toLowerCase());
  const endDay = Number(rangeMatch[3]);
  const endMonth = monthIndex(rangeMatch[4].toLowerCase());
  if (
    Number.isNaN(startDay) ||
    Number.isNaN(endDay) ||
    startMonth === null ||
    endMonth === null
  ) {
    return [];
  }

  const dates: string[] = [];
  const start = new Date(Date.UTC(year, startMonth, startDay));
  const end = new Date(Date.UTC(year, endMonth, endDay));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return [];
  }
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const iso = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(
      cursor.getUTCDate()
    ).padStart(2, "0")}`;
    dates.push(iso);
  }
  return dates;
}

function resolveSourceUrlsFromArchive(html: string): string[] {
  const $ = cheerio.load(html);
  const candidatesByHref = new Map<
    string,
    {
      href: string;
      endDate: number | null;
    }
  >();

  const archiveMatches = $("article.event a[href]")
    .toArray()
    .filter((el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const href = el.attribs.href ?? "";
      return /\bdance classes at sds\b/i.test(text) || /\/dance-classes-at-sds\/?$/i.test(href);
    });

  for (const el of archiveMatches) {
    const href = absoluteUrl(archiveUrl, el.attribs.href);
    if (!href) continue;
    const card = $(el).closest("article.event");
    const dateText = card.find(".entry-title span").first().text().replace(/\s+/g, " ").trim();
    const endDate = parseArchiveEndDate(dateText);
    const previous = candidatesByHref.get(href);
    if (!previous || (endDate ?? -1) > (previous.endDate ?? -1)) {
      candidatesByHref.set(href, { href, endDate });
    }
  }

  const ordered = [...candidatesByHref.values()]
    .sort((a, b) => {
      const aDate = a.endDate ?? -1;
      const bDate = b.endDate ?? -1;
      if (aDate !== bDate) return bDate - aDate;
      return a.href.localeCompare(b.href);
    })
    .map((item) => item.href);

  if (!ordered.includes(legacySourceUrl)) {
    ordered.push(legacySourceUrl);
  }

  return ordered;
}

async function fetchFirstAvailableSourcePage(
  candidateSourceUrls: string[]
): Promise<{ sourceUrl: string; html: string }> {
  const uniqueUrls = Array.from(new Set(candidateSourceUrls.filter(Boolean)));
  let lastError: unknown = null;
  for (const sourceUrl of uniqueUrls) {
    try {
      const html = await fetchHtml(sourceUrl);
      return { sourceUrl, html };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No Siobhan source page could be fetched");
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
