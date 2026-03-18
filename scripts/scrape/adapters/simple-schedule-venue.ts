import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

type SimpleVenueConfig = {
  venueKey: AdapterOutput["venueKey"];
  venue: string;
  sourceUrl: string;
};

const DAY_REGEX = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
const TIME_REGEX = /(\d{1,2}(?::\d{2})?\s*[ap]m?\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*[ap]m?)/i;
const DATE_REGEX =
  /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)\b/i;
const DANCE_KEYWORDS =
  /(dance|class|workshop|salsa|bachata|kizomba|zouk|heels|hip\s?hop|ballet|contemporary|jazz|latin|afro|movement)/i;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return null;
}

function extractClassFromElement(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  venue: string,
  sourceUrl: string
): ScrapedClass | null {
  const root = $(element);
  const blockText = normalizeText(root.text());
  const title = firstNonEmpty([
    root.attr("data-class-title"),
    root.find("[data-class-title]").first().attr("data-class-title"),
    root.find(".class-title, .event-title, .entry-title, h2, h3, h4, strong").first().text(),
    root.is("h2, h3, h4") ? root.text() : null
  ]);

  if (!title) return null;
  const contentText = `${title} ${blockText}`;
  if (!DANCE_KEYWORDS.test(contentText)) return null;

  const details = firstNonEmpty([
    root.attr("data-description"),
    root.find(".description, .class-description, .event-description, p").first().text(),
    blockText
  ]);
  const dayOfWeek = firstNonEmpty([
    root.attr("data-day"),
    contentText.match(DAY_REGEX)?.[1] ?? null
  ]);
  const time = firstNonEmpty([
    root.attr("data-time"),
    root.find(".time, .class-time, [data-time]").first().text(),
    contentText.match(TIME_REGEX)?.[1] ?? null
  ]);

  const hasDateSignal = Boolean(
    firstNonEmpty([
      root.attr("data-date"),
      root.attr("data-start-date"),
      root.attr("datetime"),
      root.find("time[datetime]").first().attr("datetime"),
      contentText.match(DATE_REGEX)?.[0] ?? null
    ])
  );
  // Prevent category/navigation tiles from being treated as classes.
  if (!dayOfWeek && !time && !hasDateSignal) return null;

  const bookingUrl = absoluteUrl(sourceUrl, root.find("a[href]").first().attr("href")) ?? sourceUrl;

  return {
    venue,
    title,
    details,
    dayOfWeek,
    time,
    startDate: null,
    endDate: null,
    bookingUrl,
    sourceUrl
  };
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(new Map(classes.map((item) => [`${item.title}|${item.dayOfWeek ?? "na"}|${item.time ?? "na"}`, item])).values());
}

export async function scrapeSimpleScheduleVenue(config: SimpleVenueConfig): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(config.sourceUrl);
    const $ = cheerio.load(html);
    const classes: ScrapedClass[] = [];

    const selectors = [
      "[data-class-title]",
      ".class-card",
      ".event-card",
      ".timetable-row",
      ".schedule-row",
      ".class-row",
      "article",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "p"
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const parsed = extractClassFromElement($, element, config.venue, config.sourceUrl);
        if (parsed) classes.push(parsed);
      });
    }

    return {
      venueKey: config.venueKey,
      venue: config.venue,
      sourceUrl: config.sourceUrl,
      classes: dedupe(classes).slice(0, 40),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: config.venueKey,
      venue: config.venue,
      sourceUrl: config.sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
