import { describe, expect, it } from "vitest";
import { isDateInExcludedRanges } from "@/lib/session-excluded-dates";

describe("session excluded dates", () => {
  it("returns false when ranges undefined or empty", () => {
    expect(isDateInExcludedRanges("2026-03-11", undefined)).toBe(false);
    expect(isDateInExcludedRanges("2026-03-11", [])).toBe(false);
  });

  it("matches inclusive ISO date ranges", () => {
    const ranges = [{ start: "2026-02-16", end: "2026-02-20" }];
    expect(isDateInExcludedRanges("2026-02-15", ranges)).toBe(false);
    expect(isDateInExcludedRanges("2026-02-16", ranges)).toBe(true);
    expect(isDateInExcludedRanges("2026-02-18", ranges)).toBe(true);
    expect(isDateInExcludedRanges("2026-02-20", ranges)).toBe(true);
    expect(isDateInExcludedRanges("2026-02-21", ranges)).toBe(false);
  });
});
