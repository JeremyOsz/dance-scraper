import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.contumbaosalsa.com/";

const TIME_RANGE_REGEX = /\b\d{1,2}:\d{2}\s*(?:-|–|—)\s*\d{1,2}:\d{2}\b/;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function findBookingUrl($: cheerio.CheerioAPI, root: cheerio.Cheerio<AnyNode>): string {
  const block = root.closest(".fe-block");
  const candidates: string[] = [];

  const collect = (node: cheerio.Cheerio<AnyNode>) => {
    node.find("a[href]").each((_, link) => {
      const href = absoluteUrl(sourceUrl, $(link).attr("href"));
      if (href) candidates.push(href);
    });
  };

  collect(root);
  if (block.length > 0) {
    collect(block);
  }

  let next = block.next();
  for (let hops = 0; hops < 4 && next.length > 0; hops += 1) {
    collect(next);
    next = next.next();
  }

  const preferred = candidates.find((url) => /(stripe\.com|book|ticket|eventbrite|outsavvy|bookwhen)/i.test(url));
  return preferred ?? candidates[0] ?? sourceUrl;
}

export async function scrapeConTumbaoSalsa(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    $(".sqs-html-content").each((_, el) => {
      const root = $(el);
      const title = normalizeText(root.find("h3").first().text());
      if (!title) return;
      if (!/(salsa|mambo|musicality|son cubano)/i.test(title)) return;

      const time = root
        .find("h4")
        .toArray()
        .map((h4) => normalizeText($(h4).text()))
        .find((value) => TIME_RANGE_REGEX.test(value));
      if (!time) return;

      const details = normalizeText(
        root
          .find("p")
          .toArray()
          .map((p) => $(p).text())
          .join(" ")
      );

      classes.push({
        venue: "Con Tumbao Salsa",
        title,
        details: details || null,
        dayOfWeek: "Tuesday",
        time,
        startDate: null,
        endDate: null,
        bookingUrl: findBookingUrl($, root),
        sourceUrl
      });
    });

    return {
      venueKey: "conTumbaoSalsa",
      venue: "Con Tumbao Salsa",
      sourceUrl,
      classes: Array.from(new Map(classes.map((item) => [`${item.title}|${item.time}`, item])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "conTumbaoSalsa",
      venue: "Con Tumbao Salsa",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
