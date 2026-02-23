export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
}

export interface Tenant {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ApiKey {
  id: string
  keyPrefix: string
  label: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export interface NewApiKey extends ApiKey {
  key: string
}

export type TransportType = 'streamable-http' | 'stdio'
export type EndpointStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface Endpoint {
  id: string
  tenantId: string
  name: string
  namespace: string
  transport: TransportType
  url: string | null
  command: string | null
  args: string[]
  env: Record<string, string>
  headers: Record<string, string>
  isEnabled: boolean
  toolCount: number
  lastConnectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface UpstreamStatus {
  endpointId: string
  namespace: string
  status: EndpointStatus
  toolCount: number
  lastError: string | null
  lastConnectedAt: string | null
}

export interface ApiError {
  statusCode: number
  error: string
  code?: string
  message: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface SocketResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  code?: string
  message?: string
}

export type ChatRole = 'user' | 'assistant' | 'tool'

export interface ChatAttachment {
  id: string
  name: string
  type: string
  base64: string
  size: number
}

export interface ChatToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: unknown
  error?: string
  status: 'pending' | 'running' | 'success' | 'error'
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  thinking?: string
  toolCalls?: ChatToolCall[]
  attachments?: ChatAttachment[]
  createdAt: string
  isStreaming?: boolean
}

export interface ChatSession {
  id: string
  title: string
  tenantId?: string | null
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
}

export interface ChatSettings {
  ollamaUrl: string
  selectedModel: string
  contextSize: number
  systemPrompt: string
}
