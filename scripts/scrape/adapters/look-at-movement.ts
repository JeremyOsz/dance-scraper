import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { format, isValid, parse } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.lookatmovement.co.uk/";

const DAY_NAME_BY_SHORT: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday"
};
const MONTH_PATTERN = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseDayMonth(day: string, month: string, year: number): string | null {
  const value = `${day} ${month} ${year}`;
  for (const pattern of ["d MMM yyyy", "d MMMM yyyy"]) {
    const parsed = parse(value, pattern, new Date(year, 0, 1));
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }
  return null;
}

function parseTermRange(text: string): { startDate: string | null; endDate: string | null; year: number } {
  const year = Number(text.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getFullYear());
  const range = text.match(
    new RegExp(`(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\s*(?:-|–|—|to)\\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?`, "i")
  );
  if (!range) return { startDate: null, endDate: null, year };
  const rangeYear = Number(range[5] ?? year);
  return {
    startDate: parseDayMonth(range[1], range[2], rangeYear),
    endDate: parseDayMonth(range[3], range[4], rangeYear),
    year: rangeYear
  };
}

function parseLinkedCourseRange(
  text: string,
  fallbackYear: number
): { startDate: string | null; endDate: string | null } {
  const normalized = normalizeText(text);
  const proseRange = normalized.match(
    new RegExp(
      `start(?:s|ing)?(?:\\s+on)?\\s+(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN}).*?(?:run\\s+)?until\\s+(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?`,
      "i"
    )
  );
  if (proseRange) {
    const year = Number(proseRange[5] ?? normalized.match(/\b(20\d{2})\b/)?.[1] ?? fallbackYear);
    return {
      startDate: parseDayMonth(proseRange[1], proseRange[2], year),
      endDate: parseDayMonth(proseRange[3], proseRange[4], year)
    };
  }

  const term = parseTermRange(normalized);
  return { startDate: term.startDate, endDate: term.endDate };
}

function parseExplicitDates(text: string, year: number): string[] {
  const matches = text.matchAll(
    new RegExp(`(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?`, "gi")
  );
  const dates = new Set<string>();
  for (const match of matches) {
    const date = parseDayMonth(match[1], match[2], Number(match[3] ?? year));
    if (date) dates.add(date);
  }
  return [...dates];
}

function extractAccordionClass(element: AnyNode, $: cheerio.CheerioAPI): ScrapedClass | null {
  const root = $(element);
  const titleText = normalizeText(root.find(".e-n-accordion-item-title-text").first().text());
  if (!titleText) return null;

  const title = titleText.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
  const dayShortMatch = titleText.match(/\(([A-Z]{3})\)/);
  const dayOfWeek = dayShortMatch ? DAY_NAME_BY_SHORT[dayShortMatch[1]] ?? null : null;

  const bodyText = normalizeText(root.find(".elementor-widget-text-editor").first().text());

  // Extract time range like "14.00 – 15.30" or "12-4pm"
  const timeMatch =
    bodyText.match(/\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}/) ??
    bodyText.match(/\d{1,2}\s*(?:am|pm)\s*[|/-]\s*\d{1,2}\s*(?:am|pm)/i) ??
    bodyText.match(/\d{1,2}\s*(?:[:.]\d{2})?\s*[–-]\s*\d{1,2}\s*(?:[:.]\d{2})?\s*(?:am|pm)?/i);
  const time = timeMatch ? timeMatch[0].replace(/\s+/g, " ").trim() : null;

  // Venue at end of paragraph, e.g. "Morley College", "The Place", "Acosta Dance"
  let venueName: string | null = null;
  const venueMatch = bodyText.match(/(Morley College|The Place|Acosta Dance)/i);
  if (venueMatch) {
    venueName = venueMatch[1];
  }

  const bookingUrl =
    absoluteUrl(sourceUrl, root.find(".elementor-button-wrapper a[href]").first().attr("href")) ?? sourceUrl;

  return {
    venue: "Look At Movement (Tanztheatre)",
    title,
    details: bodyText || null,
    dayOfWeek,
    time,
    startDate: null,
    endDate: null,
    bookingUrl,
    sourceUrl
  };
}

export async function scrapeLookAtMovement(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: ScrapedClass[] = [];
    const accordionClasses: Array<{ parsed: ScrapedClass; bodyText: string; explicitDates: string[] }> = [];
    const term = parseTermRange(normalizeText($.root().text()));

    $(".e-n-accordion-item").each((_, el) => {
      const parsed = extractAccordionClass(el as unknown as AnyNode, $);
      if (!parsed) return;
      const bodyText = normalizeText($(el).find(".elementor-widget-text-editor").first().text());
      const explicitDates = parseExplicitDates(bodyText, term.year);
      accordionClasses.push({ parsed, bodyText, explicitDates });
    });

    const expandedClasses = await Promise.all(
      accordionClasses.map(async ({ parsed, explicitDates }) => {
        if (explicitDates.length > 1) {
          return explicitDates.map((startDate) => ({
            ...parsed,
            dayOfWeek: format(new Date(`${startDate}T12:00:00`), "EEEE"),
            startDate,
            endDate: startDate
          }));
        }

        let dates = { startDate: term.startDate, endDate: term.endDate };
        if (parsed.bookingUrl !== sourceUrl) {
          try {
            const detailHtml = await fetchHtml(parsed.bookingUrl);
            const detailText = normalizeText(cheerio.load(detailHtml).root().text());
            const linkedDates = parseLinkedCourseRange(detailText, term.year);
            if (linkedDates.startDate && linkedDates.endDate) dates = linkedDates;
          } catch {
            // The page-wide term remains the source-native fallback when a linked page is unavailable.
          }
        }
        return [{ ...parsed, startDate: dates.startDate, endDate: dates.endDate }];
      })
    );

    for (const expanded of expandedClasses) {
      for (const item of expanded) {
        classes.push(item);
      }
    }

    if (classes.length > 0) {
      return {
        venueKey: "lookAtMovement",
        venue: "Look At Movement (Tanztheatre)",
        sourceUrl,
        classes,
        ok: true,
        error: null
      };
    }

    // Fallback for legacy/fixture HTML that follows the generic schedule pattern.
    return scrapeSimpleScheduleVenue({
      venueKey: "lookAtMovement",
      venue: "Look At Movement (Tanztheatre)",
      sourceUrl
    });
  } catch (error) {
    return {
      venueKey: "lookAtMovement",
      venue: "Look At Movement (Tanztheatre)",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
