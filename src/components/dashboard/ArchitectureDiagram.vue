<script setup lang="ts">
import { computed } from 'vue'
import { useStatusStore } from '@/stores/status'

const statusStore = useStatusStore()

const upstreams = computed(() => {
  if (statusStore.upstreams.length === 0) {
    return [
      { endpointId: 'placeholder-1', namespace: 'github', status: 'connected', toolCount: 0, lastError: null, lastConnectedAt: null },
      { endpointId: 'placeholder-2', namespace: 'postgres', status: 'connected', toolCount: 0, lastError: null, lastConnectedAt: null },
      { endpointId: 'placeholder-3', namespace: 'memory', status: 'disconnected', toolCount: 0, lastError: null, lastConnectedAt: null },
    ]
  }
  return statusStore.upstreams.slice(0, 8)
})

const statusColor = (status: string) => {
  if (status === 'connected') return '#22c55e'
  if (status === 'connecting') return '#f59e0b'
  if (status === 'error') return '#ef4444'
  return '#9ca3af'
}

const statusLabel = (status: string) => {
  if (status === 'connected') return 'Connected'
  if (status === 'connecting') return 'Connecting'
  if (status === 'error') return 'Error'
  return 'Disconnected'
}
</script>

<template>
  <div class="card p-5 overflow-hidden">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Architecture Overview</h2>
        <p class="text-xs mt-0.5" style="color: var(--text-secondary);">How central-MCP connects your AI agents to MCP servers</p>
      </div>
    </div>

    <div class="help-hints mb-4">
      <div class="hint-item group">
        <div class="hint-trigger">
          <div class="hint-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span class="hint-title">What is a tenant?</span>
        </div>
        <div class="hint-popover">
          <p>A tenant is an isolated workspace. Each tenant has its own <strong>API key</strong> and its own set of upstream MCP servers. Use different tenants to separate environments (dev, prod) or organizations.</p>
        </div>
      </div>

      <div class="hint-item group">
        <div class="hint-trigger">
          <div class="hint-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span class="hint-title">How to connect your AI client</span>
        </div>
        <div class="hint-popover">
          <p>Your AI agent (VS Code, Claude Desktop…) authenticates with the <strong>tenant API key</strong> via <code>Authorization: Bearer mcp_xxx</code>. Create and manage keys in the <router-link to="/keys" class="text-blue-500 hover:underline">API Keys</router-link> page.</p>
        </div>
      </div>
    </div>

    <div class="relative flex items-center gap-0 overflow-x-auto pb-2">
      <div class="flex flex-col items-center shrink-0 w-28">
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center border-2 mb-2"
          style="background: var(--bg-muted); border-color: var(--border-strong);"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-secondary);">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <span class="text-xs font-semibold text-center" style="color: var(--text-primary);">Your machine</span>
        <span class="text-[10px] mt-0.5 text-center" style="color: var(--text-tertiary);">AI Client / IDE</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1 px-2 min-w-[80px]">
        <div class="w-full flex items-center gap-1">
          <div class="flex-1 h-px" style="background: var(--border-strong);"></div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="color: var(--text-tertiary);">
            <path d="M6 1l4 4H7v6H5V5H2z"/>
          </svg>
        </div>
        <span class="text-[9px] mt-1 text-center" style="color: var(--text-tertiary);">Tenant API Key</span>
      </div>

      <div class="flex flex-col items-center shrink-0 w-32">
        <div
          class="w-16 h-16 rounded-xl flex items-center justify-center border-2 mb-2 relative"
          style="background: rgba(59,130,246,0.1); border-color: #3b82f6;"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.75">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3">
              <path d="M20 7l-11 11-4-4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <span class="text-xs font-semibold text-center text-blue-500">central-MCP</span>
        <span class="text-[10px] mt-0.5 text-center" style="color: var(--text-tertiary);">Proxy & Auth</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1 px-2 min-w-[80px]">
        <div class="w-full flex items-center gap-1">
          <div class="flex-1 h-px" style="background: var(--border-strong);"></div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style="color: var(--text-tertiary);">
            <path d="M6 1l4 4H7v6H5V5H2z"/>
          </svg>
        </div>
        <span class="text-[9px] mt-1 text-center" style="color: var(--text-tertiary);">Per-server auth</span>
      </div>

      <div class="flex flex-col gap-2 shrink-0">
        <div
          v-for="upstream in upstreams"
          :key="upstream.endpointId"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style="background: var(--bg-muted); border-color: var(--border-default);"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="`background: ${statusColor(upstream.status)}`"
          ></span>
          <span class="text-xs font-medium" style="color: var(--text-primary);">
            {{ upstream.namespace }}
          </span>
          <span class="text-[10px]" style="color: var(--text-tertiary);">{{ statusLabel(upstream.status) }}</span>
        </div>
        <div
          v-if="statusStore.upstreams.length === 0"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed"
          style="border-color: var(--border-default);"
        >
          <span class="text-xs" style="color: var(--text-tertiary);">No servers yet —</span>
          <router-link to="/endpoints" class="text-xs text-blue-500 hover:underline">add one</router-link>
        </div>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs" style="border-color: var(--border-default);">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
        <span style="color: var(--text-secondary);">Connected</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <span style="color: var(--text-secondary);">Connecting</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
        <span style="color: var(--text-secondary);">Error</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
        <span style="color: var(--text-secondary);">Disconnected</span>
      </div>
      <div class="ml-auto text-[11px]" style="color: var(--text-tertiary);">
        AI client authenticates with the tenant API key. Each upstream server uses its own credentials (headers or env vars).
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-hints {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hint-item {
  position: relative;
  display: inline-block;
}

.hint-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 6px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.06);
  cursor: default;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  user-select: none;
}

.hint-item:hover .hint-trigger {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.4);
}

.hint-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hint-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary-600);
  white-space: nowrap;
}

[data-theme="dark"] .hint-title {
  color: var(--color-primary-400);
}

.hint-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  width: 280px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--bg-overlay);
  box-shadow: var(--shadow-dropdown);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  animation: fadeIn 0.12s ease-out;
}

.hint-popover p {
  margin: 0;
}

.hint-popover code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-muted);
  border: 1px solid var(--border-default);
  border-radius: 3px;
  padding: 1px 4px;
  color: var(--text-primary);
}

.hint-item:hover .hint-popover {
  display: block;
}
</style>
