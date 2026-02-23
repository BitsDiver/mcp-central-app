import { io, Socket } from 'socket.io-client'
import type { SocketResponse } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

let dashboardSocket: Socket | null = null
let i18nSocket: Socket | null = null

export function connectDashboard(token: string): Socket {
  if (dashboardSocket?.connected) {
    return dashboardSocket
  }

  dashboardSocket?.disconnect()

  dashboardSocket = io(`${BASE_URL}/dashboard`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  return dashboardSocket
}

export function getDashboardSocket(): Socket | null {
  return dashboardSocket
}

export function disconnectDashboard(): void {
  dashboardSocket?.disconnect()
  dashboardSocket = null
}

export function getI18nSocket(): Socket {
  if (!i18nSocket) {
    i18nSocket = io(`${BASE_URL}/i18n`, {
      transports: ['websocket'],
      reconnection: true,
    })
  }
  return i18nSocket
}

export function emit<T = unknown>(
  event: string,
  payload: Record<string, unknown> = {}
): Promise<SocketResponse<T>> {
  return new Promise((resolve, reject) => {
    if (!dashboardSocket) {
      reject(new Error('Socket not connected'))
      return
    }
    dashboardSocket.emit(event, payload, (response: SocketResponse<T>) => {
      resolve(response)
    })
  })
}
