import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dance Scraper London",
    short_name: "Dance Scraper",
    description:
      "Find adult and open dance and movement classes across London with a searchable calendar, venue index, and map.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["lifestyle", "education", "entertainment"],
    icons: [
      {
        src: "/icons/dance-scraper-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
