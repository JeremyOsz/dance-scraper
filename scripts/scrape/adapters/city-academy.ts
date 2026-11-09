import { format, isValid, parse } from "date-fns";
import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchHtml, fetchJson } from "./common";

const sourceUrl = "https://www.city-academy.com/Dance-Classes";
const catalogueApiUrl = "https://www.city-academy.com/wp-json/ca/v1/course-search";
const danceDepartment = "7";
const courseConcurrency = 4;

type Course = { title: string; permalink: string };

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseDate(value: string): string | null {
  const parsed = parse(value.trim(), "dd MMM yyyy", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
}

function parseTimetable(html: string, course: Course): ScrapedClass[] {
  const $ = cheerio.load(html);
  const title = normalizeText($("h1").first().text()) || cheerio.load(course.title).text();
  const classes: ScrapedClass[] = [];
  // The site repeats upcoming courses and mobile cards. Read desktop rows, then deduplicate.
  $(".ca-row[data-date], .ca-row-stsoon[data-date]").each((_, element) => {
    const row = $(element);
    const cell = (label: string) => normalizeText(row.find(`[data-label="${label}"]`).text());
    const dates = cell("Date").split(/\s+[-–]\s+/);
    const startDate = parseDate(dates[0] ?? "");
    if (!startDate) return;
    const endDate = parseDate(dates[1] ?? "") ?? startDate;
    const tutor = cell("Tutor");
    const details = [cell("Venue"), tutor ? `Tutor: ${tutor}` : "", cell("Duration"), cell("Price")]
      .filter(Boolean).join(" • ");
    classes.push({
      venue: "City Academy",
      title,
      details: details || null,
      dayOfWeek: format(new Date(`${startDate}T12:00:00`), "EEEE"),
      time: cell("Time") || null,
      startDate,
      endDate,
      isCourse: true,
      bookingUrl: course.permalink,
      sourceUrl
    });
  });
  return classes;
}

async function fetchCourses(): Promise<Course[]> {
  const courses = new Map<string, Course>();
  for (let page = 1; ; page += 1) {
    const response = await fetchJson<unknown>(`${catalogueApiUrl}?department=${danceDepartment}&page=${page}`);
    if (!response || typeof response !== "object" || !("items" in response) || !Array.isArray(response.items)
      || !("max_pages" in response) || typeof response.max_pages !== "number" || !Number.isInteger(response.max_pages)) {
      throw new Error("City Academy course catalogue returned an invalid response");
    }
    for (const item of response.items) {
      if (!item || typeof item !== "object" || typeof item.title !== "string" || typeof item.permalink !== "string") {
        throw new Error("City Academy course catalogue returned an invalid course");
      }
      const url = new URL(item.permalink, sourceUrl);
      if (url.origin !== new URL(sourceUrl).origin) throw new Error("City Academy returned an unexpected course URL");
      courses.set(url.href, { title: item.title, permalink: url.href });
    }
    if (page >= response.max_pages) break;
  }
  return [...courses.values()];
}

export async function scrapeCityAcademy(): Promise<AdapterOutput> {
  try {
    const courses = await fetchCourses();
    const classes: ScrapedClass[] = [];
    for (let offset = 0; offset < courses.length; offset += courseConcurrency) {
      const batch = await Promise.all(courses.slice(offset, offset + courseConcurrency).map(async (course) =>
        parseTimetable(await fetchHtml(course.permalink), course)
      ));
      classes.push(...batch.flat());
    }
    const unique = Array.from(new Map(classes.map((item) => [
      `${item.bookingUrl}|${item.startDate}|${item.endDate}|${item.time}|${item.details}`, item
    ])).values());
    return { venueKey: "cityAcademy", venue: "City Academy", sourceUrl, classes: unique, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "cityAcademy", venue: "City Academy", sourceUrl, classes: [], ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
