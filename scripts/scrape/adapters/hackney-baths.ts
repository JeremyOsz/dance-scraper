import * as cheerio from "cheerio";
import { format, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.eastwaybaths.co.uk/events";

function clock(value: string): string | null {
  const match = value.match(/^(\d{1,2})(?:[.:](\d{2}))?(am|pm)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return `${String(hour % 12 + (match[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseHackneyBathsEventsHtml(html: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];
  $(".eb-event-card").each((_, element) => {
    const card = $(element);
    const title = card.find("h3").text().replace(/\s+/g, " ").trim();
    if (!/ecstatic dance|5\s*rhythms|five\s*rhythms|ecstatic tai chi|butoh|contact improvisation/i.test(title)) return;
    const date = parse(card.find(".eb-event-date").text().trim(), "MMMM d, yyyy", new Date(0));
    if (Number.isNaN(date.getTime())) return;
    const details = card.find(".eb-space-meta").text().replace(/\s+/g, " ").trim();
    const times = details.match(/(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm))/i);
    const startTime = times ? clock(times[1].replace(/\s/g, "")) : null;
    const endTime = times ? clock(times[2].replace(/\s/g, "")) : null;
    const href = card.find(".eb-event-tickets").attr("href");
    const bookingUrl = href && href !== "#" ? new URL(href, sourceUrl).toString() : sourceUrl;
    const dateString = format(date, "yyyy-MM-dd");
    if (classes.some(row => row.title === title && row.startDate === dateString)) return;
    classes.push({
      venue: "Hackney Baths",
      locationName: "Eastway Baths",
      address: "80 Eastway",
      postcode: "E9 5JH",
      borough: "Hackney",
      title,
      details: details || null,
      dayOfWeek: format(date, "EEEE"),
      time: startTime && endTime ? `${startTime} - ${endTime}` : null,
      startDate: dateString,
      endDate: dateString,
      bookingUrl,
      sourceUrl
    });
  });
  return classes;
}

export async function scrapeHackneyBaths(): Promise<AdapterOutput> {
  try {
    const classes = parseHackneyBathsEventsHtml(await fetchHtml(sourceUrl));
    if (!classes.length) throw new Error("No dated dance listings found in the Eastway Baths programme");
    return {
      venueKey: "hackneyBaths",
      venue: "Hackney Baths",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "hackneyBaths",
      venue: "Hackney Baths",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
