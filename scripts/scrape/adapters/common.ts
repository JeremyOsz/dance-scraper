import axios from "axios";

export async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 20_000,
    responseType: "text",
    headers: {
      "User-Agent": "dance-scraper/2.0 (+https://github.com/)",
      ...headers
    }
  });
  return data;
}

export async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const { data } = await axios.get<T>(url, {
    timeout: 20_000,
    responseType: "json",
    headers: {
      "User-Agent": "dance-scraper/2.0 (+https://github.com/)",
      ...headers
    }
  });
  return data;
}

export function absoluteUrl(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
