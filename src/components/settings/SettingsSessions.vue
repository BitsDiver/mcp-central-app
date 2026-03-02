<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue';
    import { emitAgent } from '@/api/socket';
    import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
    import StatusBadge from '@/components/ui/StatusBadge.vue';

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
</script>

<template>
    <div class="p-6 flex flex-col gap-7">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-base font-semibold" style="color: var(--text-primary);">Active Sessions</h2>
                <p class="text-sm mt-0.5" style="color: var(--text-secondary);">
                    Live browser connections and local agent tunnels.
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" stroke-linecap="round" />
                </svg>
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
                        <!-- Namespace badges -->
                        <div class="flex flex-wrap gap-1 mt-1.5">
                            <span v-for="s in group.sessions" :key="s.socketId"
                                class="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                                style="background: var(--bg-muted); color: var(--text-tertiary);">
                                /{{ nsLabel(s.namespace) }}
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

        <!-- ── Local Agents ── -->
        <section>
            <h3 class="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"
                style="color: var(--text-tertiary);">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" stroke-linecap="round" />
                </svg>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2"
                            :style="agent.isConnected ? 'color: #10b981;' : 'color: var(--text-tertiary);'">
                            <path
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"
                                stroke-linecap="round" />
                        </svg>
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
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
