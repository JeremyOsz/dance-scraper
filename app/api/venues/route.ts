import { NextResponse } from "next/server";
import { readScrapeOutput } from "@/lib/data-store";

export async function GET() {
  const data = readScrapeOutput();
  return NextResponse.json({
    generatedAt: data.generatedAt,
    venues: data.venues
  });
}
