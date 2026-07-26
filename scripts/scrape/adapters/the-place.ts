import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";
import { extractPlaceCourseSessionDates } from "./the-place-course-sessions";
import { runPool } from "./the-place-fetch-pool";
import { THE_PLACE_CAMDEN_TERM_CLOSURES } from "./the-place-term-exclusions";

const sourceUrl = "https://theplace.org.uk/dance/classes-and-courses";

const DETAIL_FETCH_CONCURRENCY = 6;
const CHILD_ONLY_PATTERN = /\b(?:ages?\s*\d+(?:\s*[-–]\s*\d+)?|children|child|kids?|youth|teen|grown-ups?)\b/i;
const WEEKDAY_PATTERN = /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/g;
const TIME_RANGE_PATTERN = /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:-|–|—|to)\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/;

function isoDateToListingDay(iso: string): string {
  return format(parseISO(iso), "EEEE");
}

export async function scrapeThePlace(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const listingRows = $("a.c-event-card, .c-event-card__header")
      .map((_, node) => ($(node).is("a") ? node : $(node).closest("a").get(0)))
      .map((_, el) => {
        if (!el) return null;
        const title = $(el).find(".c-event-card__title").first().text().trim();
        const details = $(el).find(".c-event-card__subtitle").first().text().trim() || null;
        const dayText = $(el).find(".c-event-card__header").first().text().trim();
        const days = [...dayText.matchAll(WEEKDAY_PATTERN)].map((match) => match[0]);
        const dateRoot = $(el).find(".c-event-card__date").first();
        const startDateTime = dateRoot.find('time[itemprop="startDate"]').attr("datetime") ?? null;
        const endDateTime = dateRoot.find('time[itemprop="endDate"]').attr("datetime") ?? null;
        const startDate = startDateTime ? format(parseISO(startDateTime), "yyyy-MM-dd") : null;
        const endDate = endDateTime ? format(parseISO(endDateTime), "yyyy-MM-dd") : startDate;
        const time = startDateTime ? null : dateRoot.text().trim() || null;
        const link = absoluteUrl(sourceUrl, $(el).attr("href"));
        if (!title || !link || CHILD_ONLY_PATTERN.test(`${title} ${details ?? ""}`)) return null;
        return { title, details, days, time, startDate, endDate, link };
      })
      .get()
      .filter(Boolean) as {
        title: string;
        details: string | null;
        days: string[];
        time: string | null;
        startDate: string | null;
        endDate: string | null;
        link: string;
      }[];

    const uniqueListingRows = Array.from(new Map(listingRows.map((row) => [row.link, row])).values());

    const uniqueUrls = [...new Set(uniqueListingRows.map((r) => r.link))];
    const sessionDatesByUrl = new Map<string, string[]>();
    const detailTimeByUrl = new Map<string, string | null>();
    const childOnlyByUrl = new Map<string, boolean>();

    await runPool(uniqueUrls, DETAIL_FETCH_CONCURRENCY, async (url) => {
      try {
        const courseHtml = await fetchHtml(url);
        sessionDatesByUrl.set(url, extractPlaceCourseSessionDates(courseHtml));
        const detail = cheerio.load(courseHtml);
        const metadata = new Map<string, string>();
        detail(".c-meta__item").each((_, item) => {
          const key = detail(item).find(".c-meta__title").first().text().replace(/\s+/g, " ").trim().toLowerCase();
          const value = detail(item).find(".c-meta__value").first().text().replace(/\s+/g, " ").trim();
          if (key && value) metadata.set(key, value);
        });
        detail(".c-meta__title").each((_, titleNode) => {
          const key = detail(titleNode).text().replace(/\s+/g, " ").trim().toLowerCase();
          const value = detail(titleNode).next(".c-meta__value").text().replace(/\s+/g, " ").trim();
          if (key && value) metadata.set(key, value);
        });
        detailTimeByUrl.set(url, metadata.get("duration")?.match(TIME_RANGE_PATTERN)?.[0] ?? null);
        childOnlyByUrl.set(url, CHILD_ONLY_PATTERN.test(metadata.get("age") ?? ""));
      } catch {
        sessionDatesByUrl.set(url, []);
        detailTimeByUrl.set(url, null);
        childOnlyByUrl.set(url, false);
      }
    });

    const classes: ScrapedClass[] = [];

    for (const row of uniqueListingRows) {
      if (childOnlyByUrl.get(row.link)) continue;
      const sessionDates = sessionDatesByUrl.get(row.link) ?? [];
      const time = detailTimeByUrl.get(row.link) ?? row.time;

      if (sessionDates.length > 0) {
        for (const d of sessionDates) {
          classes.push({
            venue: "The Place",
            title: row.title,
            details: row.details,
            dayOfWeek: isoDateToListingDay(d),
            time,
            startDate: d,
            endDate: d,
            bookingUrl: row.link,
            sourceUrl
          });
        }
      } else {
        const days = row.days.length > 0 ? row.days : [null];
        for (const dayOfWeek of days) {
          classes.push({
            venue: "The Place",
            title: row.title,
            details: row.details,
            dayOfWeek,
            time,
            startDate: row.startDate,
            endDate: row.endDate,
            excludedDateRanges: THE_PLACE_CAMDEN_TERM_CLOSURES,
            bookingUrl: row.link,
            sourceUrl
          });
        }
      }
    }

    return {
      venueKey: "thePlace",
      venue: "The Place",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "thePlace",
      venue: "The Place",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
