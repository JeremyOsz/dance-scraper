import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "London Dance Calendar",
    short_name: "London Dance Calendar",
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
        src: "/icons/favicon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
