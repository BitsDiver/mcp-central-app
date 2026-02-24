import { io, Socket } from "socket.io-client";
import type { SocketResponse } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let dashboardSocket: Socket | null = null;
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

export function connectDashboard(token: string): Socket {
  if (dashboardSocket?.connected) {
    return dashboardSocket;
  }

  dashboardSocket?.disconnect();

  dashboardSocket = io(`${BASE_URL}/dashboard`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return dashboardSocket;
}

export function getDashboardSocket(): Socket | null {
  return dashboardSocket;
}

export function disconnectDashboard(): void {
  dashboardSocket?.disconnect();
  dashboardSocket = null;
  resetSocketReady();
}

export function getI18nSocket(): Socket {
  if (!i18nSocket) {
    i18nSocket = io(`${BASE_URL}/i18n`, {
      transports: ["websocket"],
      reconnection: true,
    });
  }
  return i18nSocket;
}

export function emit<T = unknown>(
  event: string,
  payload: Record<string, unknown> = {},
): Promise<SocketResponse<T>> {
  return new Promise((resolve, reject) => {
    // If socket is not yet ready (e.g. page reload before App.vue finishes init),
    // queue this call until markSocketReady() is called.
    if (!_socketReady) {
      waitForSocket()
        .then(() => emit<T>(event, payload).then(resolve, reject))
        .catch(reject);
      return;
    }
    if (!dashboardSocket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }
    dashboardSocket.emit(event, payload, (response: SocketResponse<T>) => {
      resolve(response);
    });
  });
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
