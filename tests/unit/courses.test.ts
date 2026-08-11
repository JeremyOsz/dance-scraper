import { describe, expect, it } from "vitest";
import { buildCourseListings, excerptCourseDetails, inferIsCourse } from "../../lib/courses";
import { coerceScrapeOutput } from "../../lib/data-store";
import type { DanceSession } from "../../lib/types";

function session(overrides: Partial<DanceSession> = {}): DanceSession {
  return {
    id: "course-session",
    venue: "Example Studio",
    title: "Beginner Contemporary Course",
    details: "Book the full six-week course.",
    dayOfWeek: "Tuesday",
    startTime: "19:00",
    endTime: "20:30",
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    timezone: "Europe/London",
    bookingUrl: "https://example.com/courses/contemporary?session=autumn#book",
    sourceUrl: "https://example.com/classes",
    tags: ["contemporary"],
    audience: "adult",
    isWorkshop: false,
    isCourse: true,
    lastSeenAt: "2026-08-11T00:00:00.000Z",
    ...overrides
  };
}

describe("inferIsCourse", () => {
  it.each([
    ["Six-week contemporary course", "Open level", "https://example.com/book"],
    ["Autumn contemporary", "Available as a term booking or drop-in.", "https://example.com/book"],
    ["Beginner ballet", "Enrol for the full course.", "https://example.com/book"],
    ["Beginner ballet", "A six-week programme with enrolment required.", "https://example.com/book"],
    ["Beginner ballet", "Weekly technique", "https://example.com/courses/beginner-ballet"]
  ])("recognises strong course signals", (title, details, bookingUrl) => {
    expect(inferIsCourse({ title, details, bookingUrl })).toBe(true);
  });

  it("does not classify generic source copy as a course", () => {
    expect(
      inferIsCourse({
        title: "Professional class",
        details: "Drop in by the day. Browse our classes and courses programme.",
        bookingUrl: "https://example.com/classes-courses/professional-class"
      })
    ).toBe(false);
  });

  it("honours explicit adapter overrides", () => {
    expect(
      inferIsCourse({
        title: "Six-week course",
        details: null,
        bookingUrl: "https://example.com/course",
        isCourse: false
      })
    ).toBe(false);
    expect(
      inferIsCourse({
        title: "Weekly class",
        details: null,
        bookingUrl: "https://example.com/book",
        isCourse: true
      })
    ).toBe(true);
  });
});

describe("excerptCourseDetails", () => {
  it("shortens long descriptions without cutting the final word", () => {
    expect(excerptCourseDetails("A detailed description of this course", 24)).toBe("A detailed description…");
  });
});

describe("buildCourseListings", () => {
  it("groups repeated occurrences and aggregates the complete schedule", () => {
    const listings = buildCourseListings(
      [
        session({ id: "one", startDate: "2026-09-01", endDate: "2026-09-01" }),
        session({
          id: "two",
          dayOfWeek: "Thursday",
          startTime: "18:00",
          endTime: "19:30",
          startDate: "2026-10-08",
          endDate: "2026-10-08",
          bookingUrl: "https://example.com/courses/contemporary?session=autumn"
        })
      ],
      "2026-08-11"
    );

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-10-08",
      status: "upcoming",
      schedules: ["Tuesday · 19:00–20:30", "Thursday · 18:00–19:30"]
    });
    expect(listings[0]?.members.map((member) => member.id)).toEqual(["one", "two"]);
  });

  it("keeps courses with different titles separate even when they share a booking URL", () => {
    const listings = buildCourseListings(
      [session(), session({ id: "ballet", title: "Beginner Ballet Course" })],
      "2026-08-11"
    );

    expect(listings.map((listing) => listing.title)).toEqual([
      "Beginner Ballet Course",
      "Beginner Contemporary Course"
    ]);
  });

  it("keeps in-progress and undated courses but removes ended courses", () => {
    const listings = buildCourseListings(
      [
        session({ id: "upcoming", title: "Upcoming Course", startDate: "2026-09-01", endDate: "2026-10-01" }),
        session({ id: "current", title: "Current Course", startDate: "2026-07-01", endDate: "2026-09-01" }),
        session({ id: "ended", title: "Ended Course", startDate: "2026-05-01", endDate: "2026-06-01" }),
        session({ id: "undated", title: "Dates Unknown Course", startDate: null, endDate: null })
      ],
      "2026-08-11"
    );

    expect(listings.map(({ title, status }) => [title, status])).toEqual([
      ["Upcoming Course", "upcoming"],
      ["Current Course", "in-progress"],
      ["Dates Unknown Course", "dates-tbc"]
    ]);
  });

  it("excludes sessions that are not classified as courses", () => {
    expect(buildCourseListings([session({ isCourse: false })], "2026-08-11")).toEqual([]);
  });
});

describe("legacy course data", () => {
  it("backfills isCourse when persisted sessions predate the field", () => {
    const legacy = { ...session() } as Partial<DanceSession>;
    delete legacy.isCourse;

    const output = coerceScrapeOutput({
      generatedAt: "2026-08-11T00:00:00.000Z",
      sessions: [legacy],
      venues: []
    });

    expect(output.sessions[0]?.isCourse).toBe(true);
  });
});
