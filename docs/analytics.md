# London Dance Calendar analytics

PostHog measures the journey from finding a class to opening its booking page.
Booking happens on organisers' websites, so a booking click measures intent,
not a completed booking.

## Events

| Event | When it fires | Useful properties |
| --- | --- | --- |
| `calendar_filters_changed` | After 600 ms without another filter change, only following user input | `changed_filters`, selected styles/organisers/locations/levels/times/days, `has_search`, `search_length`, `active_filter_count`, `matching_class_count`, `no_results`, `view` |
| `calendar_view_changed` | User changes day, week or month view | `view`, `previous_view` |
| `calendar_date_changed` | User changes period, returns to today or selects a day | `action`, `view`, `date` when a specific day is selected |
| `class_details_opened` | User opens a class detail sheet | Class properties, `class_date`, `view`, `active_filter_count` |
| `class_saved` / `class_unsaved` | User adds/removes a shortlist entry | Class properties, `shortlist_count`, `view` |
| `class_shared` | Native share or clipboard operation succeeds | Class properties, `class_date`, `method` |
| `calendar_shared` | Calendar share or clipboard operation succeeds | `view`, `method` |
| `calendar_export_clicked` | User clicks Add to calendar | Class properties, `class_date` |
| `outbound_click` | User clicks a booking, source or venue link | `kind`, `dest_host`; class properties and date on calendar detail links |
| `app_error` | Loading listings or sharing fails | `area`, fixed `reason` |
| `contact_sent` / `contact_failed` | Server confirms or rejects feedback email delivery | Anonymous browser/session IDs, site host; no form contents |

Class properties are `class_id`, `class_title`, `organizer`, `styles`, `is_course`
and `is_workshop`. Deliberate events include `app=london_dance_calendar`.
There is no login; PostHog retains its automatically generated anonymous identity.

`matching_class_count` counts distinct listing rows matching the filters across
the loaded dataset, not dated occurrences visible in the current week.
`no_results` is true when this count is zero. Filters restored from a shared URL
and shortlist entries restored from storage do not fire interaction events.
The custom filter event omits search text. Automatic page views can still include
the calendar's shareable URL query parameters. Contact events never include names,
email addresses or message text. Cancelled shares do not count as successful shares.

## Dashboard

[London Dance Calendar Analytics](https://eu.posthog.com/project/173559/dashboard/1101152)
is scoped to `londondancecalendar.com` and `www.londondancecalendar.com` and excludes
internal/test users. Local verification traffic is intentionally excluded.

The dashboard uses native PostHog event queries over the last 30 days. These are
dashboard definitions, not approved Data Catalog metrics. The booking funnel
counts people who visit, open class details, then click a booking link in that
order within one hour. It does not require that the viewed and booked class match.

## Configuration and verification

Set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` locally and
in Vercel before building. Both client and server SDKs use these values. Browser
requests to the app carry `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID` through
PostHog's same-host tracing headers. Feedback outcomes flush inside Next.js
`after()` so analytics does not delay the response and Vercel can finish delivery.
Missing configuration or missing browser identity skips server analytics.

For a delivery check, open the calendar, change a filter, open a class, save it,
share it, and click Book now. Check PostHog's live events for the named events and
class properties. Tests mock email delivery; do not send real feedback as a test.
