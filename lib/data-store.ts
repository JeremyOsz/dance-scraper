import fs from "node:fs";
import path from "node:path";
import type { ScrapeOutput } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "classes.normalized.json");

const EMPTY_DATA: ScrapeOutput = {
  generatedAt: new Date(0).toISOString(),
  sessions: [],
  venues: []
};

export function readScrapeOutput(): ScrapeOutput {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return EMPTY_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as ScrapeOutput;
  } catch {
    return EMPTY_DATA;
  }
}
