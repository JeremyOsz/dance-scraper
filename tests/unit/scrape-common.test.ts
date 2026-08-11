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
});
