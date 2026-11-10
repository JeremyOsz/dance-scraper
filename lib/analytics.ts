import posthog from "posthog-js";
import { inferDanceStyles } from "@/lib/dance-types";
import type { DanceSession } from "@/lib/types";

type AppEvent =
  | "calendar_filters_changed"
  | "calendar_view_changed"
  | "calendar_date_changed"
  | "calendar_shared"
  | "class_details_opened"
  | "class_saved"
  | "class_unsaved"
  | "class_shared"
  | "calendar_export_clicked"
  | "outbound_click"
  | "app_error";

export type AnalyticsProperties = Record<string, string | number | boolean | string[]>;

export function captureAppEvent(event: AppEvent, properties: AnalyticsProperties) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;
  try {
    posthog.capture(event, { app: "london_dance_calendar", ...properties });
  } catch {
    // Analytics must not interrupt navigation or class actions.
  }
}

export function classAnalyticsProperties(session: DanceSession): AnalyticsProperties {
  return {
    class_id: session.id,
    class_title: session.title,
    organizer: session.organizer?.trim() || session.venue,
    styles: inferDanceStyles(session),
    is_course: session.isCourse,
    is_workshop: session.isWorkshop
  };
}
