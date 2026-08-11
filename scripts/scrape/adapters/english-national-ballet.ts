import * as cheerio from "cheerio";
import { format, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.ballet.org.uk/move-with-us/dance-classes/ballet/";

export function parseEnglishNationalBalletDetail(html: string, bookingUrl: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];
  $(".venue-listing").each((_, listing) => {
    const root = $(listing);
    const button = root.find("[data-title][data-start-date]").first();
    const title = button.attr("data-title")?.trim();
    const startValue = button.attr("data-start-date") ?? "";
    const endValue = button.attr("data-end-date") ?? "";
    const start = parse(startValue, "yyyy-MM-dd HH:mm:ss", new Date());
    const end = parse(endValue, "yyyy-MM-dd HH:mm:ss", new Date());
    const locationName = root.find(".venue-listing__name").first().text().replace(/\s+/g, " ").trim() || "Mulryan Centre for Dance";
    if (!title || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const year = start.getFullYear();
    root.find(".showing").each((__, showing) => {
      const showingText = $(showing).text().replace(/\s+/g, " ").trim();
      if (/no class/i.test(showingText)) return;
      const dateText = showingText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+[A-Za-z]+/)?.[0];
      if (!dateText) return;
      const date = parse(`${dateText} ${year}`, "EEEE d MMMM yyyy", start);
      if (Number.isNaN(date.getTime())) return;
      classes.push({
        venue: "English National Ballet",
        organizer: "English National Ballet",
        locationName,
        address: "41 Hopewell Square",
        postcode: "E14 0SY",
        borough: "Newham",
        styles: ["Ballet"],
        title,
        details: "Adult ballet class (18+).",
        dayOfWeek: format(date, "EEEE"),
        time: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
        startDate: format(date, "yyyy-MM-dd"),
        endDate: format(date, "yyyy-MM-dd"),
        bookingUrl,
        sourceUrl
      });
    });
  });
  return classes;
}

export async function scrapeEnglishNationalBallet(): Promise<AdapterOutput> {
  try {
    const listingHtml = await fetchHtml(sourceUrl);
    const $ = cheerio.load(listingHtml);
    const links = [...new Set($(".card--cwe .card__title a[href*='/class/']").toArray()
      .map((link) => absoluteUrl(sourceUrl, $(link).attr("href"))).filter((link): link is string => Boolean(link)))];
    const classes = (await Promise.all(links.map(async (link) => parseEnglishNationalBalletDetail(await fetchHtml(link), link)))).flat();
    return { venueKey: "englishNationalBallet", venue: "English National Ballet", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return { venueKey: "englishNationalBallet", venue: "English National Ballet", sourceUrl, classes: [], ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
