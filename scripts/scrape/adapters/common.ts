import axios from "axios";

export function assertExpectedRedirect(requestedUrl: string, finalUrl: string | undefined) {
  if (!finalUrl) return;
  const requested = new URL(requestedUrl);
  const final = new URL(finalUrl);
  const requestedHost = requested.hostname.replace(/^www\./, "");
  const finalHost = final.hostname.replace(/^www\./, "");
  const sameSite = requestedHost === finalHost || requestedHost.endsWith(`.${finalHost}`) || finalHost.endsWith(`.${requestedHost}`);
  if (!sameSite) {
    throw new Error(`Unexpected cross-domain redirect: ${requested.hostname} -> ${final.hostname}`);
  }
}

export async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 20_000,
    responseType: "text",
    headers: {
      "User-Agent": "dance-scraper/2.0 (+https://github.com/)",
      ...headers
    }
  });
  assertExpectedRedirect(url, response.request?.res?.responseUrl as string | undefined);
  return response.data;
}

export async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await axios.get<T>(url, {
    timeout: 20_000,
    responseType: "json",
    headers: {
      "User-Agent": "dance-scraper/2.0 (+https://github.com/)",
      ...headers
    }
  });
  assertExpectedRedirect(url, response.request?.res?.responseUrl as string | undefined);
  return response.data;
}

export async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const { data } = await axios.post<T>(url, body, {
    timeout: 20_000,
    responseType: "json",
    headers: {
      "User-Agent": "dance-scraper/2.0 (+https://github.com/)",
      "Content-Type": "application/json",
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
