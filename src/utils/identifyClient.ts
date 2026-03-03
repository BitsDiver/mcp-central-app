import { AI_CLIENTS, type AiClient } from "@/data/aiClients";

/**
 * Mapping rules: MCP clientInfo.name (lowercased) → AI_CLIENTS entry id.
 *
 * The keys are substrings matched against the lowercased clientInfo.name.
 * Order matters — first match wins.
 */
const CLIENT_NAME_PATTERNS: [RegExp, string][] = [
  [/\bcline\b/i, "cline"],
  [/\bcursor\b/i, "cursor"],
  [/\bwindsurf\b/i, "windsurf"],
  [/\bzed\b/i, "zed"],
  [/\bantigravity\b/i, "antigravity"],
  [/\bopen\s?webui\b/i, "openwebui"],
  [
    /\bjetbrains\b|intellij|pycharm|webstorm|phpstorm|rider|goland|rubymine|clion|datagrip/i,
    "jetbrains",
  ],
  [/\bvisual\s?studio\s?code\b|\bvscode\b/i, "vscode"],
  [/\bvs\s?code\b/i, "vscode"],
];

/**
 * User-Agent based fallback patterns.
 */
const UA_PATTERNS: [RegExp, string][] = [
  [/Cursor\//i, "cursor"],
  [/Windsurf\//i, "windsurf"],
  [/Zed\//i, "zed"],
  [/JetBrains/i, "jetbrains"],
  [/VSCode|Visual Studio Code/i, "vscode"],
];

export interface IdentifiedClient {
  /** The matched AI_CLIENTS entry, or null if unknown */
  client: AiClient | null;
  /** ID of the matched client (e.g. "vscode", "cursor"), or null */
  clientId: string | null;
  /** Display name — from AI_CLIENTS or from the raw clientInfo.name */
  displayName: string;
  /** Brand color — from AI_CLIENTS or a default gray */
  brandColor: string;
}

/**
 * Identify an AI client from the MCP initialize clientInfo and/or User-Agent header.
 */
export function identifyClient(
  clientName: string | null,
  userAgent: string | null,
): IdentifiedClient {
  // 1. Try matching by MCP clientInfo.name (most reliable)
  if (clientName) {
    for (const [pattern, id] of CLIENT_NAME_PATTERNS) {
      if (pattern.test(clientName)) {
        const client = AI_CLIENTS.find((c) => c.id === id) ?? null;
        if (client) {
          return {
            client,
            clientId: id,
            displayName: client.name,
            brandColor: client.brandColor,
          };
        }
      }
    }
  }

  // 2. Fallback: try User-Agent header
  if (userAgent) {
    for (const [pattern, id] of UA_PATTERNS) {
      if (pattern.test(userAgent)) {
        const client = AI_CLIENTS.find((c) => c.id === id) ?? null;
        if (client) {
          return {
            client,
            clientId: id,
            displayName: client.name,
            brandColor: client.brandColor,
          };
        }
      }
    }
  }

  // 3. Unknown client — use raw name or "Unknown"
  return {
    client: null,
    clientId: null,
    displayName: clientName ?? "AI Client",
    brandColor: "#9ca3af",
  };
}
