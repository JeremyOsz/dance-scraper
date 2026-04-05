import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signOutboundRedirectUrl, verifyOutboundRedirectToken } from "../../lib/outbound-redirect";

describe("outbound-redirect", () => {
  beforeEach(() => {
    vi.stubEnv("OUTBOUND_REDIRECT_SECRET", "unit-test-secret-16chars");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a signed https URL", () => {
    const url = "https://example.com/book?x=1";
    const signed = signOutboundRedirectUrl(url, "booking");
    expect(signed).toBeTruthy();
    const params = new URLSearchParams(signed!.split("?")[1] ?? "");
    const token = params.get("t");
    expect(token).toBeTruthy();
    const verified = verifyOutboundRedirectToken(token!);
    expect(verified).toEqual({ url, kind: "booking" });
  });

  it("rejects tampered tokens", () => {
    const signed = signOutboundRedirectUrl("https://example.com/a", "source")!;
    const params = new URLSearchParams(signed.split("?")[1] ?? "");
    const token = params.get("t")!;
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyOutboundRedirectToken(tampered)).toBeNull();
  });

  it("does not sign non-https URLs", () => {
    expect(signOutboundRedirectUrl("http://example.com/", "booking")).toBeNull();
  });

  it("returns null when production has no secret", () => {
    vi.stubEnv("OUTBOUND_REDIRECT_SECRET", "");
    expect(signOutboundRedirectUrl("https://example.com/", "venue")).toBeNull();
    expect(verifyOutboundRedirectToken("x.y")).toBeNull();
  });
});
