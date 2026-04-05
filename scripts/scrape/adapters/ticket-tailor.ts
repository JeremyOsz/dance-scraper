import { format, parse } from "date-fns";
import * as cheerio from "cheerio";
import type { ScrapedClass } from "../types";
import { absoluteUrl } from "./common";

export const browserLikeHeaders = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9"
};

type TicketTailorOrganizerConfig = {
  venue: string;
  organizerUrl: string;
  defaultDetails?: string | null;
  titlePattern?: string | null;
};

const noisePattern = /^(event details|buy tickets|sold out|unavailable|manage tickets|contact)$/i;
const schedulePattern =
  /\b(?<dow>Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?<day>\d{1,2})\s+(?<month>[A-Za-z]{3,9})\s+(?<year>\d{4})\s+(?<start>\d{1,2}:\d{2}\s+(?:AM|PM))\s*-\s*(?<end>\d{1,2}:\d{2}\s+(?:AM|PM))\b/i;
const parseFormats = ["EEE d MMM yyyy h:mm a", "EEE d MMMM yyyy h:mm a"] as const;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseTicketTailorDate(raw: string) {
  for (const parseFormat of parseFormats) {
    const parsed = parse(raw, parseFormat, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function findEventContainer($: cheerio.CheerioAPI, element: cheerio.AnyNode) {
  const anchor = $(element);
  const ancestors = anchor.parents().toArray();
  for (const parent of ancestors) {
    const text = normalizeText($(parent).text());
    if (schedulePattern.test(text)) {
      return $(parent);
    }
  }
  return anchor.parent();
}

function findTitle($: cheerio.CheerioAPI, container: cheerio.Cheerio<cheerio.AnyNode>, fallbackTitle: string) {
  const candidates = container
    .find("h1, h2, h3, h4, a")
    .toArray()
    .map((node) => normalizeText($(node).text()))
    .filter((text) => text && !noisePattern.test(text));

  return candidates[0] ?? fallbackTitle;
}

export function scrapeTicketTailorOrganizerHtml(
  html: string,
  config: TicketTailorOrganizerConfig
): ScrapedClass[] {
  const $ = cheerio.load(html);
  const classes: ScrapedClass[] = [];
  const seen = new Set<string>();
  const titleRegex = config.titlePattern ? new RegExp(config.titlePattern, "i") : null;

  $('a[href*="/events/"]').each((_, el) => {
    const href = $(el).attr("href");
    const bookingUrl = absoluteUrl(config.organizerUrl, href);
    if (!bookingUrl || !/tickettailor\.com\/events\/[^/]+\/\d+/i.test(bookingUrl)) {
      return;
    }

    const container = findEventContainer($, el);
    const rawText = normalizeText(container.text());
    const scheduleMatch = rawText.match(schedulePattern);
    if (!scheduleMatch?.groups) {
      return;
    }

    const title = findTitle($, container, normalizeText($(el).text()));
    if (!title || noisePattern.test(title)) {
      return;
    }
    if (titleRegex && !titleRegex.test(title)) {
      return;
    }

    const start = parseTicketTailorDate(
      `${scheduleMatch.groups.dow} ${scheduleMatch.groups.day} ${scheduleMatch.groups.month} ${scheduleMatch.groups.year} ${scheduleMatch.groups.start}`
    );
    const end = parseTicketTailorDate(
      `${scheduleMatch.groups.dow} ${scheduleMatch.groups.day} ${scheduleMatch.groups.month} ${scheduleMatch.groups.year} ${scheduleMatch.groups.end}`
    );
    if (!start || !end) {
      return;
    }

    const postScheduleText = normalizeText(
      rawText
        .slice(rawText.indexOf(scheduleMatch[0]) + scheduleMatch[0].length)
        .replace(/\b(event details|buy tickets|sold out|unavailable|manage tickets|contact)\b/gi, "")
    );
    const details = config.defaultDetails ?? (postScheduleText || null);
    const key = `${bookingUrl}|${format(start, "yyyy-MM-dd")}|${title.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    classes.push({
      venue: config.venue,
      title,
      details,
      dayOfWeek: format(start, "EEEE"),
      time: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      bookingUrl,
      sourceUrl: config.organizerUrl
    });
  });

  return classes;
}
