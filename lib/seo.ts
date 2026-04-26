const FALLBACK_BASE_URL = "http://localhost:3000";
export const SITE_NAME = "London Dance Calendar";
export const SITE_DESCRIPTION =
  "Find adult and open dance and movement classes across London with a searchable calendar, venue index, and map.";
export const DATASET_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const TITLE_MAX_LENGTH = 55;
const DESCRIPTION_MAX_LENGTH = 145;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  if (maxLength <= 3) {
    return normalized.slice(0, maxLength);
  }
  const limit = maxLength - 3;
  const sliced = normalized.slice(0, limit + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace >= Math.floor(limit * 0.65) ? sliced.slice(0, lastSpace) : normalized.slice(0, limit);
  return `${cut.replace(/[,.:\s]+$/g, "")}...`;
}

export function buildPageTitle(title: string, maxLength = TITLE_MAX_LENGTH): string {
  const normalizedTitle = normalizeWhitespace(title);
  if (!normalizedTitle || normalizedTitle === SITE_NAME) {
    return SITE_NAME;
  }

  const suffix = ` | ${SITE_NAME}`;
  const titleMax = Math.max(10, maxLength - suffix.length);
  return `${truncateText(normalizedTitle, titleMax)}${suffix}`;
}

export function buildMetaDescription(description: string, maxLength = DESCRIPTION_MAX_LENGTH): string {
  return truncateText(description, maxLength);
}

export function buildCanonicalRobots({
  isProduction
}: {
  isProduction: boolean;
  hasQuery: boolean;
}) {
  return {
    index: isProduction,
    follow: isProduction
  };
}

export function isIndexableDeployment(baseUrl = getBaseUrl()): boolean {
  if (process.env.VERCEL_ENV === "production") {
    return true;
  }

  try {
    const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");
    return hostname === "londondancecalendar.com";
  } catch {
    return false;
  }
}

export function buildStudioSeoText({
  name,
  classCount,
  topTypes,
  activeDays,
  ok
}: {
  name: string;
  classCount: number;
  topTypes: string[];
  activeDays: string[];
  ok: boolean;
}) {
  const styles = topTypes.length > 0 ? topTypes.slice(0, 3).join(", ") : "dance and movement";
  const days = activeDays.length > 0 ? ` across ${activeDays.slice(0, 4).join(", ")}` : "";
  const status = ok ? "current listings" : "latest scrape status";
  return {
    title: buildPageTitle(`${name} Dance Classes`),
    description: buildMetaDescription(
      `${name} has ${classCount} listed classes on ${SITE_NAME}, covering ${styles}${days}. View ${status}, sample sessions, and source links.`
    )
  };
}

function toAbsoluteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const normalized = toAbsoluteUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return FALLBACK_BASE_URL;
}
