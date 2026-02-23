import type { ApiError } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

let auth0Token: string | null = null
let apiKey: string | null = null

export function setAuth0Token(token: string | null): void {
  auth0Token = token
}

export function setApiKey(key: string | null): void {
  apiKey = key
}

export function getApiKey(): string | null {
  return apiKey
}

async function request<T>(
  path: string,
  options: RequestInit & { useApiKey?: boolean } = {}
): Promise<T> {
  const { useApiKey = false, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (useApiKey && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else if (!useApiKey && auth0Token) {
    headers['Authorization'] = `Bearer ${auth0Token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (res.status === 204) {
    return undefined as unknown as T
  }

  const data = await res.json()

  if (!res.ok) {
    throw data as ApiError
  }

  return data as T
}

export const setupApi = {
  getMe: () => request('/setup/me'),
  getTenants: () => request('/setup/tenants'),
  createTenant: (name: string) =>
    request('/setup/tenants', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
}

export const api = {
  getEndpoints: () => request('/api/endpoints', { useApiKey: true }),
  createEndpoint: (data: Record<string, unknown>) =>
    request('/api/endpoints', {
      method: 'POST',
      body: JSON.stringify(data),
      useApiKey: true,
    }),
  deleteEndpoint: (id: string) =>
    request(`/api/endpoints/${id}`, { method: 'DELETE', useApiKey: true }),
  toggleEndpoint: (id: string, isEnabled: boolean) =>
    request(`/api/endpoints/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled }),
      useApiKey: true,
    }),
  getTools: () => request('/api/tools', { useApiKey: true }),
  getStatus: () => request('/api/status', { useApiKey: true }),
  getKeys: () => request('/api/keys', { useApiKey: true }),
  createKey: (label: string) =>
    request('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ label }),
      useApiKey: true,
    }),
  deleteKey: (id: string) =>
    request(`/api/keys/${id}`, { method: 'DELETE', useApiKey: true }),
  getHealth: () => request('/api/health', { useApiKey: true }),
  callTool: (namespace: string, toolName: string, args: Record<string, unknown>) =>
    request(`/api/tools/${namespace}/${toolName}/call`, {
      method: 'POST',
      body: JSON.stringify({ arguments: args }),
      useApiKey: true,
    }),
}
