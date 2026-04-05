import { NextResponse } from "next/server";
import { verifyOutboundRedirectToken } from "@/lib/outbound-redirect";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const verified = verifyOutboundRedirectToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  let host: string;
  try {
    host = new URL(verified.url).hostname;
  } catch {
    host = "invalid";
  }

  console.log(
    JSON.stringify({
      type: "outbound_redirect",
      kind: verified.kind,
      host,
      ts: new Date().toISOString()
    })
  );

  return NextResponse.redirect(verified.url, 302);
}
