import * as cheerio from "cheerio";
import { format, parse } from "date-fns";
import type { ScrapedClass } from "../types";
import { fetchJson } from "./common";

type TribeEvent = {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  url?: string;
  venue?: { venue?: string; address?: string; city?: string; zip?: string };
  organizer?: Array<{ organizer?: string }>;
  categories?: Array<{ name?: string; slug?: string }>;
};

type TribeResponse = { events?: TribeEvent[]; next_rest_url?: string | null };

function text(html?: string) {
  return html ? cheerio.load(html).text().replace(/\s+/g, " ").trim() : "";
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = parse(value, "yyyy-MM-dd HH:mm:ss", new Date());
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function fetchTribeClasses(input: {
  apiUrl: string;
  organizer: string;
  sourceUrl: string;
  include: (event: { title: string; details: string; organizers: string[]; categories: string[] }) => boolean;
}): Promise<ScrapedClass[]> {
  const all: TribeEvent[] = [];
  let next: string | null = input.apiUrl;
  for (let page = 0; next && page < 10; page += 1) {
    const response: TribeResponse = await fetchJson<TribeResponse>(next);
    if (!response || !Array.isArray(response.events)) throw new Error("Unexpected Tribe Events API response");
    all.push(...response.events);
    next = response.next_rest_url ?? null;
  }

  return all.flatMap((event): ScrapedClass[] => {
    const title = text(event.title);
    const details = text(event.description);
    const organizers = (event.organizer ?? []).map((item) => text(item.organizer)).filter(Boolean);
    const categories = (event.categories ?? []).flatMap((item) => [item.name, item.slug]).map(text).filter(Boolean);
    if (!title || !event.url || !input.include({ title, details, organizers, categories })) return [];
    const start = parseDate(event.start_date);
    const end = parseDate(event.end_date);
    const locationName = text(event.venue?.venue) || null;
    const address = [text(event.venue?.address), text(event.venue?.city)].filter(Boolean).join(", ") || null;
    return [{
      venue: input.organizer,
      organizer: input.organizer,
      locationName,
      address,
      postcode: text(event.venue?.zip) || null,
      title,
      details: details || null,
      dayOfWeek: start ? format(start, "EEEE") : null,
      time: start && end ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}` : null,
      startDate: start ? format(start, "yyyy-MM-dd") : null,
      endDate: start ? format(start, "yyyy-MM-dd") : null,
      bookingUrl: event.url,
      sourceUrl: input.sourceUrl
    }];
  });
}
