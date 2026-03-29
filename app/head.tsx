import { getBaseUrl } from "@/lib/seo";

const siteName = "London Dance Calendar";
const description =
  "Find adult and open dance and movement classes across London with a searchable calendar, venue index, and map.";

export default function Head() {
  const baseUrl = getBaseUrl();

  return (
    <>
      <title>{siteName}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={baseUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={siteName} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={baseUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteName} />
      <meta name="twitter:description" content={description} />
      <meta name="google-site-verification" content="6L2YCyrL4QMNv24tNJdXYjJWsMh5ni5Cunqnsq1n1lo" />
    </>
  );
}
