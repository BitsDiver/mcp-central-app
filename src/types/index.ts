export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface NewApiKey extends ApiKey {
  key: string;
}

export type TransportType = "streamable-http" | "stdio";
export type EndpointStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface Endpoint {
  id: string;
  tenantId: string;
  name: string;
  namespace: string;
  transport: TransportType;
  url: string | null;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  headers: Record<string, string>;
  isEnabled: boolean;
  toolCount: number;
  /** Live connection status pushed by connection_status socket event */
  connectionStatus?: EndpointStatus;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  name: string;
  /** Original tool name before namespacing (e.g. "create_issue") */
  originalName?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** ID of the upstream MCP endpoint that provides this tool */
  endpointId?: string;
}

export interface UpstreamStatus {
  endpointId: string;
  namespace: string;
  status: EndpointStatus;
  toolCount: number;
  lastError: string | null;
  lastConnectedAt: string | null;
}

export interface ApiError {
  statusCode: number;
  error: string;
  code?: string;
  message: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export interface SocketResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  code?: string;
  message?: string;
}

export type ChatRole = "user" | "assistant" | "tool";

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  base64: string;
  size: number;
}

export interface ChatToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "pending" | "running" | "success" | "error";
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  thinking?: string;
  toolCalls?: ChatToolCall[];
  attachments?: ChatAttachment[];
  createdAt: string;
  isStreaming?: boolean;
  /** Set when generation ended with an error — kept in history for traceability. */
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  tenantId?: string | null;
  /** Overrides the global system prompt from settings for this session only */
  systemPrompt?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface ChatSettings {
  // ── Ollama (direct browser call) ─────────────────────────────
  ollamaUrl: string;
  /** Optional Bearer token for Ollama instances exposed with authentication */
  ollamaApiKey?: string;
  selectedModel: string;
  contextSize: number;
  systemPrompt: string;
  // ── Multi-provider ────────────────────────────────────────────
  /** Active provider. "ollama" uses direct browser connection; others go via backend. */
  provider: LLMProvider;
  /** Persisted configuration per provider (model, context size, system prompt). */
  perProviderSettings?: Partial<Record<LLMProvider, ProviderConfig>>;
}

/** Per-provider persisted configuration. */
export interface ProviderConfig {
  selectedModel: string;
  contextSize: number;
  systemPrompt: string;
}

/** LLM backend provider identifier */
export type LLMProvider = "ollama" | "openai" | "anthropic" | "gemini";

/** Info about a stored provider key (never contains the actual key) */
export interface ProviderKeyInfo {
  provider: LLMProvider;
  /** Last 4 characters of the original API key */
  keyHint: string;
  createdAt: string;
  updatedAt: string;
}
