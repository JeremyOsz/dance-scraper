import * as cheerio from "cheerio";
import { addDays, format, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.trinitylaban.ac.uk/courses/professional-dance-classes/";

export function parseTrinityLabanHtml(html: string, now = new Date()): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const classes: AdapterOutput["classes"] = [];
  $("table tr").each((_, row) => {
    const cells = $(row).find("td").toArray().map((cell) => $(cell).text().replace(/\s+/g, " ").trim());
    if (cells.length < 2 || /week commencing/i.test(cells[0])) return;
    const weekStart = parse(cells[0], "MMMM d, yyyy", today);
    if (Number.isNaN(weekStart.getTime())) return;
    const artist = cells[1];
    for (let offset = 0; offset < 5; offset += 1) {
      const date = addDays(weekStart, offset);
      const dateText = format(date, "d MMMM");
      if (date < today || new RegExp(`no class (?:on )?(?:Monday|Tuesday|Wednesday|Thursday|Friday)?\\s*${dateText}`, "i").test(artist)) continue;
      classes.push({
        venue: "Trinity Laban",
        organizer: "Trinity Laban",
        locationName: "Laban Building",
        address: "Creekside",
        postcode: "SE8 3DZ",
        borough: "Lewisham",
        styles: ["Contemporary"],
        title: `Open Professional Dance Class${artist ? ` with ${artist.replace(/\*.*$/, "").trim()}` : ""}`,
        details: "Professional and advanced-level open class.",
        dayOfWeek: format(date, "EEEE"),
        time: "09:00 - 10:30",
        startDate: format(date, "yyyy-MM-dd"),
        endDate: format(date, "yyyy-MM-dd"),
        bookingUrl: sourceUrl,
        sourceUrl
      });
    }
  });
  return classes;
}

export async function scrapeTrinityLaban(): Promise<AdapterOutput> {
  try {
    const classes = parseTrinityLabanHtml(await fetchHtml(sourceUrl));
    return { venueKey: "trinityLaban", venue: "Trinity Laban", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return { venueKey: "trinityLaban", venue: "Trinity Laban", sourceUrl, classes: [], ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
