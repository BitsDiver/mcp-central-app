import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { connectDashboard, disconnectDashboard, getDashboardSocket } from '@/api/socket'
import { useToolStore } from './tools'
import { useStatusStore } from './status'
import { useEndpointStore } from './endpoints'
import type { Tool, UpstreamStatus } from '@/types'

export const useSocketStore = defineStore('socket', () => {
  const connected = ref(false)
  const activeTenantId = ref<string | null>(null)

  function connect(token: string): void {
    const socket = connectDashboard(token)
    bindEvents(socket)
  }

  function bindEvents(socket: Socket): void {
    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })

    socket.on('tools_changed', (payload: { tools: Tool[]; count: number }) => {
      const toolStore = useToolStore()
      toolStore.updateFromSocket(payload.tools, payload.count)
    })

    socket.on('connection_status', (payload: Partial<UpstreamStatus> & { endpointId: string }) => {
      const statusStore = useStatusStore()
      statusStore.updateUpstream(payload)
      const endpointStore = useEndpointStore()
      if (payload.endpointId) {
        endpointStore.updateFromSocket(payload.endpointId, {
          toolCount: payload.toolCount ?? 0,
        })
      }
    })
  }

  async function selectTenant(tenantId: string): Promise<void> {
    const socket = getDashboardSocket()
    if (!socket) return

    await new Promise<void>((resolve, reject) => {
      socket.emit('selectTenant', { tenantId }, (res: { status: string }) => {
        if (res.status === 'success') {
          activeTenantId.value = tenantId
          resolve()
        } else {
          reject(new Error('Failed to select tenant'))
        }
      })
    })
  }

  function disconnect(): void {
    disconnectDashboard()
    connected.value = false
    activeTenantId.value = null
  }

  return { connected, activeTenantId, connect, selectTenant, disconnect }
})
