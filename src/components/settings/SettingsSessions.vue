<script setup lang="ts">
    import { ref, computed, onMounted, onUnmounted, markRaw, type Component } from 'vue';
    import { AppWindow, Router, MonitorSmartphone } from 'lucide-vue-next';
    import { emitAgent, getSocket } from '@/api/socket';
    import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
    import StatusBadge from '@/components/ui/StatusBadge.vue';
    import { useMcpClientsStore } from '@/stores/mcpClients';
    import type { ConnectedMcpClient } from '@/types';

    // AI client brand icons
    import IconVSCode from '@/components/icons/IconVSCode.vue';
    import IconCursor from '@/components/icons/IconCursor.vue';
    import IconWindsurf from '@/components/icons/IconWindsurf.vue';
    import IconZed from '@/components/icons/IconZed.vue';
    import IconCline from '@/components/icons/IconCline.vue';
    import IconJetBrains from '@/components/icons/IconJetBrains.vue';
    import IconOpenWebUI from '@/components/icons/IconOpenWebUI.vue';
    import IconAntigravity from '@/components/icons/IconAntigravity.vue';

    const CLIENT_ICONS: Record<string, Component> = {
        vscode: markRaw(IconVSCode),
        cursor: markRaw(IconCursor),
        windsurf: markRaw(IconWindsurf),
        zed: markRaw(IconZed),
        cline: markRaw(IconCline),
        jetbrains: markRaw(IconJetBrains),
        openwebui: markRaw(IconOpenWebUI),
        antigravity: markRaw(IconAntigravity),
    };

    const mcpClientsStore = useMcpClientsStore();

    interface BrowserSession {
        socketId: string;
        userId: string;
        email: string | null;
        name: string | null;
        namespace: string;
        connectedAt: string;
        ip: string | null;
    }

    interface AgentSession {
        id: string;
        name: string;
        namespace: string;
        isConnected: boolean;
        connectedIp: string | null;
        version: string | null;
        lastSeenAt: string | null;
    }

    interface UserGroup {
        userId: string;
        email: string | null;
        name: string | null;
        sessions: BrowserSession[];
        ip: string | null;
        since: string;
    }

    const loading = ref(false);
    const error = ref<string | null>(null);
    const rawBrowserSessions = ref<BrowserSession[]>([]);
    const agentSessions = ref<AgentSession[]>([]);

    const browserGroups = computed<UserGroup[]>(() => {
        const map = new Map<string, UserGroup>();
        for (const s of rawBrowserSessions.value) {
            if (!map.has(s.userId)) {
                map.set(s.userId, {
                    userId: s.userId,
                    email: s.email,
                    name: s.name,
                    sessions: [],
                    ip: s.ip,
                    since: s.connectedAt,
                });
            }
            const g = map.get(s.userId)!;
            g.sessions.push(s);
            // keep earliest connectedAt
            if (new Date(s.connectedAt) < new Date(g.since)) g.since = s.connectedAt;
        }
        return Array.from(map.values());
    });

    async function load() {
        loading.value = true;
        error.value = null;
        try {
            const res = await emitAgent<{ browserSessions: BrowserSession[]; agents: AgentSession[]; }>(
                'listSessions', {}
            );
            if (res.status === 'success' && res.data) {
                rawBrowserSessions.value = res.data.browserSessions;
                agentSessions.value = res.data.agents;
            } else {
                error.value = res.message ?? res.code ?? 'Could not load sessions';
            }
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    function formatDate(d: string | null): string {
        if (!d) return '—';
        const diff = Date.now() - new Date(d).getTime();
        const s = Math.floor(diff / 1000);
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
    }

    function initials(name: string | null, email: string | null): string {
        const src = name ?? email ?? '?';
        return src.slice(0, 2).toUpperCase();
    }

    function nsLabel(ns: string): string {
        return ns || 'unknown';
    }

    onMounted(load);
    onMounted(() => mcpClientsStore.load());

    // Real-time MCP client sessions
    function onMcpClientConnected(data: ConnectedMcpClient) {
        mcpClientsStore.addClient(data);
    }
    function onMcpClientDisconnected(data: { sessionId: string; }) {
        mcpClientsStore.removeClient(data.sessionId);
    }
    onMounted(() => {
        const sock = getSocket('endpoints');
        sock?.on('mcp_client_connected', onMcpClientConnected);
        sock?.on('mcp_client_disconnected', onMcpClientDisconnected);
    });
    onUnmounted(() => {
        const sock = getSocket('endpoints');
        sock?.off('mcp_client_connected', onMcpClientConnected);
        sock?.off('mcp_client_disconnected', onMcpClientDisconnected);
    });

    // Real-time agent connection status
    function onAgentConnected(data: { agentId: string; }) {
        const s = agentSessions.value.find((a) => a.id === data.agentId);
        if (s) s.isConnected = true;
    }
    function onAgentDisconnected(data: { agentId: string; }) {
        const s = agentSessions.value.find((a) => a.id === data.agentId);
        if (s) s.isConnected = false;
    }
    onMounted(() => {
        const sock = getSocket('agent');
        sock?.on('agent_connected', onAgentConnected);
        sock?.on('agent_disconnected', onAgentDisconnected);
    });
    onUnmounted(() => {
        const sock = getSocket('agent');
        sock?.off('agent_connected', onAgentConnected);
        sock?.off('agent_disconnected', onAgentDisconnected);
    });

    const kicking = ref(new Set<string>());

    async function kickBrowserSession(socketId: string) {
        kicking.value = new Set(kicking.value).add(socketId);
        try {
            await emitAgent('kickSession', { type: 'browser', socketId });
            rawBrowserSessions.value = rawBrowserSessions.value.filter((s) => s.socketId !== socketId);
        } finally {
            const next = new Set(kicking.value);
            next.delete(socketId);
            kicking.value = next;
        }
    }

    async function kickAgentSession(agentId: string) {
        kicking.value = new Set(kicking.value).add(agentId);
        try {
            await emitAgent('kickSession', { type: 'agent', agentId });
            await load();
        } finally {
            const next = new Set(kicking.value);
            next.delete(agentId);
            kicking.value = next;
        }
    }
</script>

<template>
    <div class="p-6 flex flex-col gap-7">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-base font-semibold" style="color: var(--text-primary);">Active Sessions</h2>
                <p class="text-sm mt-0.5" style="color: var(--text-secondary);">
                    Live browser connections, MCP client sessions, and local agent tunnels.
                </p>
            </div>
            <button type="button" @click="load" :disabled="loading"
                class="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                style="border-color: var(--border-default); color: var(--text-secondary); background: var(--bg-muted);"
                :class="{ 'opacity-50 cursor-not-allowed': loading }">
                <span v-if="loading">Refreshing…</span>
                <span v-else>↻ Refresh</span>
            </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="rounded-lg p-4 text-sm" style="background: rgba(239,68,68,.08); color: #ef4444;">
            {{ error }}
        </div>

        <!-- ── Browser Clients ── -->
        <section>
            <h3 class="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"
                style="color: var(--text-tertiary);">
                <AppWindow :size="13" />
                Browser clients
                <span class="ml-auto font-medium text-[11px] px-1.5 py-0.5 rounded-md"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{ browserGroups.length }}</span>
            </h3>

            <!-- Loading skeletons -->
            <div v-if="loading" class="flex flex-col gap-2">
                <div v-for="i in 2" :key="i" class="rounded-xl border px-4 py-3 flex items-center gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <SkeletonBlock width="2rem" height="2rem" />
                    <div class="flex-1 flex flex-col gap-1.5">
                        <SkeletonBlock width="40%" height="0.75rem" />
                        <SkeletonBlock width="60%" height="0.65rem" />
                    </div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="browserGroups.length === 0" class="py-8 text-center rounded-xl border"
                style="background: var(--bg-muted); border-color: var(--border-default);">
                <p class="text-sm" style="color: var(--text-tertiary);">No browser sessions active for this tenant.</p>
            </div>

            <!-- Session rows -->
            <div v-else class="flex flex-col gap-2">
                <div v-for="group in browserGroups" :key="group.userId"
                    class="rounded-xl border px-4 py-3 flex items-start gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <!-- Avatar -->
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                        style="background: var(--color-primary, #6366f1);">
                        {{ initials(group.name, group.email) }}
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium" style="color: var(--text-primary);">
                            {{ group.name ?? group.email ?? group.userId }}
                        </p>
                        <p v-if="group.email && group.name" class="text-xs" style="color: var(--text-secondary);">
                            {{ group.email }}
                        </p>
                        <!-- Namespace badges with disconnect -->
                        <div class="flex flex-wrap gap-1 mt-1.5">
                            <span v-for="s in group.sessions" :key="s.socketId"
                                class="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                                style="background: var(--bg-muted); color: var(--text-tertiary);">
                                /{{ nsLabel(s.namespace) }}
                                <button :disabled="kicking.has(s.socketId)" @click.stop="kickBrowserSession(s.socketId)"
                                    title="Disconnect — will reconnect automatically"
                                    class="ml-0.5 leading-none opacity-50 hover:opacity-100 disabled:opacity-30 transition-opacity"
                                    style="color: #ef4444;">
                                    {{ kicking.has(s.socketId) ? '…' : '×' }}
                                </button>
                            </span>
                        </div>
                    </div>
                    <!-- Meta -->
                    <div class="text-right shrink-0">
                        <p class="text-xs" style="color: var(--text-secondary);">{{ formatDate(group.since) }}</p>
                        <p v-if="group.ip" class="text-[10px] font-mono mt-0.5" style="color: var(--text-tertiary);">
                            {{ group.ip }}
                        </p>
                        <!-- Live indicator -->
                        <span class="inline-flex items-center gap-1 mt-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span class="text-[10px] font-medium" style="color: #10b981;">live</span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── MCP Client Sessions ── -->
        <section>
            <h3 class="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"
                style="color: var(--text-tertiary);">
                <MonitorSmartphone :size="13" />
                MCP client sessions
                <span class="ml-auto font-medium text-[11px] px-1.5 py-0.5 rounded-md"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{
                        mcpClientsStore.enrichedClients.length }}</span>
            </h3>

            <!-- Loading skeletons -->
            <div v-if="mcpClientsStore.isLoading" class="flex flex-col gap-2">
                <div v-for="i in 2" :key="i" class="rounded-xl border px-4 py-3 flex items-center gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <SkeletonBlock width="2rem" height="2rem" />
                    <div class="flex-1 flex flex-col gap-1.5">
                        <SkeletonBlock width="35%" height="0.75rem" />
                        <SkeletonBlock width="55%" height="0.65rem" />
                    </div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="mcpClientsStore.enrichedClients.length === 0" class="py-8 text-center rounded-xl border"
                style="background: var(--bg-muted); border-color: var(--border-default);">
                <p class="text-sm" style="color: var(--text-tertiary);">No MCP client sessions active for this tenant.
                </p>
            </div>

            <!-- Session rows -->
            <div v-else class="flex flex-col gap-2">
                <div v-for="client in mcpClientsStore.enrichedClients" :key="client.sessionId"
                    class="rounded-xl border px-4 py-3 flex items-start gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <!-- Client icon -->
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        :style="`background: ${client.identified.brandColor}15;`">
                        <component v-if="client.identified.clientId && CLIENT_ICONS[client.identified.clientId]"
                            :is="CLIENT_ICONS[client.identified.clientId]" class="w-4 h-4"
                            :style="`color: ${client.identified.brandColor};`" />
                        <MonitorSmartphone v-else :size="14" :style="`color: ${client.identified.brandColor};`" />
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium" style="color: var(--text-primary);">
                            {{ client.identified.displayName }}
                        </p>
                        <p v-if="client.clientVersion" class="text-xs" style="color: var(--text-secondary);">
                            v{{ client.clientVersion }}
                        </p>
                        <code v-if="client.userAgent" class="text-[10px] font-mono block truncate mt-0.5"
                            style="color: var(--text-tertiary); max-width: 350px;" :title="client.userAgent">
                            {{ client.userAgent }}
                        </code>
                        <code class="text-[10px] font-mono block mt-0.5" style="color: var(--text-tertiary);">
                            session: {{ client.sessionId.slice(0, 8) }}…
                        </code>
                    </div>
                    <!-- Meta -->
                    <div class="text-right shrink-0">
                        <p class="text-xs" style="color: var(--text-secondary);">{{ formatDate(client.connectedAt) }}
                        </p>
                        <span class="inline-flex items-center gap-1 mt-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span class="text-[10px] font-medium" style="color: #10b981;">live</span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ── Local Agents ── -->
        <section>
            <h3 class="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"
                style="color: var(--text-tertiary);">
                <Router :size="13" />
                Local agents
                <span class="ml-auto font-medium text-[11px] px-1.5 py-0.5 rounded-md"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{ agentSessions.length }}</span>
            </h3>

            <!-- Loading skeletons -->
            <div v-if="loading" class="flex flex-col gap-2">
                <div v-for="i in 2" :key="i" class="rounded-xl border px-4 py-3 flex items-center gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <SkeletonBlock width="2rem" height="2rem" />
                    <div class="flex-1 flex flex-col gap-1.5">
                        <SkeletonBlock width="35%" height="0.75rem" />
                        <SkeletonBlock width="50%" height="0.65rem" />
                    </div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="agentSessions.length === 0" class="py-8 text-center rounded-xl border"
                style="background: var(--bg-muted); border-color: var(--border-default);">
                <p class="text-sm" style="color: var(--text-tertiary);">No local agents registered for this tenant.</p>
            </div>

            <!-- Agent rows -->
            <div v-else class="flex flex-col gap-2">
                <div v-for="agent in agentSessions" :key="agent.id"
                    class="rounded-xl border px-4 py-3 flex items-start gap-3"
                    style="background: var(--bg-card); border-color: var(--border-default);">
                    <!-- Status dot / icon -->
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        :style="agent.isConnected ? 'background: rgba(16,185,129,.12);' : 'background: var(--bg-muted);'">
                        <Router :size="14"
                            :style="agent.isConnected ? 'color: #10b981;' : 'color: var(--text-tertiary);'" />
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium" style="color: var(--text-primary);">{{ agent.name }}</p>
                        <code class="text-[10px] font-mono"
                            style="color: var(--text-tertiary);">{{ agent.namespace }}</code>
                        <div class="flex items-center gap-2 mt-1">
                            <span v-if="agent.version" class="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                                style="background: var(--bg-muted); color: var(--text-tertiary);">v{{ agent.version
                                }}</span>
                            <span v-if="agent.connectedIp" class="text-[10px] font-mono"
                                style="color: var(--text-tertiary);">
                                {{ agent.connectedIp }}
                            </span>
                        </div>
                    </div>
                    <!-- Status -->
                    <div class="text-right shrink-0">
                        <StatusBadge :status="agent.isConnected ? 'connected' : 'disconnected'" />
                        <p v-if="agent.lastSeenAt" class="text-[10px] mt-1" style="color: var(--text-tertiary);">
                            {{ formatDate(agent.lastSeenAt) }}
                        </p>
                        <button v-if="agent.isConnected" :disabled="kicking.has(agent.id)"
                            @click="kickAgentSession(agent.id)" title="Disconnect — will reconnect automatically"
                            class="mt-1.5 text-[10px] px-2 py-0.5 rounded border transition-colors disabled:opacity-40"
                            style="border-color: #ef444466; color: #ef4444; background: rgba(239,68,68,.06);">
                            {{ kicking.has(agent.id) ? '…' : 'Disconnect' }}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
