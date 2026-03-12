import * as cheerio from "cheerio";
import { format, isValid, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import type { ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.balletforyou.co.uk/";
const fallbackPagePaths = [
  "/level-1",
  "/level-2",
  "/level-3",
  "/beginnergeneral",
  "/preimprovers-1",
  "/improvers-1",
  "/improvers-2",
  "/improver-general",
  "/advanced-1-2",
  "/advanced-2",
  "/ballet-floor-barre",
  "/progressing-ballet-technique-1",
  "/pointe",
  "/mens-class",
  "/pas-de-deux-variations",
  "/repertoire",
  "/holidayintensives",
  "/performance"
] as const;
const allowedFolders = new Set(["Beginners", "Improvers", "Advanced", "Special Courses"]);
const dayHeadingPattern = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:s)?(?:\s+online)?$/i;
const fieldBoundaryPattern = /(?=(?:Day|Time|Times|Place|Dates|Cost|Teacher)\s*:|$)/i;
const dateRangePattern =
  /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}(?:\s+\d{4})?)\s*(?:-|–|—|to)\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}(?:\s+\d{4})?)/i;
const dateFormats = ["d MMMM yyyy", "d MMM yyyy"];

function firstNonEmpty(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseField(text: string, field: "Day" | "Time" | "Times" | "Place" | "Dates" | "Cost" | "Teacher"): string | null {
  const regex = new RegExp(`${field}\\s*:\\s*(.+?)${fieldBoundaryPattern.source}`, "i");
  const match = text.match(regex);
  if (!match) return null;
  return normalizeText(match[1]).replace(/\*+$/, "").trim() || null;
}

function parseToIsoDate(raw: string, fallbackYear: string | null): string | null {
  const clean = normalizeText(raw).replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
  const withYear = /\b\d{4}\b/.test(clean) ? clean : fallbackYear ? `${clean} ${fallbackYear}` : clean;

  for (const parseFormat of dateFormats) {
    const parsed = parse(withYear, parseFormat, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }
  return null;
}

function parseDateRange(rawDates: string | null): { startDate: string | null; endDate: string | null } {
  if (!rawDates) return { startDate: null, endDate: null };
  const match = rawDates.match(dateRangePattern);
  if (!match) return { startDate: null, endDate: null };
  const year = match[2].match(/\b\d{4}\b/)?.[0] ?? null;
  const startDate = parseToIsoDate(match[1], year);
  const endDate = parseToIsoDate(match[2], year);
  return { startDate, endDate };
}

function cleanPageTitle(raw: string | null): string {
  const value = normalizeText(raw);
  return value.replace(/\s+[—-]\s+Ballet for You$/i, "").trim() || "Ballet for You Class";
}

function parseCoursePaths(homeHtml: string): string[] {
  const $ = cheerio.load(homeHtml);
  const paths = new Set<string>();

  $("#mainNavWrapper .folder").each((_, folder) => {
    const folderName = normalizeText($(folder).find(".folder-toggle").first().text());
    if (!allowedFolders.has(folderName)) return;

    $(folder)
      .find(".subnav a[href]")
      .each((__, anchor) => {
        const href = normalizeText($(anchor).attr("href"));
        if (!href.startsWith("/")) return;
        if (href === "/enrol-now") return;
        if (href.startsWith("/about-")) return;
        if (href === "/beginners-class" || href === "/improvers-class") return;
        paths.add(href);
      });
  });

  if (paths.size === 0) {
    return [...fallbackPagePaths];
  }
  return [...paths];
}

function deriveTitle(blockText: string, heading: string | null, pageTitle: string): string {
  const preDay = normalizeText(blockText.split(/Day\s*:/i)[0]);
  if (preDay && preDay.length >= 5 && preDay.length <= 100 && !/^day$/i.test(preDay)) {
    return preDay;
  }

  if (heading) {
    if (!dayHeadingPattern.test(heading)) {
      return heading;
    }
    return `${pageTitle} (${heading})`;
  }

  return pageTitle;
}

function extractClassesFromPage(pageHtml: string, pageUrl: string): ScrapedClass[] {
  const $ = cheerio.load(pageHtml);
  const pageTitle = cleanPageTitle(
    firstNonEmpty([
      $(".sqs-code-container .boxed h1").first().text(),
      $('meta[property="og:title"]').attr("content"),
      $("title").text()
    ])
  );
  const pageSummary = firstNonEmpty([
    $(".sqs-code-container .boxed i").first().text(),
    $(".sqs-code-container .boxed p").first().text()
  ]);
  const bookingUrl = absoluteUrl(pageUrl, $('a[href*="/enrol-now"]').first().attr("href")) ?? pageUrl;
  const classes: ScrapedClass[] = [];

  $(".sqs-html-content p").each((_, paragraph) => {
    const text = normalizeText($(paragraph).text());
    if (!/Day\s*:/i.test(text) || !/(Time|Times)\s*:/i.test(text)) return;

    const day = parseField(text, "Day");
    const time = parseField(text, "Time") ?? parseField(text, "Times");
    const place = parseField(text, "Place");
    const dates = parseField(text, "Dates");
    const cost = parseField(text, "Cost");
    const teacher = parseField(text, "Teacher");
    const { startDate, endDate } = parseDateRange(dates);
    const heading = normalizeText($(paragraph).prevAll("h1, h2, h3").first().text()) || null;
    const details = [pageSummary, place && `Place: ${place}`, dates && `Dates: ${dates}`, cost && `Cost: ${cost}`, teacher && `Teacher: ${teacher}`]
      .filter(Boolean)
      .join(" • ");

    classes.push({
      venue: "Ballet for You",
      title: deriveTitle(text, heading, pageTitle),
      details: details || pageSummary || text,
      dayOfWeek: day,
      time,
      startDate,
      endDate,
      bookingUrl,
      sourceUrl: pageUrl
    });
  });

  return classes;
}

export async function scrapeBalletForYou(): Promise<AdapterOutput> {
  try {
    const homeHtml = await fetchHtml(sourceUrl);
    const pagePaths = parseCoursePaths(homeHtml);
    const classes: ScrapedClass[] = [];

    for (const path of pagePaths) {
      const pageUrl = absoluteUrl(sourceUrl, path);
      if (!pageUrl) continue;

      try {
        const html = await fetchHtml(pageUrl);
        classes.push(...extractClassesFromPage(html, pageUrl));
      } catch {
        // Skip single-page failures and continue with remaining pages.
      }
    }

    const uniqueClasses = Array.from(
      new Map(classes.map((item) => [`${item.title}|${item.dayOfWeek ?? "na"}|${item.time ?? "na"}|${item.startDate ?? "na"}`, item])).values()
    );
    const today = format(new Date(), "yyyy-MM-dd");
    const currentClasses = uniqueClasses.filter((item) => !item.endDate || item.endDate >= today);

    if (currentClasses.length === 0) {
      return {
        venueKey: "balletForYou",
        venue: "Ballet for You",
        sourceUrl,
        classes: [
          {
            venue: "Ballet for You",
            title: "Ballet for You Timetable",
            details: "Timetable is published as images and mixed content; check venue pages for latest schedule.",
            dayOfWeek: null,
            time: null,
            startDate: null,
            endDate: null,
            bookingUrl: absoluteUrl(sourceUrl, "/timetable") ?? sourceUrl,
            sourceUrl: absoluteUrl(sourceUrl, "/timetable") ?? sourceUrl
          }
        ],
        ok: true,
        error: null
      };
    }

    return {
      venueKey: "balletForYou",
      venue: "Ballet for You",
      sourceUrl,
      classes: currentClasses,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "balletForYou",
      venue: "Ballet for You",
      sourceUrl,
      classes: [
        {
          venue: "Ballet for You",
          title: "Ballet for You Timetable",
          details: "Source currently unavailable. Check venue page for latest schedule.",
          dayOfWeek: null,
          time: null,
          startDate: null,
          endDate: null,
          bookingUrl: absoluteUrl(sourceUrl, "/timetable") ?? sourceUrl,
          sourceUrl: absoluteUrl(sourceUrl, "/timetable") ?? sourceUrl
        }
      ],
      ok: true,
      error: null
    };
  }
}
