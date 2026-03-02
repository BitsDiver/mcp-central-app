export type OsKey = "macos" | "windows" | "linux";

export interface GuiStep {
  text: string;
  /** Optional JSON/code block to display below the text */
  code?: string;
  codeLabel?: string;
}

// ── JSON-file client ────────────────────────────────────────────────────────
export interface JsonFileClient {
  id: string;
  name: string;
  tagline: string;
  brandColor: string;
  configType: "json-file";
  /** Path to the config file, per OS */
  configPaths: Record<OsKey, string>;
  /** Whether to show an OS tab picker (false when all paths are identical) */
  showOsPicker: boolean;
  /** Filename used for the "Download" blob */
  exportFilename: string;
  /** NOTE shown below the JSON block (e.g. Windsurf `serverUrl` quirk) */
  configNote?: string;
  /**
   * When true the config is a *snippet* to be merged into an existing file
   * (e.g. Zed's settings.json), not a standalone file to create.
   */
  isSnippet?: boolean;
  generateConfig(apiKey: string, baseUrl: string): string;
}

// ── GUI-only client ─────────────────────────────────────────────────────────
export interface GuiClient {
  id: string;
  name: string;
  tagline: string;
  brandColor: string;
  configType: "gui";
  guiSteps(apiKey: string, baseUrl: string): GuiStep[];
}

export type AiClient = JsonFileClient | GuiClient;

// ── Registry ────────────────────────────────────────────────────────────────
export const AI_CLIENTS: AiClient[] = [
  // ── JSON-file clients (Bearer-token over HTTP) ──────────────────────────
  {
    id: "vscode",
    name: "VS Code",
    tagline: "GitHub Copilot Chat",
    brandColor: "#007ACC",
    configType: "json-file",
    configPaths: {
      macos: ".vscode/mcp.json",
      windows: ".vscode\\mcp.json",
      linux: ".vscode/mcp.json",
    },
    showOsPicker: false,
    exportFilename: "mcp.json",
    generateConfig: (apiKey, baseUrl) =>
      JSON.stringify(
        {
          servers: {
            "MCP Central": {
              type: "http",
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
  },

  {
    id: "cursor",
    name: "Cursor",
    tagline: "AI-first code editor",
    brandColor: "#6366f1",
    configType: "json-file",
    configPaths: {
      macos: "~/.cursor/mcp.json",
      windows: "%USERPROFILE%\\.cursor\\mcp.json",
      linux: "~/.cursor/mcp.json",
    },
    showOsPicker: true,
    exportFilename: "mcp.json",
    generateConfig: (apiKey, baseUrl) =>
      JSON.stringify(
        {
          mcpServers: {
            "MCP Central": {
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
  },

  {
    id: "windsurf",
    name: "Windsurf",
    tagline: "Codeium's AI editor",
    brandColor: "#0ea5e9",
    configType: "json-file",
    configPaths: {
      macos: "~/.codeium/windsurf/mcp_config.json",
      windows: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
      linux: "~/.codeium/windsurf/mcp_config.json",
    },
    showOsPicker: true,
    exportFilename: "mcp_config.json",
    configNote:
      "Windsurf uses `serverUrl` instead of `url` — this is intentional and specific to Windsurf.",
    generateConfig: (apiKey, baseUrl) =>
      JSON.stringify(
        {
          mcpServers: {
            "MCP Central": {
              serverUrl: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
  },

  {
    id: "zed",
    name: "Zed",
    tagline: "High-performance editor",
    brandColor: "#084CCF",
    configType: "json-file",
    configPaths: {
      macos: "~/Library/Application Support/Zed/settings.json",
      windows: "%APPDATA%\\Zed\\settings.json",
      linux: "~/.config/zed/settings.json",
    },
    showOsPicker: true,
    exportFilename: "zed-mcp-snippet.json",
    isSnippet: true,
    configNote:
      "Merge this snippet into your existing `settings.json` — do not replace the entire file.",
    generateConfig: (apiKey, baseUrl) =>
      JSON.stringify(
        {
          context_servers: {
            "MCP Central": {
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
  },

  // ── GUI clients (instructions-only, no file download) ──────────────────
  {
    id: "cline",
    name: "Cline",
    tagline: "Autonomous VS Code agent",
    brandColor: "#e97627",
    configType: "gui",
    guiSteps: (apiKey, baseUrl) => [
      {
        text: "Open VS Code and click the <strong>Cline</strong> icon in the Activity Bar.",
      },
      {
        text: "Click the <strong>MCP Servers</strong> tab (plug icon) in the Cline panel, then click <strong>Configure MCP Servers</strong>.",
      },
      {
        text: 'Add the following entry inside the <code>"mcpServers"</code> object and save the file:',
        code: JSON.stringify(
          {
            "MCP Central": {
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
              disabled: false,
            },
          },
          null,
          2,
        ),
        codeLabel: "cline_mcp_settings.json",
      },
      { text: "Cline will connect automatically once the file is saved." },
    ],
  },

  {
    id: "jetbrains",
    name: "JetBrains",
    tagline: "IntelliJ, PyCharm, WebStorm…",
    brandColor: "#fe315d",
    configType: "gui",
    guiSteps: (apiKey, baseUrl) => [
      {
        text: "Open <strong>Settings</strong> (<kbd>⌘,</kbd> / <kbd>Ctrl+Alt+S</kbd>) → <strong>Tools</strong> → <strong>AI Assistant</strong> → <strong>Model Context Protocol (MCP)</strong>.",
      },
      {
        text: "Click <strong>+</strong> and choose the <strong>HTTP</strong> connection type.",
      },
      {
        text: `Set the server URL to: <code>${baseUrl}/mcp</code>`,
      },
      {
        text: `Add a request header — Key: <code>Authorization</code>&nbsp;&nbsp;Value: <code>Bearer ${apiKey}</code>`,
      },
      {
        text: "Click <strong>OK</strong>. The MCP tools will be available in AI Assistant chat.",
      },
    ],
  },

  {
    id: "openwebui",
    name: "Open WebUI",
    tagline: "Self-hosted AI web interface",
    brandColor: "#339af0",
    configType: "gui",
    guiSteps: (apiKey, baseUrl) => [
      {
        text: "Go to <strong>Settings</strong> → <strong>Tools</strong> (or <strong>Workspace → Tools</strong> as an admin).",
      },
      {
        text: "Click the <strong>+</strong> button and select connection type <strong>MCP</strong> with transport <strong>Streamable HTTP</strong>.",
      },
      { text: `Enter the server URL: <code>${baseUrl}/mcp</code>` },
      {
        text: `Set the Authorization header to: <code>Bearer ${apiKey}</code>`,
      },
      {
        text: "Click <strong>Save</strong>. The MCP tools become available in your chat sessions.",
      },
    ],
  },

  {
    id: "antigravity",
    name: "Antigravity",
    tagline: "Google's AI code editor",
    brandColor: "#4285F4",
    configType: "gui",
    guiSteps: (apiKey, baseUrl) => [
      {
        text: "Open the <strong>Agent</strong> side panel, then click the <strong>···</strong> dropdown menu at the top.",
      },
      {
        text: "Select <strong>Manage MCP Servers</strong>, then click <strong>View raw config</strong>.",
      },
      {
        text: 'Add the following entry inside the <code>"mcpServers"</code> object in <code>mcp_config.json</code>:',
        code: JSON.stringify(
          {
            "MCP Central": {
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
          null,
          2,
        ),
        codeLabel: "mcp_config.json",
      },
      { text: "Save the config — Antigravity will reconnect automatically." },
    ],
  },
];
