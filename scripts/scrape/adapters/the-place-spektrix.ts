import { fetchJson } from "./common";
import { runPool } from "./the-place-fetch-pool";
import type { ScrapedClass } from "../types";

const api = "https://system.spektrix.com/theplace/api/v3";
const sourceUrl = "https://theplace.org.uk/dance/classes-and-courses";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function londonTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** Public booking API fallback for runners blocked by the venue website's firewall. */
export async function fetchPlaceBookingSessions(now = new Date()): Promise<ScrapedClass[]> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
  const payload = await fetchJson<unknown>(`${api}/events?instanceStart_from=${today}`);
  if (!Array.isArray(payload)) throw new Error("Invalid The Place booking programme");
  const events = payload.filter(isRecord).filter(event =>
    typeof event.id === "string" && typeof event.name === "string" &&
    (event.attribute_WebsiteListing === "Class" || event.attribute_SupercoolWebsiteListing === "Class") &&
    /Adult|Pro Class/i.test(String(event.attribute_Type)) &&
    !/\b(?:children|kids?|youth|teen|ages?\s*\d)\b/i.test(event.name)
  );
  const classes: ScrapedClass[] = [];
  await runPool(events, 4, async event => {
    const instances = await fetchJson<unknown>(`${api}/events/${encodeURIComponent(String(event.id))}/instances?start_from=${today}`);
    if (!Array.isArray(instances)) throw new Error("Invalid The Place booking sessions");
    for (const instance of instances) {
      if (!isRecord(instance) || instance.cancelled || instance.isOnSale !== true ||
        typeof instance.id !== "string" || typeof instance.start !== "string" || typeof instance.startUtc !== "string") continue;
      const startDate = instance.start.slice(0, 10);
      const start = new Date(instance.startUtc);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate < today || Number.isNaN(start.getTime())) continue;
      const title = String(event.name).replace(/^\s*C&C\s+(?:\d{4}[-/]\d{2}\s+)?/i, "").trim();
      const duration = typeof event.duration === "number" && event.duration > 0 ? event.duration : null;
      const end = duration ? new Date(start.getTime() + duration * 60_000) : null;
      classes.push({
        venue: "The Place", title,
        details: typeof event.description === "string" ? event.description.replace(/\s+/g, " ").trim() || null : null,
        dayOfWeek: new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" }).format(start),
        time: end ? `${londonTime(start)} - ${londonTime(end)}` : londonTime(start),
        startDate, endDate: startDate,
        isCourse: /enrolment|instalment/i.test(title),
        bookingUrl: `https://system.spektrix.com/theplace/website/ChooseSeats.aspx?EventInstanceId=${encodeURIComponent(instance.id)}`,
        sourceUrl
      });
    }
  });
  if (classes.length === 0) throw new Error("No bookable adult sessions found in The Place booking programme");
  return classes.sort((a, b) => `${a.startDate}|${a.time}|${a.title}`.localeCompare(`${b.startDate}|${b.time}|${b.title}`));
}
