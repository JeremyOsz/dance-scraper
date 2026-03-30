import type { MetadataRoute } from "next";
import { readScrapeOutput } from "@/lib/data-store";
import { getBaseUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const data = readScrapeOutput();
  const parsedGeneratedAt = new Date(data.generatedAt);
  const dataLastModified = Number.isNaN(parsedGeneratedAt.getTime()) ? new Date() : parsedGeneratedAt;

  return [
    {
      url: baseUrl,
      lastModified: dataLastModified,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: dataLastModified,
      changeFrequency: "weekly",
      priority: 0.6
    }
  ];
}
