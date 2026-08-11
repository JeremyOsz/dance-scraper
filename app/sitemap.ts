import type { MetadataRoute } from "next";
import { readScrapeOutput } from "@/lib/data-store";
import { getBaseUrl } from "@/lib/seo";
import { getStudioProfiles } from "@/lib/studios";
import { getLocationProfiles } from "@/lib/locations";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const data = readScrapeOutput();
  const studios = getStudioProfiles(data);
  const locations = getLocationProfiles(data);
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
    },
    {
      url: `${baseUrl}/studios`,
      lastModified: dataLastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: dataLastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    ...studios.map((studio) => ({
      url: `${baseUrl}/studios/${studio.slug}`,
      lastModified: studio.latestSeenAt ? new Date(studio.latestSeenAt) : dataLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.65
    })),
    ...locations.map((location) => ({
      url: `${baseUrl}/locations/${location.slug}`,
      lastModified: location.latestSeenAt ? new Date(location.latestSeenAt) : dataLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.65
    }))
  ];
}
