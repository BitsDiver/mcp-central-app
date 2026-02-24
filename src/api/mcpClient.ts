/**
 * mcpClient — Lightweight MCP Streamable HTTP client for the chat UI.
 *
 * Maintains a single long-lived session per tenant. On a 404 (server restart)
 * it transparently re-initialises the session and retries once.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const MCP_URL = `${BASE_URL}/mcp`;

interface McpSession {
  sessionId: string;
  key: string;
}

let _session: McpSession | null = null;

// ── Internal helpers ───────────────────────────────────────────────────────

function buildHeaders(key: string, sessionId?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${key}`,
  };
  if (sessionId) h["Mcp-Session-Id"] = sessionId;
  return h;
}

async function parseResponse(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("text/event-stream")) {
    // Collect SSE stream — the last `data:` line carries the final result
    const text = await res.text();
    const lines = text
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => l.slice(6).trim())
      .filter(Boolean);
    const last = lines[lines.length - 1];
    return last ? JSON.parse(last) : null;
  }

  return res.json();
}

async function postMcp(
  body: unknown,
  key: string,
  sessionId?: string,
): Promise<{ status: number; data: unknown; sessionHeader: string | null }> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: buildHeaders(key, sessionId),
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    data:
      res.ok || res.status === 404
        ? await parseResponse(res)
        : await res.text(),
    sessionHeader: res.headers.get("mcp-session-id"),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Initialise a new MCP session with the given API key.
 * Stores the session ID in memory for subsequent calls.
 */
export async function initMcpSession(key: string): Promise<void> {
  const { status, data, sessionHeader } = await postMcp(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "mcp-central-chat", version: "1.0" },
      },
    },
    key,
  );

  if (status !== 200) {
    throw new Error(`MCP init failed (${status}): ${JSON.stringify(data)}`);
  }
  if (!sessionHeader) {
    throw new Error("MCP server did not return a Mcp-Session-Id header");
  }

  _session = { sessionId: sessionHeader, key };
}

/** Discard the current session (called on tenant switch or logout). */
export function resetMcpSession(): void {
  _session = null;
}

/** Whether a session is currently initialised. */
export function hasMcpSession(): boolean {
  return _session !== null;
}

/**
 * Call a tool by its namespaced name (e.g. `myserver__create_issue`).
 * Transparently re-initialises the session once on 404 (server restart).
 */
export async function callMcpTool(
  namespacedToolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  if (!_session) throw new Error("MCP session not initialised");

  const doCall = async (session: McpSession): Promise<unknown> => {
    const { status, data } = await postMcp(
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: namespacedToolName, arguments: args },
      },
      session.key,
      session.sessionId,
    );

    if (status === 404) {
      // Server was restarted — session is gone
      const err = new Error("MCP session expired") as Error & {
        code: string;
      };
      err.code = "SESSION_EXPIRED";
      throw err;
    }

    const rpc = data as {
      result?: unknown;
      error?: { message: string; code?: number };
    };
    if (rpc?.error) throw new Error(rpc.error.message);
    return rpc?.result ?? data;
  };

  try {
    return await doCall(_session);
  } catch (err: unknown) {
    if ((err as any)?.code === "SESSION_EXPIRED") {
      // Re-init with the same key, then retry once
      await initMcpSession(_session.key);
      return doCall(_session!);
    }
    throw err;
  }
}
