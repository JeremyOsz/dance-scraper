import * as cheerio from "cheerio";
import { format } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.wednesdaymoving.co.uk/";
const defaultLocation = "Round Chapel Old School Rooms, Powerscroft Road, Hackney E5 0PU";
const defaultTime = "18:45 - 20:00";

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  return rows;
}

function parseDate(raw: string): Date | null {
  const match = raw.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function extractUpcomingCsvUrl(homeHtml: string): string | null {
  const $ = cheerio.load(homeHtml);
  const candidates: string[] = [];

  $("script[data-sveltekit-fetched]").each((_, el) => {
    const dataUrl = $(el).attr("data-url");
    if (!dataUrl) return;
    if (/google\.com\/spreadsheets/i.test(dataUrl) && /gid=0/i.test(dataUrl) && /output=csv/i.test(dataUrl)) {
      candidates.push(dataUrl);
    }
  });

  return candidates[0] ?? null;
}

export async function scrapeWednesdayMoving(): Promise<AdapterOutput> {
  try {
    const home = await fetchHtml(sourceUrl);
    const csvUrl = extractUpcomingCsvUrl(home);
    if (!csvUrl) {
      return {
        venueKey: "wednesdayMoving",
        venue: "Wednesday Moving",
        sourceUrl,
        classes: [],
        ok: true,
        error: null
      };
    }

    const csvRaw = await fetchHtml(csvUrl);
    const rows = parseCsv(csvRaw);
    const [header, ...dataRows] = rows;
    const idx = new Map(header.map((name, i) => [name.trim().toLowerCase(), i]));
    const dateIndex = idx.get("date");
    const nameIndex = idx.get("name");
    const descriptionIndex = idx.get("description");
    const bookingLinkIndex = idx.get("booking_link");

    const classes: AdapterOutput["classes"] = [];
    for (const row of dataRows) {
      const rawDate = (dateIndex !== undefined ? row[dateIndex] : "") ?? "";
      const rawName = (nameIndex !== undefined ? row[nameIndex] : "") ?? "";
      const rawDescription = (descriptionIndex !== undefined ? row[descriptionIndex] : "") ?? "";
      const rawBooking = (bookingLinkIndex !== undefined ? row[bookingLinkIndex] : "") ?? "";

      const date = parseDate(rawDate);
      if (!date) continue;

      const title = `Wednesday Moving - ${rawName.trim() || "Guest Facilitator"}`;
      const details = [defaultLocation, rawDescription.trim()].filter(Boolean).join(" • ");

      classes.push({
        venue: "Wednesday Moving",
        title,
        details: details || null,
        dayOfWeek: format(date, "EEEE"),
        time: defaultTime,
        startDate: format(date, "yyyy-MM-dd"),
        endDate: format(date, "yyyy-MM-dd"),
        bookingUrl: rawBooking.trim() || sourceUrl,
        sourceUrl
      });
    }

    return {
      venueKey: "wednesdayMoving",
      venue: "Wednesday Moving",
      sourceUrl,
      classes: Array.from(new Map(classes.map((item) => [item.title + item.startDate, item])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "wednesdayMoving",
      venue: "Wednesday Moving",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
