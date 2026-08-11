import * as cheerio from "cheerio";
import { endOfDay, format, isBefore, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://butoh.co.uk/workshops";
const bookingUrl = "https://www.tickettailor.com/events/thestudysociety/2025925";
const WORKSHOP_DATE = /(?:Weekend\s+)?Workshop\s+(\d+):\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i;
const TIME_RANGE = /(?<!\d)(\d{1,2}(?:[.:]\d{2})?)\s*[-–]\s*(\d{1,2}(?:[.:]\d{2})?)(?!\d)/;

export function parseButohMutationHtml(html: string, now = new Date()): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const pageText = $("body").text().replace(/\s+/g, " ").trim();
  const year = Number(pageText.match(/\bSeries\s+(20\d{2})\b/i)?.[1] ?? now.getFullYear());
  const classes: AdapterOutput["classes"] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
    const headingText = $(heading).text().replace(/\s+/g, " ").trim();
    const match = headingText.match(WORKSHOP_DATE);
    if (!match) return;

    const start = parse(`${match[2]} ${match[4]} ${year}`, "d MMMM yyyy", now);
    const end = parse(`${match[3] ?? match[2]} ${match[4]} ${year}`, "d MMMM yyyy", now);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || isBefore(endOfDay(end), now)) return;

    const scheduleText = $(heading).nextUntil("h1, h2, h3, h4, h5, h6").text().replace(/\s+/g, " ").trim();
    const timeMatch = scheduleText.match(TIME_RANGE);
    classes.push({
      venue: "Butoh Mutations",
      organizer: "Butoh Mutations",
      locationName: "Colet House",
      address: "151 Talgarth Road",
      postcode: "W14 9DA",
      borough: "Hammersmith and Fulham",
      styles: ["Butoh"],
      title: `Butoh Mutations Workshop ${match[1]}`,
      details: "Butoh Mutations London workshop exploring dance, embodied imagination, myth, and ritual.",
      dayOfWeek: format(start, "EEEE"),
      time: timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : null,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      bookingUrl,
      sourceUrl
    });
  });

  return classes;
}

export async function scrapeButohMutation(): Promise<AdapterOutput> {
  try {
    const classes = parseButohMutationHtml(await fetchHtml(sourceUrl));
    return { venueKey: "butohMutations", venue: "Butoh Mutations", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "butohMutations",
      venue: "Butoh Mutations",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
