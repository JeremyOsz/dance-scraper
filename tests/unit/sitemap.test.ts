import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";
import { getBaseUrl } from "../../lib/seo";
import { getDanceStyleGuides } from "../../lib/style-guides";

describe("sitemap", () => {
  it("includes the style directory and every canonical style guide", () => {
    const urls = new Set(sitemap().map((entry) => entry.url));
    const baseUrl = getBaseUrl();

    expect(urls.has(`${baseUrl}/styles`)).toBe(true);
    for (const guide of getDanceStyleGuides()) {
      expect(urls.has(`${baseUrl}/styles/${guide.slug}`)).toBe(true);
    }
  });
});
