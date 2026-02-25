<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useStatusStore } from '@/stores/status';
  import { useToolStore } from '@/stores/tools';

  const statusStore = useStatusStore();
  const toolStore = useToolStore();

  /** All upstreams — no artificial cap, container scrolls instead */
  const upstreams = computed(() => {
    if (statusStore.upstreams.length === 0) {
      return [
        { endpointId: 'placeholder-1', namespace: 'github', status: 'connected', toolCount: 0, lastError: null, lastConnectedAt: null },
        { endpointId: 'placeholder-2', namespace: 'postgres', status: 'connected', toolCount: 0, lastError: null, lastConnectedAt: null },
        { endpointId: 'placeholder-3', namespace: 'memory', status: 'disconnected', toolCount: 0, lastError: null, lastConnectedAt: null },
      ];
    }
    return statusStore.upstreams;
  });

  /** Map endpointId → list of tool originalNames for hover tooltips */
  const toolsByEndpoint = computed(() => {
    const map: Record<string, string[]> = {};
    for (const t of toolStore.tools) {
      const id = t.endpointId;
      if (id) {
        if (!map[id]) map[id] = [];
        map[id].push(t.originalName ?? t.name);
      }
    }
    return map;
  });

  const statusColor = (status: string) => {
    if (status === 'connected') return '#22c55e';
    if (status === 'connecting') return '#f59e0b';
    if (status === 'error') return '#ef4444';
    return '#9ca3af';
  };

  // ── Click-to-open tool panel (Teleported) ──────────────
  type UpstreamRow = (typeof upstreams.value)[number];
  const activeEndpoint = ref<UpstreamRow | null>(null);
  const tooltipPos = ref({ x: 0, y: 0 });
  const TOOLTIP_W = 232;   // 224px width + 8px gap

  function toggleEndpointPanel(e: MouseEvent, upstream: UpstreamRow) {
    // No tools at all → nothing to show
    if (!upstream.toolCount && !toolsByEndpoint.value[upstream.endpointId]?.length) return;
    // Click same row again → close
    if (activeEndpoint.value?.endpointId === upstream.endpointId) {
      activeEndpoint.value = null;
      return;
    }
    activeEndpoint.value = upstream;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const leftX = rect.left - TOOLTIP_W;
    tooltipPos.value = {
      x: leftX >= 8 ? leftX : rect.right + 8,
      y: rect.top + rect.height / 2,
    };
  }

  function closePanel() {
    activeEndpoint.value = null;
  }
</script>

<template>
  <div class="card p-5 overflow-hidden">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Architecture Overview</h2>
        <p class="text-xs mt-0.5" style="color: var(--text-secondary);">How central-MCP connects your AI agents to MCP
          servers</p>
      </div>
    </div>

    <!-- ── Help hints ─────────────────────────────────────── -->
    <div class="help-hints mb-4">
      <div class="hint-item group">
        <div class="hint-trigger">
          <div class="hint-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5">
              <path d="M13 16h-1v-4h-1m1-4h.01" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <span class="hint-title">What is a tenant?</span>
        </div>
        <div class="hint-popover">
          <p>A tenant is an isolated workspace. Each tenant has its own <strong>API key</strong> and its own set of
            upstream MCP servers. Use different tenants to separate environments (dev, prod) or organizations.</p>
        </div>
      </div>

      <div class="hint-item group">
        <div class="hint-trigger">
          <div class="hint-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <span class="hint-title">How to connect your AI client</span>
        </div>
        <div class="hint-popover">
          <p>Your AI agent (VS Code, Claude Desktop…) authenticates with the <strong>tenant API key</strong> via
            <code>Authorization: Bearer mcp_xxx</code>. Create and manage keys in the <router-link to="/keys"
              class="text-blue-500 hover:underline">API Keys</router-link> page.
          </p>
        </div>
      </div>
    </div>

    <!-- ── Diagram: horizontal on sm+, vertical on mobile ── -->
    <div class="arch-row">

      <!-- Node: Your machine -->
      <div class="arch-node">
        <div class="arch-node-icon" style="background: var(--bg-muted); border-color: var(--border-strong);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            style="color: var(--text-secondary);">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <span class="arch-node-label" style="color: var(--text-primary);">Your machine</span>
        <span class="arch-node-sub" style="color: var(--text-tertiary);">AI Client / IDE</span>
      </div>

      <!-- Connector: Tenant API Key -->
      <div class="arch-connector">
        <div class="arch-connector-track">
          <div class="arch-connector-line" style="background: var(--border-strong);"></div>
          <svg class="arch-connector-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            style="color: var(--text-tertiary);">
            <path d="M3 2l6 4-6 4z" />
          </svg>
        </div>
        <span class="arch-connector-label" style="color: var(--text-tertiary);">Tenant API Key</span>
      </div>

      <!-- Node: central-MCP -->
      <div class="arch-node">
        <div class="arch-node-icon relative"
          style="background: rgba(59,130,246,0.1); border-color: #3b82f6; width: 4rem; height: 4rem;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.75">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3">
              <path d="M20 7l-11 11-4-4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <span class="arch-node-label text-blue-500">central-MCP</span>
        <span class="arch-node-sub" style="color: var(--text-tertiary);">Proxy &amp; Auth</span>
      </div>

      <!-- Connector: Per-server auth -->
      <div class="arch-connector">
        <div class="arch-connector-track">
          <div class="arch-connector-line" style="background: var(--border-strong);"></div>
          <svg class="arch-connector-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            style="color: var(--text-tertiary);">
            <path d="M3 2l6 4-6 4z" />
          </svg>
        </div>
        <span class="arch-connector-label" style="color: var(--text-tertiary);">Per-server auth</span>
      </div>

      <!-- Endpoint column: scrollable  -->
      <div class="endpoints-column">
        <div class="endpoints-scroll">

          <div v-for="upstream in upstreams" :key="upstream.endpointId" class="endpoint-row"
            :class="{ 'endpoint-row--active': activeEndpoint?.endpointId === upstream.endpointId }"
            style="background: var(--bg-muted); border-color: var(--border-default);"
            @click="toggleEndpointPanel($event, upstream)">
            <!-- Status dot -->
            <span class="w-2 h-2 rounded-full shrink-0" :style="`background: ${statusColor(upstream.status)}`"></span>
            <!-- Namespace (truncated, no status text) -->
            <span class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ upstream.namespace
            }}</span>
            <!-- Tool count badge -->
            <span v-if="upstream.toolCount > 0" class="tool-badge shrink-0">{{ upstream.toolCount }}</span>
          </div>

          <!-- Empty state -->
          <div v-if="statusStore.upstreams.length === 0"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed"
            style="border-color: var(--border-default);">
            <span class="text-xs" style="color: var(--text-tertiary);">No servers yet —</span>
            <router-link to="/endpoints" class="text-xs text-blue-500 hover:underline">add one</router-link>
          </div>
        </div>

        <!-- Scroll hint when many endpoints -->
        <p v-if="statusStore.upstreams.length > 5" class="overflow-hint" style="color: var(--text-tertiary);">
          {{ statusStore.upstreams.length }} servers · scroll ↑↓
        </p>
      </div>
    </div>

    <!-- ── Teleported tool panel (click-to-open, escapes overflow) ── -->
    <Teleport to="body">
      <!-- Backdrop: click outside to close -->
      <div v-if="activeEndpoint" class="fixed inset-0" style="z-index: 9998;" @click="closePanel" />
      <Transition name="tooltip-fade">
        <div v-if="activeEndpoint" class="endpoint-tooltip-float" :style="{
          position: 'fixed',
          left: tooltipPos.x + 'px',
          top: tooltipPos.y + 'px',
          transform: 'translateY(-50%)',
          zIndex: 9999,
        }">
          <!-- Header with close button -->
          <div class="endpoint-tooltip-header"
            style="color: var(--text-primary); border-color: var(--border-default); background: var(--bg-overlay);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="truncate">{{ activeEndpoint.namespace }}</span>
            <span class="tool-badge ml-1 shrink-0">{{ toolsByEndpoint[activeEndpoint.endpointId]?.length ??
              activeEndpoint.toolCount }}</span>
            <button class="ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              style="color: var(--text-primary);" @click.stop="closePanel">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <!-- Full scrollable list -->
          <ul v-if="toolsByEndpoint[activeEndpoint.endpointId]?.length" class="endpoint-tooltip-list"
            style="background: var(--bg-overlay);">
            <li v-for="tool in toolsByEndpoint[activeEndpoint.endpointId]" :key="tool" class="endpoint-tooltip-item">{{
              tool }}</li>
          </ul>
          <!-- Placeholder when tools not yet fetched -->
          <p v-else class="px-3 py-2 text-xs"
            style="background: var(--bg-overlay); color: var(--text-tertiary); border-radius: 0 0 10px 10px;">
            Visit the Chat page once to load the full tool list.
          </p>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Legend ─────────────────────────────────────────── -->
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
        AI client authenticates with the tenant API key. Each upstream server uses its own credentials.
      </div>
    </div>
  </div>
</template>

<style scoped>

  /* ── Help hints ─────────────────────────────────────────── */
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

  /* ── Architecture row: vertical on mobile, horizontal on sm+ */
  .arch-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 8px 0;
  }

  @media (min-width: 640px) {
    .arch-row {
      flex-direction: row;
      align-items: center;
      /* vertically centre connectors with the icons */
    }
  }

  /* ── Nodes ─────────────────────────────────────────────── */
  .arch-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 7rem;
  }

  .arch-node-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-width: 2px;
    border-style: solid;
    margin-bottom: 0.5rem;
  }

  .arch-node-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
  }

  .arch-node-sub {
    font-size: 0.625rem;
    margin-top: 0.125rem;
    text-align: center;
  }

  /* ── Connectors ─────────────────────────────────────────── */
  .arch-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
    /* Mobile: small vertical gap between nodes */
    min-height: 44px;
    padding: 2px 0;
  }

  @media (min-width: 640px) {
    .arch-connector {
      /* Desktop: stretches horizontally */
      flex: 1;
      min-width: 80px;
      min-height: auto;
      padding: 0 8px;
    }
  }

  .arch-connector-track {
    display: flex;
    align-items: center;
    gap: 2px;
    /* Mobile: vertical */
    flex-direction: column;
    height: 28px;
  }

  @media (min-width: 640px) {
    .arch-connector-track {
      /* Desktop: horizontal */
      flex-direction: row;
      height: auto;
      width: 100%;
    }
  }

  .arch-connector-line {
    /* Mobile: vertical bar */
    width: 1px;
    flex: 1;
  }

  @media (min-width: 640px) {
    .arch-connector-line {
      /* Desktop: horizontal bar */
      height: 1px;
      width: auto;
      flex: 1;
    }
  }

  .arch-connector-arrow {
    flex-shrink: 0;
    /* Mobile: point downward */
    transform: rotate(90deg);
  }

  @media (min-width: 640px) {
    .arch-connector-arrow {
      /* Desktop: point rightward */
      transform: rotate(0deg);
    }
  }

  .arch-connector-label {
    font-size: 0.5625rem;
    text-align: center;
    white-space: nowrap;
  }

  /* ── Endpoint column ─────────────────────────────────────── */
  .endpoints-column {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    /* Mobile: full width of card */
    width: 100%;
  }

  @media (min-width: 640px) {
    .endpoints-column {
      width: auto;
    }
  }

  /* Scrollable list — max ~5 endpoints before scrolling */
  .endpoints-scroll {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 11rem;
    overflow-y: auto;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  .endpoints-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .endpoints-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .endpoints-scroll::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
  }

  /* ── Endpoint row: fixed width so all rows are uniform ──── */
  .endpoint-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 8px;
    border-width: 1px;
    border-style: solid;
    cursor: default;
    transition: border-color 0.12s ease;
    width: 160px;
    /* fixed → all rows same width; name truncates */
    min-width: 0;
    /* allow truncation */
  }

  .endpoint-row:hover {
    border-color: var(--border-strong) !important;
    cursor: pointer;
  }

  .endpoint-row--active {
    border-color: #3b82f6 !important;
    background: rgba(59, 130, 246, 0.06) !important;
    cursor: pointer;
  }

  /* Tool count badge */
  .tool-badge {
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 9999px;
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    flex-shrink: 0;
  }

  /* ── Teleport floating panel ────────────────────────────── */
  .endpoint-tooltip-float {
    width: 224px;
    border-radius: 10px;
    border: 1px solid var(--border-default);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
    overflow: hidden;
    pointer-events: auto;
  }

  .endpoint-tooltip-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }

  /* Scrollable tool list — max ~10 tools visible */
  .endpoint-tooltip-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    max-height: 13rem;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  .endpoint-tooltip-list::-webkit-scrollbar {
    width: 4px;
  }

  .endpoint-tooltip-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .endpoint-tooltip-list::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
  }

  .endpoint-tooltip-item {
    padding: 3px 12px;
    font-size: 11px;
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-secondary);
  }

  .endpoint-tooltip-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .overflow-hint {
    font-size: 10px;
    text-align: center;
    padding-top: 2px;
  }

  /* ── Tooltip transition ─────────────────────────────────── */
  .tooltip-fade-enter-active,
  .tooltip-fade-leave-active {
    transition: opacity 0.1s ease, transform 0.1s ease;
  }

  .tooltip-fade-enter-from,
  .tooltip-fade-leave-to {
    opacity: 0;
    transform: translateY(calc(-50% - 4px));
  }
</style>
