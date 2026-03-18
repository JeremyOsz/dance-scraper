import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.basedancestudios.com/weekly-timetable-2";
const timetableIframeUrl =
  "https://wix-visual-data.appspot.com/index?pageId=j18cf&compId=comp-ks5t3h6z&viewerCompId=comp-ks5t3h6z&siteRevision=1205&viewMode=site&deviceType=desktop&locale=en&regionalLanguage=en&width=878&height=465&currency=GBP&currentCurrency=GBP&currentRoute=.%2Fweekly-timetable-2";

const DAY_REGEX = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
const TIME_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i;
const DANCE_KEYWORDS =
  /(dance|class|workshop|heels|hip\s?hop|ballet|contemporary|jazz|latin|afro|movement|choreo|commercial|street)/i;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function toClasses(html: string): ScrapedClass[] {
  const $ = cheerio.load(html);
  const classes: ScrapedClass[] = [];

  $("table").each((_, table) => {
    const headerRow = $(table).find("tr").first();
    if (headerRow.length === 0) return;

    const headers = headerRow
      .find("th, td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()).toLowerCase());

    if (headers.length === 0) return;

    const dayIndex =
      headers.findIndex((text) => /day/i.test(text)) >= 0
        ? headers.findIndex((text) => /day/i.test(text))
        : -1;
    const timeIndex =
      headers.findIndex((text) => /time/i.test(text)) >= 0
        ? headers.findIndex((text) => /time/i.test(text))
        : -1;
    const titleIndexCandidates = [
      headers.findIndex((text) => /class\s*name|class|session|style/i.test(text)),
      0
    ];
    const titleIndex = titleIndexCandidates.find((index) => index >= 0) ?? 0;

    $(table)
      .find("tr")
      .slice(1)
      .each((_, row) => {
        const cells = $(row)
          .find("td")
          .toArray()
          .map((cell) => normalizeText($(cell).text()));

        if (cells.every((text) => !text)) return;

        const rowText = normalizeText(cells.join(" "));
        if (!DANCE_KEYWORDS.test(rowText)) return;

        const title = cells[titleIndex] || rowText;

        const dayOfWeek =
          (dayIndex >= 0 ? cells[dayIndex] : null) ||
          rowText.match(DAY_REGEX)?.[1] ||
          null;

        const time =
          (timeIndex >= 0 ? cells[timeIndex] : null) ||
          rowText.match(TIME_REGEX)?.[0] ||
          null;

        const detailsParts: string[] = [];
        cells.forEach((text, index) => {
          if (!text) return;
          if (index === titleIndex || index === dayIndex || index === timeIndex) return;
          detailsParts.push(text);
        });
        const details = normalizeText(detailsParts.join(" | ")) || null;

        const bookingUrl =
          absoluteUrl(
            sourceUrl,
            $(row).find("a[href]").first().attr("href") ??
              $(table).find("a[href]").first().attr("href")
          ) ?? sourceUrl;

        classes.push({
          venue: "BASE Dance Studios",
          title,
          details,
          dayOfWeek,
          time,
          startDate: null,
          endDate: null,
          bookingUrl,
          sourceUrl
        });
      });
  });

  const deduped = Array.from(
    new Map(
      classes.map((item) => [
        `${item.title}|${item.dayOfWeek ?? "na"}|${item.time ?? "na"}`,
        item
      ])
    ).values()
  );

  return deduped;
}

export async function scrapeBaseDanceStudios(): Promise<AdapterOutput> {
  try {
    const iframeHtml = await fetchHtml(timetableIframeUrl);
    const classes = toClasses(iframeHtml);

    return {
      venueKey: "baseDanceStudios",
      venue: "BASE Dance Studios",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "baseDanceStudios",
      venue: "BASE Dance Studios",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
