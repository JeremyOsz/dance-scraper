import { NextResponse } from "next/server";
import { readScrapeOutput } from "@/lib/data-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = readScrapeOutput();
  return NextResponse.json({
    generatedAt: data.generatedAt,
    venues: data.venues
  }, { headers: { "cache-control": "no-store" } });
}
