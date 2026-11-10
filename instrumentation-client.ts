import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && apiHost) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-08-30",
    capture_pageview: "history_change",
    person_profiles: "identified_only",
    disable_session_recording: true,
    tracing_headers: [window.location.hostname]
  });
}
