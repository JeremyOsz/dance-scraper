/** Browser-safe: hostname of an absolute URL, or empty string if invalid. */
export function extractOutboundHostname(url: string): string {
  try {
    return new URL(url).hostname || "";
  } catch {
    return "";
  }
}
