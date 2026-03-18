import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
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

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
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

    $(".e-n-accordion-item").each((_, el) => {
      const parsed = extractAccordionClass(el as unknown as AnyNode, $);
      if (parsed) classes.push(parsed);
    });

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
