import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_SECRET_LEN = 16;
const DEV_FALLBACK_SECRET = "dev-outbound-redirect-not-for-prod";

export type OutboundRedirectKind = "booking" | "source" | "venue";

type TokenPayload = {
  u: string;
  k: OutboundRedirectKind;
  exp: number;
};

function getSecret(): string | null {
  const fromEnv = process.env.OUTBOUND_REDIRECT_SECRET?.trim();
  if (fromEnv && fromEnv.length >= MIN_SECRET_LEN) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return DEV_FALLBACK_SECRET;
}

function isAllowedTargetUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "[::1]") {
    return false;
  }
  return true;
}

/** Returns a relative `/api/go?...` URL, or null if signing is disabled or the URL cannot be wrapped. */
export function signOutboundRedirectUrl(url: string, kind: OutboundRedirectKind): string | null {
  const secret = getSecret();
  if (!secret || !isAllowedTargetUrl(url)) {
    return null;
  }
  const payload: TokenPayload = {
    u: url,
    k: kind,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const token = `${payloadB64}.${sig}`;
  return `/api/go?t=${encodeURIComponent(token)}`;
}

export function verifyOutboundRedirectToken(token: string): { url: string; kind: OutboundRedirectKind } | null {
  const secret = getSecret();
  if (!secret) {
    return null;
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) {
    return null;
  }
  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const rec = parsed as Record<string, unknown>;
  const u = rec.u;
  const k = rec.k;
  const exp = rec.exp;
  if (typeof u !== "string" || typeof exp !== "number") {
    return null;
  }
  if (Date.now() > exp) {
    return null;
  }
  const kind = k === "booking" || k === "source" || k === "venue" ? k : null;
  if (!kind) {
    return null;
  }
  if (!isAllowedTargetUrl(u)) {
    return null;
  }
  return { url: u, kind };
}
