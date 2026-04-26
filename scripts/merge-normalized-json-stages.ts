/**
 * During merge conflicts, the working copy of large JSON files can be unusable.
 * Reads git index stage 2 (ours) + stage 3 (theirs) via `git show :stage:path`.
 *
 * Session files: merge sessions by id — last writer in stage 2 wins; then set
 * isWorkshop false for venue Rambert. Timestamp field comes from stage 2.
 *
 * scrape-change-stats.json: stage 2 only (HEAD), since it is append-only run history.
 */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { coerceScrapeOutput } from "../lib/data-store";
import type { ScrapeOutput, VenueStatus } from "../lib/types";
import { dedupeSessionsByStableBookingUrl } from "./scrape/normalize";

interface Session {
  id: string;
  venue: string;
  isWorkshop?: boolean;
  [key: string]: unknown;
}

interface SessionFile {
  generatedAt?: string;
  updatedAt?: string;
  sessions: Session[];
}

function gitShow(stage: number, path: string): string {
  return execFileSync("git", ["show", `:${stage}:${path}`], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

function mergeSessionsById(ours: SessionFile, theirs: SessionFile): Session[] {
  const byId = new Map<string, Session>();
  for (const s of theirs.sessions) {
    byId.set(s.id, s);
  }
  for (const s of ours.sessions) {
    byId.set(s.id, s);
  }
  return Array.from(byId.values()).map((s) => {
    if (s.venue === "Rambert") {
      return { ...s, isWorkshop: false };
    }
    return s;
  });
}

function mergeNormalizedClasses(path: string): string {
  const ours = JSON.parse(gitShow(2, path)) as Partial<ScrapeOutput>;
  const theirs = JSON.parse(gitShow(3, path)) as Partial<ScrapeOutput>;
  const sessions = dedupeSessionsByStableBookingUrl(
    mergeSessionsById(
      { sessions: ours.sessions ?? [] } as SessionFile,
      { sessions: theirs.sessions ?? [] } as SessionFile,
    ),
  );
  const out = coerceScrapeOutput({
    generatedAt: ours.generatedAt,
    sessions,
    venues: Array.isArray(ours.venues) && ours.venues.length > 0 ? (ours.venues as VenueStatus[]) : undefined,
  });
  return JSON.stringify(out, null, 2) + "\n";
}

function mergePastArchive(path: string): string {
  const ours = JSON.parse(gitShow(2, path)) as SessionFile;
  const theirs = JSON.parse(gitShow(3, path)) as SessionFile;
  const sessions = mergeSessionsById(ours, theirs);
  const out: SessionFile = {
    updatedAt: ours.updatedAt,
    sessions,
  } as SessionFile;
  return JSON.stringify(out, null, 2) + "\n";
}

async function main() {
  const normalizedPath = "data/classes.normalized.json";
  const pastPath = "data/classes.past.json";
  const statsPath = "data/scrape-change-stats.json";

  const normJson = mergeNormalizedClasses(normalizedPath);
  await writeFile(normalizedPath, normJson, "utf8");
  console.error(
    `Wrote ${normalizedPath} (${(JSON.parse(normJson) as ScrapeOutput).sessions.length} sessions)`,
  );

  const pastJson = mergePastArchive(pastPath);
  await writeFile(pastPath, pastJson, "utf8");
  console.error(
    `Wrote ${pastPath} (${(JSON.parse(pastJson) as SessionFile).sessions.length} sessions)`,
  );

  const stats = gitShow(2, statsPath);
  JSON.parse(stats);
  await writeFile(statsPath, stats, "utf8");
  console.error(`Wrote ${statsPath} (stage 2 / HEAD)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
