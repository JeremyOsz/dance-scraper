import { addDays, format, isValid, parse } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchJson } from "./common";

const venue = "Studio 66";
const sourceUrl = "https://online.wellyx.com/studiosixtysix/londonuk/classes";
const fundamentalsUrl = "https://api.wellyx.com/api/Widget/studiosixtysix/londonuk/Class/Fundamental";
const classesUrl = "https://api.wellyx.com/api/Widget/studiosixtysix/londonuk/Class/ViewAllClasses";
const daysToFetch = 56;
const disciplinePattern = /\b(pole|aerial|arial|hoop|lyra|silks|trapeze)\b/i;
const requestHeaders = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json, text/plain, */*",
  Origin: "https://online.wellyx.com",
  Referer: sourceUrl
} as const;

type Studio66FundamentalsResponse = {
  MessageCode?: number;
  Result?: {
    ClassCategoryList?: Array<{
      ClassCategoryID?: number;
      ClassCategoryName?: string;
    }>;
  };
};

type Studio66ClassesResponse = {
  MessageCode?: number;
  Result?: {
    ClassList?: Array<{
      OccurrenceDate?: string;
      ClassPOSList?: Studio66ClassItem[];
    }>;
  };
};

type Studio66ClassItem = {
  ClassID?: number;
  ClassCategoryID?: number;
  ClassLevel?: string | null;
  AssignedToStaffName?: string | null;
  FacilityName?: string | null;
  Name?: string;
  SubTitle?: string | null;
  OccurrenceDate?: string;
  StartTime?: string;
  EndTime?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function londonIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function parseOccurrenceDate(value: string | null | undefined): Date | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const parsed = parse(normalized, "MM/dd/yyyy HH:mm:ss", new Date());
  if (isValid(parsed)) return parsed;

  const fallback = new Date(normalized);
  return isValid(fallback) ? fallback : null;
}

function toHourMinute(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return normalized;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toTimeRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const startTime = toHourMinute(start);
  const endTime = toHourMinute(end);
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime;
}

function buildDetails(item: Studio66ClassItem, categoryName: string | null): string | null {
  const subtitle = normalizeText(item.SubTitle);
  const level = normalizeText(item.ClassLevel);
  const instructor = normalizeText(item.AssignedToStaffName);
  const studio = normalizeText(item.FacilityName);

  const parts = [
    subtitle ? `Format: ${subtitle}` : null,
    categoryName ? `Category: ${categoryName}` : null,
    level ? `Level: ${level}` : null,
    instructor ? `Instructor: ${instructor}` : null,
    studio ? `Studio: ${studio}` : null
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function isPoleOrAerial(item: Studio66ClassItem, categoryName: string | null, allowedCategories: Set<number>): boolean {
  if (typeof item.ClassCategoryID === "number" && allowedCategories.has(item.ClassCategoryID)) {
    return true;
  }

  const text = `${item.Name ?? ""} ${item.SubTitle ?? ""} ${categoryName ?? ""}`;
  return disciplinePattern.test(text);
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(
    new Map(
      classes.map((item) => [
        `${item.title}|${item.startDate ?? "na"}|${item.time ?? "na"}|${item.bookingUrl}`,
        item
      ])
    ).values()
  );
}

export async function scrapeStudio66(): Promise<AdapterOutput> {
  try {
    const categoryNameById = new Map<number, string>();
    const allowedCategories = new Set<number>();

    const fundamentals = await fetchJson<Studio66FundamentalsResponse>(fundamentalsUrl, requestHeaders);
    for (const category of fundamentals.Result?.ClassCategoryList ?? []) {
      const id = category.ClassCategoryID;
      const name = normalizeText(category.ClassCategoryName);
      if (typeof id !== "number" || !name) continue;
      categoryNameById.set(id, name);
      if (disciplinePattern.test(name)) {
        allowedCategories.add(id);
      }
    }

    const startDate = londonIsoDate(new Date());
    const endDate = londonIsoDate(addDays(new Date(), daysToFetch));
    const params = new URLSearchParams({
      startDate,
      endDate,
      PageNumber: "1",
      PageSize: "500",
      ShowAsEvent: "false"
    });
    const payload = await fetchJson<Studio66ClassesResponse>(`${classesUrl}?${params.toString()}`, requestHeaders);

    const classes: ScrapedClass[] = [];
    for (const day of payload.Result?.ClassList ?? []) {
      const dayDate = parseOccurrenceDate(day.OccurrenceDate);

      for (const item of day.ClassPOSList ?? []) {
        const title = normalizeText(item.Name);
        if (!title) continue;

        const categoryName =
          typeof item.ClassCategoryID === "number" ? (categoryNameById.get(item.ClassCategoryID) ?? null) : null;
        if (!isPoleOrAerial(item, categoryName, allowedCategories)) continue;

        const occurrenceDate = parseOccurrenceDate(item.OccurrenceDate) ?? dayDate;
        const startDateIso = occurrenceDate ? format(occurrenceDate, "yyyy-MM-dd") : null;
        const dayOfWeek = occurrenceDate ? format(occurrenceDate, "EEEE") : null;

        classes.push({
          venue,
          title,
          details: buildDetails(item, categoryName),
          dayOfWeek,
          time: toTimeRange(item.StartTime, item.EndTime),
          startDate: startDateIso,
          endDate: startDateIso,
          bookingUrl: sourceUrl,
          sourceUrl
        });
      }
    }

    return {
      venueKey: "studio66",
      venue,
      sourceUrl,
      classes: dedupe(classes),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "studio66",
      venue,
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
