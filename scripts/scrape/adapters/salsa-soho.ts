import type { AdapterOutput } from "../types";
const sourceUrl = "https://www.barsalsa.com/soho/";

export async function scrapeSalsaSoho(): Promise<AdapterOutput> {
  return {
    venueKey: "salsaSoho",
    venue: "Salsa! Soho",
    sourceUrl,
    classes: [],
    ok: true,
    error: null
  };
}
