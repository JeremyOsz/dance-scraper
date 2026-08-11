import { format } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { postJson } from "./common";

const sourceUrl = "https://www.city-academy.com/Dance-Classes";
const timetableApiUrl = "https://www.city-academy.com/caapi/public/api/event/casearchcourse";
const pageSize = 100;
const danceSubjects = [
  "Absolute Beginners",
  "Ballet",
  "Ballroom",
  "Belly Dance",
  "Bollywood",
  "Burlesque",
  "Commercial Dance",
  "Contemporary",
  "Dance Foundation",
  "Diva Dance",
  "Flamenco",
  "Jazz Dance",
  "Jive",
  "Salsa",
  "Street Dance",
  "Tango",
  "Tap Dance"
];

type CityAcademyEvent = {
  parent_code?: string;
  location_name?: string;
  tutor_name?: string;
  duration?: string;
  event_date?: string;
  event_end_date?: string;
  individual_price?: string;
  venue_discount?: string;
  timeTxt?: string;
  course_name?: string;
  course_pageurl?: string;
};

type CityAcademyResponse = {
  success?: boolean;
  message?: string;
  data?: CityAcademyEvent[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isoDate(value: string | undefined): string | null {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function dayOfWeek(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, "EEEE");
}

function timeRange(event: CityAcademyEvent): string | null {
  const published = normalizeText(event.timeTxt);
  if (published) return published;
  const start = event.event_date?.match(/\s(\d{2}:\d{2})/)?.[1];
  const end = event.event_end_date?.match(/\s(\d{2}:\d{2})/)?.[1];
  return start ? `${start}${end ? ` - ${end}` : ""}` : null;
}

function toClass(event: CityAcademyEvent): ScrapedClass | null {
  const title = normalizeText(event.course_name);
  const bookingUrl = normalizeText(event.course_pageurl);
  const startDate = isoDate(event.event_date);
  if (!title || !bookingUrl || !startDate) return null;

  const endDate = isoDate(event.event_end_date) ?? startDate;
  const details = [
    normalizeText(event.location_name) || null,
    normalizeText(event.tutor_name) ? `Tutor: ${normalizeText(event.tutor_name)}` : null,
    normalizeText(event.duration) || null,
    normalizeText(event.individual_price) ? `£${normalizeText(event.individual_price)}` : null,
    normalizeText(event.venue_discount) || null
  ]
    .filter((part): part is string => Boolean(part))
    .join(" • ");

  return {
    venue: "City Academy",
    title,
    details: details || null,
    dayOfWeek: dayOfWeek(startDate),
    time: timeRange(event),
    startDate,
    endDate,
    isCourse: true,
    bookingUrl,
    sourceUrl
  };
}

async function fetchAllEvents(): Promise<CityAcademyEvent[]> {
  const events: CityAcademyEvent[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await postJson<CityAcademyResponse>(timetableApiUrl, {
      event_subject_title: danceSubjects,
      event_day: ["All"],
      limit: pageSize,
      offset
    });
    if (!response.success || !Array.isArray(response.data)) {
      throw new Error(response.message || "City Academy timetable API returned an invalid response");
    }
    events.push(...response.data);
    if (response.data.length < pageSize) break;
  }
  return events;
}

export async function scrapeCityAcademy(): Promise<AdapterOutput> {
  try {
    const events = await fetchAllEvents();
    const classes = events.map(toClass).filter((item): item is ScrapedClass => item !== null);
    const unique = Array.from(
      new Map(
        classes.map((item) => [
          `${item.title}|${item.startDate}|${item.endDate}|${item.time}|${item.details}`,
          item
        ])
      ).values()
    );

    return {
      venueKey: "cityAcademy",
      venue: "City Academy",
      sourceUrl,
      classes: unique,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "cityAcademy",
      venue: "City Academy",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
