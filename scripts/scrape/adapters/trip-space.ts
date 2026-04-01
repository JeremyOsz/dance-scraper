import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://momence.com/u/tripspace-bKDjuG";
const scheduleUrl = "https://tripspace.co.uk/schedule-bookings/";
const fallbackSourceUrl = "https://tripspace.co.uk/dance/";
const momenceReadonlyApiBase = "https://readonly-api.momence.com";
const defaultHostId = "43797";

type MomenceSessionsResponse = {
  payload?: Array<{
    sessionName?: string;
    level?: string | null;
    startsAt?: string;
    endsAt?: string;
    link?: string;
    semester?: unknown | null;
    type?: string;
  }>;
  pagination?: {
    pageSize?: number;
    totalCount?: number;
  };
};

function isYogaSession(text: string) {
  return /\byoga\b/i.test(text);
}

async function fetchMomenceSessions(hostId: string): Promise<NonNullable<MomenceSessionsResponse["payload"]>> {
  const pageSize = 100;
  const all: NonNullable<MomenceSessionsResponse["payload"]> = [];
  let page = 0;

  while (page < 20) {
    const url = `${momenceReadonlyApiBase}/host-plugins/host/${hostId}/host-schedule/sessions?pageSize=${pageSize}&page=${page}`;
    const raw = await fetchHtml(url);
    const parsed = JSON.parse(raw) as MomenceSessionsResponse;
    const payload = parsed.payload ?? [];
    all.push(...payload);

    const total = parsed.pagination?.totalCount ?? payload.length;
    if (payload.length === 0 || all.length >= total) {
      break;
    }
    page += 1;
  }

  return all;
}

function fallbackDancePageClasses($: cheerio.CheerioAPI): AdapterOutput["classes"] {
  const classes: AdapterOutput["classes"] = [];

  $("article, .tribe-events, .event, .entry, .post").each((_, el) => {
    const title = $(el).find("h2, h3, h4, .entry-title").first().text().trim();
    if (!title || title.length < 5) return;

    const text = $(el).text().replace(/\s+/g, " ");
    const day = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[1] ?? null;
    const time = text.match(/\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?\s*(?:-|–|to)\s*\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?/i)?.[0] ?? null;
    const href = $(el).find('a[href*="event"], a[href*="workshop"], a[href*="dance"], a[href*="booking"]').first().attr("href");
    const bookingUrl = absoluteUrl(fallbackSourceUrl, href);
    if (!bookingUrl) return;
    const combinedText = `${title} ${text}`;
    if (isYogaSession(combinedText)) return;
    if (!/(dance|movement|yoga|workshop|somatic|improv|class)/i.test(combinedText)) return;

    classes.push({
      venue: "TripSpace",
      title,
      details: $(el).find("p").first().text().trim() || null,
      dayOfWeek: day,
      time,
      startDate: null,
      endDate: null,
      bookingUrl,
      sourceUrl: fallbackSourceUrl
    });
  });

  return classes;
}

export async function scrapeTripSpace(): Promise<AdapterOutput> {
  try {
    const classes: AdapterOutput["classes"] = [];
    const html = await fetchHtml(scheduleUrl);
    const $ = cheerio.load(html);
    const momenceHostId = $('script[src*="momence.com/plugin/host-schedule/host-schedule.js"][host_id]')
      .first()
      .attr("host_id") ?? defaultHostId;

    if (momenceHostId) {
      try {
        const sessions = await fetchMomenceSessions(momenceHostId);
        for (const session of sessions) {
          if (session.semester || session.type === "semester") {
            continue;
          }
          if (!session.sessionName || !session.startsAt || !session.endsAt || !session.link) {
            continue;
          }
          if (isYogaSession(`${session.sessionName} ${session.level ?? ""}`)) {
            continue;
          }

          const startsAt = parseISO(session.startsAt);
          const endsAt = parseISO(session.endsAt);
          if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            continue;
          }

          classes.push({
            venue: "TripSpace",
            title: session.sessionName.trim(),
            details: session.level?.replace(/\s+/g, " ").trim() || null,
            dayOfWeek: format(startsAt, "EEEE"),
            time: `${format(startsAt, "HH:mm")} - ${format(endsAt, "HH:mm")}`,
            startDate: format(startsAt, "yyyy-MM-dd"),
            endDate: format(endsAt, "yyyy-MM-dd"),
            bookingUrl: session.link,
            sourceUrl
          });
        }
      } catch {
        // Fall back to dance page parsing if Momence API is temporarily unavailable.
      }
    }

    if (classes.length === 0) {
      const fallbackHtml = await fetchHtml(fallbackSourceUrl);
      const fallback$ = cheerio.load(fallbackHtml);
      classes.push(...fallbackDancePageClasses(fallback$));
    }

    const unique = Array.from(new Map(classes.map((c) => [c.bookingUrl + c.startDate + c.time, c])).values());

    return {
      venueKey: "tripSpace",
      venue: "TripSpace",
      sourceUrl,
      classes: unique,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "tripSpace",
      venue: "TripSpace",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
