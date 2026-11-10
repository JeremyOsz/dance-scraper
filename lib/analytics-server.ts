import { after } from "next/server";
import { PostHog } from "posthog-node";

let client: PostHog | undefined;

export function captureContactOutcome(request: Request, event: "contact_sent" | "contact_failed") {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const distinctId = request.headers.get("x-posthog-distinct-id");
  const sessionId = request.headers.get("x-posthog-session-id");
  if (!token || !host || !distinctId || distinctId.length > 200) return;

  const url = new URL(request.url);
  const properties = {
    app: "london_dance_calendar",
    $host: url.host,
    $pathname: "/contact",
    $process_person_profile: false,
    ...(sessionId && sessionId.length <= 200 ? { $session_id: sessionId } : {})
  };

  after(async () => {
    try {
      client ??= new PostHog(token, { host, flushInterval: 0, requestTimeout: 3000, fetchRetryCount: 0 });
      client.capture({ distinctId, event, properties });
      if (event === "contact_failed") {
        client.captureException(new Error("Contact email delivery failed"), distinctId, properties);
      }
      await client.flush();
    } catch {
      console.warn("PostHog contact outcome delivery failed");
    }
  });
}
