import type { MetadataRoute } from "next";
import { getBaseUrl, isIndexableDeployment } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const isProductionDeployment = isIndexableDeployment(baseUrl);

  if (!isProductionDeployment) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/"
        }
      ]
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: [`${baseUrl}/sitemap.xml`],
    host: baseUrl
  };
}
