import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";
import { extractPlaceCourseSessionDates } from "./the-place-course-sessions";
import { runPool } from "./the-place-fetch-pool";
import { THE_PLACE_CAMDEN_TERM_CLOSURES } from "./the-place-term-exclusions";

const sourceUrl = "https://theplace.org.uk/dance/classes-and-courses";

const DETAIL_FETCH_CONCURRENCY = 6;

function isoDateToListingDay(iso: string): string {
  return format(parseISO(iso), "EEEE");
}

export async function scrapeThePlace(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const listingRows = $(".c-event-card__header")
      .closest("a")
      .map((_, el) => {
        const title = $(el).find(".c-event-card__title").first().text().trim();
        const details = $(el).find(".c-event-card__subtitle").first().text().trim() || null;
        const day = $(el).find(".c-event-card__header").first().text().trim().replace(/s$/, "");
        const time = $(el).find(".c-event-card__date").first().text().trim() || null;
        const link = absoluteUrl(sourceUrl, $(el).attr("href"));
        if (!title || !link) return null;
        return { title, details, day, time, link };
      })
      .get()
      .filter(Boolean) as { title: string; details: string | null; day: string; time: string | null; link: string }[];

    const uniqueUrls = [...new Set(listingRows.map((r) => r.link))];
    const sessionDatesByUrl = new Map<string, string[]>();

    await runPool(uniqueUrls, DETAIL_FETCH_CONCURRENCY, async (url) => {
      try {
        const courseHtml = await fetchHtml(url);
        sessionDatesByUrl.set(url, extractPlaceCourseSessionDates(courseHtml));
      } catch {
        sessionDatesByUrl.set(url, []);
      }
    });

    const classes: ScrapedClass[] = [];

    for (const row of listingRows) {
      const sessionDates = sessionDatesByUrl.get(row.link) ?? [];

      if (sessionDates.length > 0) {
        for (const d of sessionDates) {
          classes.push({
            venue: "The Place",
            title: row.title,
            details: row.details,
            dayOfWeek: isoDateToListingDay(d),
            time: row.time,
            startDate: d,
            endDate: d,
            bookingUrl: row.link,
            sourceUrl
          });
        }
      } else {
        classes.push({
          venue: "The Place",
          title: row.title,
          details: row.details,
          dayOfWeek: row.day || null,
          time: row.time,
          startDate: null,
          endDate: null,
          excludedDateRanges: THE_PLACE_CAMDEN_TERM_CLOSURES,
          bookingUrl: row.link,
          sourceUrl
        });
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
