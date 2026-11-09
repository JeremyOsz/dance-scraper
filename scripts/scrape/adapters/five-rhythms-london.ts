import * as cheerio from "cheerio";
import { format, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.5rhythms.com/who-we-are/teacher-communities/europe/england/";
const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
const DATE = /\b(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})\b/g;

function parseDate(value: string): Date | null {
  const parsed = parse(value, "d MMM yyyy", new Date(0));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseFiveRhythmsSearchHtml(html: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];

  $("#classesLeft, #classesRight").each((_, column) => {
    let weekday: string | null = null;
    $(column).children().each((_, element) => {
      const node = $(element);
      if (node.is("h4")) {
        weekday = node.text().match(WEEKDAY)?.[1] ?? null;
        return;
      }
      const href = node.attr("href");
      if (!node.is("a") || !href || !new URL(href, sourceUrl).pathname.startsWith("/classes/")) return;
      const title = node.text().replace(/\s+/g, " ").trim();
      if (!title || /online|onlilne|one[- ]to[- ]one|\b1\s*:\s*1\b/i.test(title)) return;

      // The community page separates class title, date/city text and teacher with sibling nodes.
      let location = "";
      let teacher = "";
      let sibling = element.nextSibling;
      while (sibling) {
        const next = $(sibling);
        if (next.is("br, h4")) break;
        if (next.is("a")) teacher = next.text().trim();
        else location += next.text();
        sibling = sibling.nextSibling;
      }
      location = location.replace(/\s+/g, " ").trim();
      const dateMatch = location.match(/^Next Class (\d{1,2} [A-Z][a-z]{2} \d{4})\s+/);
      const date = dateMatch ? parseDate(dateMatch[1]) : null;
      const city = dateMatch ? location.slice(dateMatch[0].length) : location;
      if (city.toLowerCase() !== "london" || (!weekday && !date)) return;
      const bookingUrl = new URL(href, sourceUrl).toString();
      if (classes.some(row => row.bookingUrl === bookingUrl)) return;
      classes.push({
        venue: "Five Rhythms London",
        title,
        details: teacher ? `Teacher: ${teacher}.` : null,
        dayOfWeek: date ? format(date, "EEEE") : weekday,
        time: null,
        startDate: date ? format(date, "yyyy-MM-dd") : null,
        endDate: date ? format(date, "yyyy-MM-dd") : null,
        bookingUrl,
        sourceUrl
      });
    });
  });

  $(".classes_search").each((_, row) => {
    const container = $(row);
    const city = container.find("#city").text().replace(/\s+/g, " ").trim();
    const titleLink = container.find("#name a").first();
    const title = titleLink.text().replace(/\s+/g, " ").trim();
    if (city.toLowerCase() !== "london" || !title || /\bonline\b|one[- ]to[- ]one|\b1\s*:\s*1\b/i.test(title)) return;

    const schedule = container.find("#day").text().replace(/\s+/g, " ").trim();
    const weekdayMatch = schedule.match(WEEKDAY);
    const dateMatches = [...schedule.matchAll(DATE)].map((match) => parseDate(match[1])).filter((date): date is Date => date !== null);
    const start = dateMatches[0] ?? null;
    const end = dateMatches.at(-1) ?? start;
    const dayOfWeek = weekdayMatch?.[1] ?? (start ? format(start, "EEEE") : null);
    if (!dayOfWeek && !start) return;

    const teacher = container.find("#teacher").text().replace(/\s+/g, " ").trim();
    const href = titleLink.attr("href")?.trim();
    const bookingUrl = href ? new URL(href, sourceUrl).toString() : sourceUrl;
    classes.push({
      venue: "Five Rhythms London",
      title,
      details: teacher ? `Teacher: ${teacher}.` : null,
      dayOfWeek,
      time: null,
      startDate: start ? format(start, "yyyy-MM-dd") : null,
      endDate: end ? format(end, "yyyy-MM-dd") : null,
      bookingUrl,
      sourceUrl
    });
  });

  return classes;
}

export async function scrapeFiveRhythmsLondon(): Promise<AdapterOutput> {
  try {
    const classes = parseFiveRhythmsSearchHtml(await fetchHtml(sourceUrl));
    if (!classes.length) throw new Error("No London class listings found in the 5Rhythms programme");
    return {
      venueKey: "fiveRhythmsLondon",
      venue: "Five Rhythms London",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "fiveRhythmsLondon",
      venue: "Five Rhythms London",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
