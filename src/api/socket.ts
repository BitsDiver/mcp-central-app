import { io, Socket } from "socket.io-client";
import type { SocketResponse } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/** Active sockets indexed by namespace name */
const sockets: Partial<Record<string, Socket>> = {};

let i18nSocket: Socket | null = null;
let usersSocket: Socket | null = null;

// ── Socket readiness gate ──────────────────────────────────────────────────
// emit() queues calls made before the socket is ready (e.g. on page reload).
// App.vue calls markSocketReady() once init is fully complete.
let _socketReady = false;
const _readyQueue: Array<() => void> = [];

export function markSocketReady(): void {
  _socketReady = true;
  _readyQueue.splice(0).forEach((resolve) => resolve());
}

export function resetSocketReady(): void {
  _socketReady = false;
}

function waitForSocket(timeoutMs = 15_000): Promise<void> {
  if (_socketReady) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = _readyQueue.indexOf(resolve);
      if (idx !== -1) _readyQueue.splice(idx, 1);
      reject(new Error("Socket initialisation timeout"));
    }, timeoutMs);
    _readyQueue.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

// ── Generic socket factory ──────────────────────────────────────

function makeAuthSocket(namespace: string, token: string): Socket {
  sockets[namespace]?.disconnect();
  const socket = io(`${BASE_URL}/${namespace}`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  sockets[namespace] = socket;
  return socket;
}

/** Connect all domain namespaces at once. */
export function connectAll(token: string): {
  tenants: Socket;
  endpoints: Socket;
  tools: Socket;
  keys: Socket;
  chat: Socket;
  agent: Socket;
} {
  return {
    tenants: makeAuthSocket("tenants", token),
    endpoints: makeAuthSocket("endpoints", token),
    tools: makeAuthSocket("tools", token),
    keys: makeAuthSocket("keys", token),
    chat: makeAuthSocket("chat", token),
    agent: makeAuthSocket("agent", token),
  };
}

export function disconnectAll(): void {
  ["tenants", "endpoints", "tools", "keys", "chat", "agent"].forEach((ns) => {
    sockets[ns]?.disconnect();
    delete sockets[ns];
  });
  resetSocketReady();
}

export function getSocket(namespace: string): Socket | null {
  return sockets[namespace] ?? null;
}

// ── Namespace-specific emit factories ─────────────────────────────

function makeEmit(namespace: string) {
  return function emit<T = unknown>(
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<SocketResponse<T>> {
    return new Promise((resolve, reject) => {
      if (!_socketReady) {
        waitForSocket()
          .then(() =>
            makeEmit(namespace)<T>(event, payload).then(resolve, reject),
          )
          .catch(reject);
        return;
      }
      const socket = sockets[namespace];
      if (!socket?.connected) {
        reject(new Error(`Socket /${namespace} not connected`));
        return;
      }
      socket.emit(event, payload, (response: SocketResponse<T>) => {
        resolve(response);
      });
    });
  };
}

export const emitTenants = makeEmit("tenants");
export const emitEndpoints = makeEmit("endpoints");
export const emitTools = makeEmit("tools");
export const emitKeys = makeEmit("keys");
export const emitChat = makeEmit("chat");
export const emitAgent = makeEmit("agent");

// ── i18n socket (/i18n namespace — public) ───────────────────────────
export function getI18nSocket(): Socket {
  if (!i18nSocket) {
    i18nSocket = io(`${BASE_URL}/i18n`, {
      transports: ["websocket"],
      reconnection: true,
    });
  }
  return i18nSocket;
}

// ── Users socket (/users namespace — admin only) ──────────────────────────

export function connectUsers(token: string): Socket {
  if (usersSocket?.connected) return usersSocket;
  usersSocket?.disconnect();
  usersSocket = io(`${BASE_URL}/users`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  return usersSocket;
}

export function disconnectUsers(): void {
  usersSocket?.disconnect();
  usersSocket = null;
}

export function getUsersSocket(): Socket | null {
  return usersSocket;
}

export function emitUsers<T = unknown>(
  event: string,
  payload: Record<string, unknown> = {},
): Promise<SocketResponse<T>> {
  return new Promise((resolve, reject) => {
    if (!usersSocket?.connected) {
      reject(new Error("Users socket not connected"));
      return;
    }
    usersSocket.emit(event, payload, (response: SocketResponse<T>) => {
      resolve(response);
    });
  });
}
