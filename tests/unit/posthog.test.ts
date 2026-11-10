import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import React from "react";
import posthog from "posthog-js";
import { track } from "@vercel/analytics";
import { TrackedOutboundLink } from "@/components/tracked-outbound-link";

vi.mock("posthog-js", () => ({ default: { init: vi.fn(), capture: vi.fn() } }));
vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PostHog integration", () => {
  it("initializes with history-based page views and session recording disabled", async () => {
    await import("../../instrumentation-client");
    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({
      api_host: "https://eu.i.posthog.com",
      capture_pageview: "history_change",
      disable_session_recording: true
    }));
  });

  it.each(["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "NEXT_PUBLIC_POSTHOG_HOST"])(
    "does not initialize when %s is empty", async (envName) => {
      vi.stubEnv(envName, "");
      await import("../../instrumentation-client");
      expect(posthog.init).not.toHaveBeenCalled();
    }
  );

  it.each([true, false])("preserves outbound behavior when PostHog is enabled: %s", (enabled) => {
    if (!enabled) vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    render(React.createElement(TrackedOutboundLink, {
      href: "https://example.com/book",
      analyticsKind: "booking",
      destHost: "example.com",
      onClick
    }, "Book class"));

    fireEvent.click(screen.getByRole("link", { name: "Book class" }));
    const properties = { kind: "booking", dest_host: "example.com" };
    expect(track).toHaveBeenCalledWith("outbound_click", properties);
    expect(onClick).toHaveBeenCalledOnce();
    if (enabled) {
      expect(posthog.capture).toHaveBeenCalledWith("outbound_click", { app: "london_dance_calendar", ...properties });
    } else {
      expect(posthog.capture).not.toHaveBeenCalled();
    }
  });

  it("keeps link actions working if the analytics SDK fails", () => {
    vi.mocked(posthog.capture).mockImplementationOnce(() => { throw new Error("SDK failed"); });
    const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    render(React.createElement(TrackedOutboundLink, {
      href: "https://example.com/book", analyticsKind: "booking", destHost: "example.com", onClick
    }, "Book class"));
    fireEvent.click(screen.getByRole("link", { name: "Book class" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
