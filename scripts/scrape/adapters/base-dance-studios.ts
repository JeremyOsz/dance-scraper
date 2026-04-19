import type { AdapterOutput, ScrapedClass } from "../types";
import { chromium } from "playwright";

const sourceUrl = "https://www.basedancestudios.com/weekly-timetable-2";
const dayPages = [
  { dayOfWeek: "Monday", url: "https://www.basedancestudios.com/monday" },
  { dayOfWeek: "Tuesday", url: "https://www.basedancestudios.com/copy-of-monday" },
  { dayOfWeek: "Wednesday", url: "https://www.basedancestudios.com/copy-2-of-monday" },
  { dayOfWeek: "Thursday", url: "https://www.basedancestudios.com/copy-3-of-monday" },
  { dayOfWeek: "Friday", url: "https://www.basedancestudios.com/copy-4-of-monday" },
  { dayOfWeek: "Saturday", url: "https://www.basedancestudios.com/copy-5-of-monday" },
  { dayOfWeek: "Sunday", url: "https://www.basedancestudios.com/copy-6-of-monday" }
] as const;

type BaseRow = {
  time: string;
  teacher: string | null;
  className: string;
  level: string | null;
  studio: string | null;
  price: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function extractUrl(value: string | null): string | null {
  const text = normalizeText(value);
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

function toClass(row: BaseRow, dayOfWeek: string, pageUrl: string): ScrapedClass {
  const details = [
    row.teacher ? `Teacher: ${row.teacher}` : null,
    row.level ? `Level: ${row.level}` : null,
    row.studio ? `Studio: ${row.studio}` : null,
    row.price ? `Price: ${row.price}` : null
  ]
    .filter((part): part is string => Boolean(part))
    .join(" | ");

  return {
    venue: "BASE Dance Studios",
    title: row.className,
    details: details || null,
    dayOfWeek,
    time: row.time,
    startDate: null,
    endDate: null,
    bookingUrl: extractUrl(row.price) ?? pageUrl,
    sourceUrl: pageUrl
  };
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(
    new Map(
      classes.map((item) => [
        `${item.dayOfWeek ?? "na"}|${item.time ?? "na"}|${item.title}|${item.details ?? "na"}`,
        item
      ])
    ).values()
  );
}

async function extractRowsFromPage(pageUrl: string): Promise<BaseRow[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector("iframe", { timeout: 25_000 });

    const iframeHandle = await page.locator("iframe").first().elementHandle();
    let frame = await iframeHandle?.contentFrame();
    const frameSearchStarted = Date.now();
    while (!frame && Date.now() - frameSearchStarted < 30_000) {
      await page.waitForTimeout(250);
      frame = await iframeHandle?.contentFrame();
    }

    if (!frame) {
      throw new Error(`BASE iframe frame was not available on ${pageUrl}`);
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await frame.waitForSelector("table tr", { timeout: 25_000, state: "attached" });
        return await frame.evaluate(`(() => {
          const text = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
          const rows = [];
          const lines = text(document.body ? document.body.innerText : "").split("\\n").map(text).filter(Boolean);
          const headerIndex = lines.findIndex(
            (line) => line.includes("TIME") && line.includes("CLASS") && line.includes("TEACHER")
          );
          if (headerIndex >= 0) {
            for (let i = headerIndex + 1; i < lines.length; i += 1) {
              const raw = lines[i];
              if (!raw) continue;
              const cells = raw.split("\\t").map(text).filter((cell) => cell.length > 0);
              if (cells.length < 3) continue;
              const [time, teacher, className, level, studio, ...rest] = cells;
              if (!time || !className) continue;
              rows.push({
                time,
                teacher: teacher || null,
                className,
                level: level || null,
                studio: studio || null,
                price: rest.length > 0 ? rest.join(" | ") : null
              });
            }
          }
          return rows;
        })()`);
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(300);
        frame = page.frames().find((entry) => entry.url().includes("wix-visual-data.appspot.com/index")) ?? frame;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unable to extract BASE iframe rows");
  } finally {
    await browser.close();
  }
}

export async function scrapeBaseDanceStudios(): Promise<AdapterOutput> {
  try {
    const classes: ScrapedClass[] = [];
    for (const page of dayPages) {
      const rows = await extractRowsFromPage(page.url);
      if (!Array.isArray(rows)) continue;
      classes.push(...rows.map((row) => toClass(row, page.dayOfWeek, page.url)));
    }
    const deduped = dedupe(classes);

    return {
      venueKey: "baseDanceStudios",
      venue: "BASE Dance Studios",
      sourceUrl,
      classes: deduped,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "baseDanceStudios",
      venue: "BASE Dance Studios",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
