import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DanceSession } from "../../lib/types";
import { appendPastArchive, formatDateInLondon, isSessionClearlyPast, sessionArchiveDedupeKey } from "../../scripts/scrape/past-archive";

function session(partial: Partial<DanceSession> & Pick<DanceSession, "id" | "venue" | "title">): DanceSession {
  return {
    details: null,
    dayOfWeek: "Monday",
    startTime: "10am",
    endTime: "11am",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/b",
    sourceUrl: "https://example.com",
    tags: [],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-01T12:00:00.000Z",
    ...partial
  };
}

describe("past archive helpers", () => {
  it("formats London calendar date", () => {
    const d = formatDateInLondon(Date.parse("2026-06-15T23:00:00.000Z"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("treats undated sessions as not clearly past", () => {
    const s = session({ id: "a", venue: "V", title: "T" });
    expect(isSessionClearlyPast(s, Date.parse("2026-12-01T12:00:00.000Z"))).toBe(false);
  });

  it("detects past dated sessions using London today", () => {
    const now = Date.parse("2026-03-20T12:00:00.000Z");
    const today = formatDateInLondon(now);
    const past = session({
      id: "p",
      venue: "V",
      title: "Old",
      startDate: "2020-01-01",
      endDate: "2020-01-01"
    });
    expect(isSessionClearlyPast(past, now)).toBe(true);

    const future = session({
      id: "f",
      venue: "V",
      title: "Fut",
      startDate: today,
      endDate: today
    });
    expect(isSessionClearlyPast(future, now)).toBe(false);
  });

  it("dedupe key includes dates and booking url", () => {
    const a = session({ id: "x", venue: "V", title: "T", startDate: "2026-01-01", endDate: "2026-01-01" });
    const b = { ...a, endDate: "2026-01-02" };
    expect(sessionArchiveDedupeKey(a)).not.toBe(sessionArchiveDedupeKey(b));
  });

  it("appendPastArchive writes only clearly past evicted rows", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "past-archive-"));
    const file = path.join(dir, "classes.past.json");
    const now = Date.parse("2026-03-20T12:00:00.000Z");

    const evicted = [
      session({
        id: "weekly",
        venue: "Rambert",
        title: "Weekly",
        startDate: null,
        endDate: null
      }),
      session({
        id: "old",
        venue: "Rambert",
        title: "Gone workshop",
        startDate: "2025-12-01",
        endDate: "2025-12-01"
      })
    ];

    appendPastArchive(evicted, file, now, "2026-03-20T10:00:00.000Z");
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as { sessions: DanceSession[] };
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].title).toBe("Gone workshop");
  });
});
