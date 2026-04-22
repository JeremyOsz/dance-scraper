import { NextRequest, NextResponse } from "next/server";
import { readScrapeOutput } from "@/lib/data-store";
import { handleMcpJsonRpc, mcpTools } from "@/lib/mcp/protocol";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type, mcp-session-id",
  "access-control-expose-headers": "mcp-session-id"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      name: "London Dance Calendar",
      description: "MCP tools for finding London dance classes, planning a schedule, and generating ICS calendars.",
      tools: mcpTools.map((tool) => ({ name: tool.name, title: tool.title, description: tool.description }))
    },
    { headers: { ...corsHeaders, "cache-control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const data = readScrapeOutput();
  const response = handleMcpJsonRpc(payload, data.sessions);

  if (response === null) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  return NextResponse.json(response, {
    headers: {
      ...corsHeaders,
      "cache-control": "no-store"
    }
  });
}
