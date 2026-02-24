import type { ApiError } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let auth0Token: string | null = null;

export function setAuth0Token(token: string | null): void {
  auth0Token = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth0Token) {
    headers["Authorization"] = `Bearer ${auth0Token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw data as ApiError;
  }

  return data as T;
}

export const setupApi = {
  getMe: () => request("/setup/me"),
  getTenants: () => request("/setup/tenants"),
  createTenant: (name: string) =>
    request("/setup/tenants", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};
