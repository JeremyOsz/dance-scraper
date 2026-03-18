import { NextResponse } from "next/server";
import { Resend } from "resend";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

export async function POST(request: Request) {
  if (!CONTACT_EMAIL || !RESEND_API_KEY || !FROM_EMAIL) {
    return NextResponse.json({ error: "Contact not configured" }, { status: 500 });
  }

  let body: { name?: string; email?: string; message?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, message, website } = body;

  // Simple honeypot: real users should not fill this
  if (website && website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return NextResponse.json({ error: "Message too short" }, { status: 400 });
  }

  const safeName = typeof name === "string" ? name.trim().slice(0, 200) : "";
  const safeEmail = typeof email === "string" ? email.trim().slice(0, 200) : "";
  const safeMessage = message.trim().slice(0, 4000);

  const textLines = [
    "New message from London Dance Calendar",
    "",
    safeName ? `Name: ${safeName}` : "Name: (not provided)",
    safeEmail ? `Email: ${safeEmail}` : "Email: (not provided)",
    "",
    "Message:",
    safeMessage
  ];

  const resend = new Resend(RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      subject: "New message from London Dance Calendar",
      text: textLines.join("\n")
    });
  } catch (error) {
    console.error("Failed to send contact email", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

