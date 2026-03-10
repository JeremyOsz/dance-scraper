import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://rambert.org.uk/classes/";
const momenceReadonlyApiBase = "https://readonly-api.momence.com";

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

function fallbackTimetableClasses($: cheerio.CheerioAPI): AdapterOutput["classes"] {
  const timetableLinks = [
    $('a[href*="momence.com"][href*="host"]').first().attr("href"),
    $('a[href*="?season=non-momence"]').first().attr("href"),
    $('a[href*="participation/classes"]').first().attr("href")
  ].filter((link): link is string => Boolean(link));

  return timetableLinks.map((link) => ({
    venue: "Rambert",
    title: "Rambert Classes Timetable",
    details: "Official timetable source",
    dayOfWeek: null,
    time: null,
    startDate: null,
    endDate: null,
    bookingUrl: new URL(link, sourceUrl).toString(),
    sourceUrl
  }));
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

export async function scrapeRambert(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];
    const momenceHostId = $('script[src*="momence.com/plugin/host-schedule/host-schedule.js"][host_id]')
      .first()
      .attr("host_id");

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

          const startsAt = parseISO(session.startsAt);
          const endsAt = parseISO(session.endsAt);
          if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            continue;
          }

          classes.push({
            venue: "Rambert",
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
        // Fall back to timetable links if Momence API is temporarily unavailable.
      }
    }

    if (classes.length === 0) {
      classes.push(...fallbackTimetableClasses($));
    }

    return {
      venueKey: "rambert",
      venue: "Rambert",
      sourceUrl,
      classes: Array.from(new Map(classes.map((c) => [`${c.bookingUrl}|${c.startDate ?? "na"}|${c.time ?? "na"}`, c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "rambert",
      venue: "Rambert",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
