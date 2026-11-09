import { describe, expect, it } from "vitest";
import { assertExpectedRedirect } from "@/scripts/scrape/adapters/common";

describe("scrape redirect validation", () => {
  it("accepts protocol and same-site subdomain redirects", () => {
    expect(() => assertExpectedRedirect("http://example.com/classes", "https://www.example.com/classes")).not.toThrow();
    expect(() => assertExpectedRedirect("https://example.com", "https://schedule.example.com/classes")).not.toThrow();
  });

  it("rejects unexpected cross-domain redirects", () => {
    expect(() => assertExpectedRedirect("https://example.com/classes", "https://unrelated.test/landing"))
      .toThrow("Unexpected cross-domain redirect");
  });

  it("accepts Google's published spreadsheet CSV download redirect", () => {
    expect(() => assertExpectedRedirect(
      "https://docs.google.com/spreadsheets/d/e/published-id/pub?gid=0&output=csv",
      "https://doc-0k-c0-sheets.googleusercontent.com/pub/export-id?gid=0&output=csv"
    )).not.toThrow();
  });

  it.each([
    ["https://docs.google.com/document/d/id", "https://doc-0k-c0-sheets.googleusercontent.com/pub/id?output=csv"],
    ["https://docs.google.com/spreadsheets/d/e/id/pub?output=csv", "https://sheets.googleusercontent.com.attacker.test/pub/id?output=csv"],
    ["https://docs.google.com/spreadsheets/d/e/id/pub?output=csv", "http://doc-0k-c0-sheets.googleusercontent.com/pub/id?output=csv"],
    ["https://docs.google.com/spreadsheets/d/e/id/pub?output=csv", "https://other.googleusercontent.com/pub/id?output=csv"]
  ])("rejects unrelated Google and lookalike redirects", (requested, final) => {
    expect(() => assertExpectedRedirect(requested, final)).toThrow("Unexpected cross-domain redirect");
  });
});
