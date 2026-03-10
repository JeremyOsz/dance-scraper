const FALLBACK_BASE_URL = "http://localhost:3000";

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
