import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(), capture: vi.fn(), captureException: vi.fn(), flush: vi.fn(),
  tasks: [] as Array<() => Promise<void>>
}));

vi.mock("resend", () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: mocks.send } })) }));
vi.mock("posthog-node", () => ({ PostHog: vi.fn().mockImplementation(() => ({
  capture: mocks.capture, captureException: mocks.captureException, flush: mocks.flush
})) }));
vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: (task: () => Promise<void>) => mocks.tasks.push(task)
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.tasks.length = 0;
  mocks.send.mockResolvedValue({ data: { id: "email-id" }, error: null });
  mocks.flush.mockResolvedValue(undefined);
  vi.stubEnv("CONTACT_EMAIL", "inbox@example.com");
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("FROM_EMAIL", "sender@example.com");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
});
afterEach(() => vi.unstubAllEnvs());

async function submit(withIdentity = true) {
  const { POST } = await import("../../app/api/contact/route");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (withIdentity) {
    headers.set("X-POSTHOG-DISTINCT-ID", "browser-id");
    headers.set("X-POSTHOG-SESSION-ID", "session-id");
  }
  return POST(new Request("https://londondancecalendar.com/api/contact", {
    method: "POST", headers,
    body: JSON.stringify({ name: "Private name", email: "private@example.com", message: "Private feedback message" })
  }));
}

describe("contact outcome analytics", () => {
  it("records confirmed success after responding, with matching identity and no form contents", async () => {
    expect((await submit()).status).toBe(200);
    expect(mocks.capture).not.toHaveBeenCalled();
    await mocks.tasks[0]();
    expect(mocks.capture).toHaveBeenCalledWith({
      distinctId: "browser-id", event: "contact_sent", properties: expect.objectContaining({
        $session_id: "session-id", $host: "londondancecalendar.com"
      })
    });
    expect(JSON.stringify(mocks.capture.mock.calls)).not.toMatch(/Private|private@example/);
    expect(mocks.flush).toHaveBeenCalledOnce();
  });

  it("records a provider rejection as failure rather than success", async () => {
    mocks.send.mockResolvedValue({ data: null, error: { message: "Rejected" } });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await submit()).status).toBe(502);
      await mocks.tasks[0]();
      expect(mocks.capture).toHaveBeenCalledWith(expect.objectContaining({ event: "contact_failed" }));
      expect(mocks.captureException).toHaveBeenCalledOnce();
    } finally { errorLog.mockRestore(); }
  });

  it("skips analytics when browser identity is unavailable", async () => {
    expect((await submit(false)).status).toBe(200);
    expect(mocks.tasks).toHaveLength(0);
  });

  it("does not turn successful contact delivery into an error if analytics fails", async () => {
    mocks.flush.mockRejectedValue(new Error("Unavailable"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await submit()).status).toBe(200);
      await expect(mocks.tasks[0]()).resolves.toBeUndefined();
    } finally { warning.mockRestore(); }
  });
});
