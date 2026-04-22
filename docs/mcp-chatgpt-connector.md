# London Dance Calendar MCP connector

London Dance Calendar exposes a public MCP endpoint at `/mcp` for ChatGPT and other MCP clients.

## Tools

- `search_dance_classes` finds classes by date range, style, level, venue, day, and free text.
- `plan_dance_schedule` ranks relevant classes from user preferences and availability described in the chat.
- `generate_schedule_ics` returns a multi-event ICS calendar for selected session IDs.

The connector does not store personal preferences, calendars, tokens, or account data. Personal constraints are prompt-only in v1.

## Local development

```bash
npm install
npm run scrape
npm run dev
```

The MCP endpoint is available at:

```text
http://localhost:3000/mcp
```

MCP Apps-capable hosts can also read the schedule preview resource:

```text
ui://london-dance-calendar/schedule.html
```

## ChatGPT setup

ChatGPT requires a public HTTPS MCP URL. For local testing, expose the dev server with a tunnel such as ngrok or Cloudflare Tunnel, then use the HTTPS `/mcp` URL.

In ChatGPT:

1. Enable developer mode in Settings -> Apps & Connectors -> Advanced settings.
2. Go to Settings -> Connectors -> Create.
3. Use `London Dance Calendar` as the connector name.
4. Use a description such as: `Find London dance and movement classes, plan a schedule from user preferences, and generate an ICS calendar.`
5. Set the connector URL to the public `/mcp` endpoint.

Example prompt:

```text
Find me two beginner contemporary or improv classes after work next week, avoid Tuesday 6-9pm, and generate an ICS calendar.
```
