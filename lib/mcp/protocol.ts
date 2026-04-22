import type { DanceSession } from "@/lib/types";
import {
  generateScheduleIcs,
  planDanceSchedule,
  searchDanceClasses,
  type GenerateScheduleIcsInput,
  type PlanDanceScheduleInput,
  type SearchDanceClassesInput
} from "@/lib/mcp/schedule-tools";

const RESOURCE_URI = "ui://london-dance-calendar/schedule.html";
const MCP_PROTOCOL_VERSION = "2025-06-18";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    uri?: string;
  };
};

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string; data?: unknown } };

const textSchema = { type: "string" };
const stringArraySchema = { type: "array", items: textSchema };
const daySchema = {
  type: "string",
  enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
};

export const mcpTools = [
  {
    name: "search_dance_classes",
    title: "Search dance classes",
    description:
      "Use this when a user wants to find London dance and movement classes by date, style, level, venue, day, or search text.",
    inputSchema: {
      type: "object",
      properties: {
        from: { ...textSchema, description: "Inclusive start date in YYYY-MM-DD format. Defaults to today." },
        to: { ...textSchema, description: "Inclusive end date in YYYY-MM-DD format. Defaults to 56 days from today." },
        q: { ...textSchema, description: "Free-text search over class title, details, and tags." },
        type: { ...stringArraySchema, description: "Preferred dance or movement styles." },
        level: { ...stringArraySchema, description: "Preferred class levels, such as beginner, open, or intermediate." },
        venue: { ...stringArraySchema, description: "Venue names to include." },
        day: { type: "array", items: daySchema, description: "Days of the week to include." },
        workshopsOnly: { type: "boolean", description: "Only include workshops." },
        maxResults: { type: "integer", minimum: 1, maximum: 100, description: "Maximum number of classes to return." }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "plan_dance_schedule",
    title: "Plan a dance schedule",
    description:
      "Use this when a user describes preferences and availability, and wants a ranked schedule of relevant London dance classes.",
    inputSchema: {
      type: "object",
      properties: {
        from: { ...textSchema, description: "Inclusive start date in YYYY-MM-DD format. Defaults to today." },
        to: { ...textSchema, description: "Inclusive end date in YYYY-MM-DD format. Defaults to 56 days from today." },
        preferredStyles: { ...stringArraySchema, description: "Dance or movement styles the user prefers." },
        levels: { ...stringArraySchema, description: "Class levels the user prefers." },
        venues: { ...stringArraySchema, description: "Venue names the user prefers." },
        days: { type: "array", items: daySchema, description: "Days the user can attend or prefers." },
        unavailable: {
          type: "array",
          description: "Times the user cannot attend.",
          items: {
            type: "object",
            properties: {
              day: daySchema,
              date: { ...textSchema, description: "Specific unavailable date in YYYY-MM-DD format." },
              startTime: { ...textSchema, description: "Unavailable start time, such as 18:00 or 6pm." },
              endTime: { ...textSchema, description: "Unavailable end time, such as 20:00 or 8pm." }
            },
            required: ["startTime", "endTime"],
            additionalProperties: false
          }
        },
        workshopsOnly: { type: "boolean", description: "Only include workshops." },
        includeWorkshops: { type: "boolean", description: "Prefer workshops when available." },
        maxClasses: { type: "integer", minimum: 1, maximum: 20, description: "Maximum number of classes to recommend." },
        goals: { ...textSchema, description: "Free-text goals or preferences from the user." }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      "openai/outputTemplate": RESOURCE_URI,
      "openai/toolInvocation/invoking": "Planning dance schedule...",
      "openai/toolInvocation/invoked": "Dance schedule ready."
    }
  },
  {
    name: "generate_schedule_ics",
    title: "Generate schedule ICS",
    description:
      "Use this when a user has chosen dance classes and wants a downloadable ICS calendar file for those sessions.",
    inputSchema: {
      type: "object",
      properties: {
        sessionIds: { ...stringArraySchema, description: "Session IDs to include in the calendar." },
        calendarName: { ...textSchema, description: "Optional calendar name for the exported ICS file." }
      },
      required: ["sessionIds"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  }
];

function scheduleResourceHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>London Dance Calendar schedule</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 16px; background: Canvas; color: CanvasText; }
    header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    h1 { font-size: 18px; line-height: 1.2; margin: 0; }
    .count { color: color-mix(in srgb, CanvasText 62%, transparent); font-size: 13px; }
    .grid { display: grid; gap: 10px; }
    .card { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 8px; padding: 12px; background: color-mix(in srgb, Canvas 94%, CanvasText 6%); }
    .title { font-weight: 650; margin-bottom: 4px; }
    .meta { font-size: 13px; color: color-mix(in srgb, CanvasText 68%, transparent); }
    .reasons { margin: 8px 0 0; padding-left: 18px; font-size: 13px; }
    .empty { color: color-mix(in srgb, CanvasText 65%, transparent); font-size: 14px; }
    button { margin-top: 12px; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); border-radius: 6px; padding: 8px 10px; background: Canvas; color: CanvasText; font: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <header>
    <h1>London Dance Calendar</h1>
    <div class="count" id="count"></div>
  </header>
  <main class="grid" id="root"><p class="empty">Waiting for schedule results.</p></main>
  <script>
    const root = document.getElementById("root");
    const count = document.getElementById("count");
    let latest = null;

    function render(result) {
      const data = result && (result.structuredContent || result);
      latest = data;
      const recommendations = data && data.recommendations ? data.recommendations : [];
      count.textContent = recommendations.length ? recommendations.length + " selected" : "";
      if (!recommendations.length) {
        root.innerHTML = '<p class="empty">No schedule recommendations to show yet.</p>';
        return;
      }
      root.innerHTML = recommendations.map((session) => {
        const when = [session.occurrenceDate, session.startTime, session.endTime].filter(Boolean).join(" ");
        const reasons = (session.matchReasons || []).map((reason) => '<li>' + escapeHtml(reason) + '</li>').join("");
        return '<article class="card"><div class="title">' + escapeHtml(session.title) + '</div><div class="meta">' + escapeHtml(session.venue + " · " + when) + '</div><ul class="reasons">' + reasons + '</ul></article>';
      }).join("") + '<button id="copyIds">Copy selected IDs</button>';
      document.getElementById("copyIds").addEventListener("click", () => {
        const ids = (latest.selectedSessionIds || []).join(",");
        navigator.clipboard && navigator.clipboard.writeText(ids);
      });
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }

    window.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.method === "ui/notifications/tool-result" || message.type === "tool-result") {
        render(message.params && message.params.result ? message.params.result : message.result);
      }
    });
  </script>
</body>
</html>`;
}

function textResult(text: string, structuredContent: unknown, meta?: unknown) {
  return {
    structuredContent,
    content: [{ type: "text", text }],
    ...(meta ? { _meta: meta } : {})
  };
}

function callTool(name: string | undefined, args: Record<string, unknown> | undefined, sessions: DanceSession[]) {
  switch (name) {
    case "search_dance_classes": {
      const result = searchDanceClasses(sessions, (args ?? {}) as SearchDanceClassesInput);
      return textResult(`Found ${result.count} London dance classes.`, result);
    }
    case "plan_dance_schedule": {
      const result = planDanceSchedule(sessions, (args ?? {}) as PlanDanceScheduleInput);
      return textResult(`Planned ${result.recommendations.length} recommended classes.`, result, {
        ui: { resourceUri: RESOURCE_URI }
      });
    }
    case "generate_schedule_ics": {
      const result = generateScheduleIcs(sessions, (args ?? {}) as GenerateScheduleIcsInput);
      return textResult(`Generated ${result.filename} with ${result.included.length} classes.`, result);
    }
    default:
      throw new Error(`Unknown tool: ${name ?? "(missing)"}`);
  }
}

function result(id: JsonRpcRequest["id"], value: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result: value };
}

function error(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

export function handleMcpJsonRpc(payload: unknown, sessions: DanceSession[]) {
  if (Array.isArray(payload)) {
    return payload.map((item) => handleSingleRequest(item as JsonRpcRequest, sessions)).filter(Boolean);
  }
  return handleSingleRequest(payload as JsonRpcRequest, sessions);
}

function handleSingleRequest(request: JsonRpcRequest, sessions: DanceSession[]): JsonRpcResponse | null {
  const id = request?.id ?? null;

  try {
    switch (request?.method) {
      case "initialize":
        return result(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false }
          },
          serverInfo: {
            name: "London Dance Calendar",
            version: "1.0.0"
          }
        });
      case "notifications/initialized":
        return null;
      case "tools/list":
        return result(id, { tools: mcpTools });
      case "tools/call":
        return result(id, callTool(request.params?.name, request.params?.arguments, sessions));
      case "resources/list":
        return result(id, {
          resources: [
            {
              uri: RESOURCE_URI,
              name: "Schedule preview",
              title: "Schedule preview",
              description: "Embedded preview for planned London Dance Calendar schedules.",
              mimeType: "text/html"
            }
          ]
        });
      case "resources/read":
        if (request.params?.uri !== RESOURCE_URI) {
          return error(id, -32602, "Unknown resource URI.");
        }
        return result(id, {
          contents: [
            {
              uri: RESOURCE_URI,
              mimeType: "text/html",
              text: scheduleResourceHtml(),
              _meta: {
                ui: {
                  csp: {
                    connectDomains: [],
                    resourceDomains: []
                  }
                }
              }
            }
          ]
        });
      default:
        return error(id, -32601, `Unsupported MCP method: ${request?.method ?? "(missing)"}`);
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Invalid MCP request.";
    return error(id, -32602, message);
  }
}
