<script setup lang="ts">
    import { ref, computed, watch } from 'vue';
    import ServerCard from '@/components/registry/ServerCard.vue';
    import AppListbox from '@/components/ui/AppListbox.vue';
    import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
    import type { RegistryServer } from '@/data/mcpRegistry';
    import type { ListboxOption } from '@/types';
    import { useRegistry } from '@/composables/useRegistry';
    import { useEndpointStore } from '@/stores/endpoints';

    const props = withDefaults(defineProps<{
        /**
         * 'pick'   — compact cards + "Add" button that emits `select`
         * 'browse' — full ServerCard layout + "Install" button that emits `configure`
         */
        mode: 'pick' | 'browse';
        /** Hides category pill bar — intended for modal usage. */
        compact?: boolean;
        /** Highlights a server as currently being processed (browse mode). */
        processingId?: string | null;
        /** Highlights a server as just-installed (browse mode). */
        successId?: string | null;
    }>(), {
        compact: false,
        processingId: null,
        successId: null,
    });

    const emit = defineEmits<{
        select: [server: RegistryServer];
        configure: [server: RegistryServer];
    }>();

    const TRANSPORT_OPTIONS: ListboxOption[] = [
        {
            value: 'all',
            label: 'All transports',
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        },
        {
            value: 'streamable-http',
            label: 'HTTP',
            description: 'Remote server — no local agent required',
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        },
        {
            value: 'stdio',
            label: 'stdio',
            description: 'Local process — requires an agent',
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
        },
        {
            value: 'sse',
            label: 'SSE',
            description: 'Server-Sent Events — remote stream',
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>`,
        },
    ];

    const endpointStore = useEndpointStore();
    const { servers, categories, isLoading, searchResults, searchLoading, searchServers } = useRegistry();

    const search = ref('');
    const activeCategory = ref('All');
    const activeTransport = ref('all');

    const isSearching = computed(() => !!search.value.trim());

    const isAdded = (server: RegistryServer) =>
        endpointStore.endpoints.some(
            (e) => e.namespace === server.namespace || e.name.toLowerCase() === server.name.toLowerCase(),
        );

    // Debounced live search
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    watch(search, (q) => {
        if (searchTimer) clearTimeout(searchTimer);
        if (!q.trim()) { searchServers(''); return; }
        searchTimer = setTimeout(
            () => searchServers(q, activeTransport.value !== 'all' ? activeTransport.value : undefined),
            300,
        );
    });
    watch(activeTransport, (t) => {
        if (isSearching.value) searchServers(search.value, t !== 'all' ? t : undefined);
    });

    const filtered = computed(() => {
        if (isSearching.value) {
            return activeTransport.value === 'all'
                ? searchResults.value
                : searchResults.value.filter((s) => s.transport === activeTransport.value);
        }
        return servers.value.filter((s) => {
            const matchesCategory = !props.compact && activeCategory.value !== 'All'
                ? s.category === activeCategory.value
                : activeCategory.value === 'All' || s.category === activeCategory.value;
            const matchesTransport = activeTransport.value === 'all' || s.transport === activeTransport.value;
            return matchesCategory && matchesTransport;
        });
    });

    // Group by category only in browse, non-searching, all-category view
    const groupedByCategory = computed(() => {
        if (props.compact || isSearching.value || activeCategory.value !== 'All' || activeTransport.value !== 'all') {
            return null;
        }
        const groups: Record<string, RegistryServer[]> = {};
        for (const server of filtered.value) {
            if (!groups[server.category]) groups[server.category] = [];
            groups[server.category].push(server);
        }
        return groups;
    });

    const isLoadingAny = computed(() => isLoading.value || searchLoading.value);

    function handleAction(server: RegistryServer) {
        if (props.mode === 'pick') {
            emit('select', server);
        } else {
            emit('configure', server);
        }
    }
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Toolbar: transport filter + search -->
        <div class="flex flex-wrap items-center gap-2">
            <AppListbox v-model="activeTransport" :options="TRANSPORT_OPTIONS" size="sm" placement="bottom" />
            <div class="relative flex-1" :style="compact ? 'min-width: 0;' : 'min-width: 220px;'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style="color: var(--text-tertiary);">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input v-model="search" type="text" placeholder="Search servers…"
                    class="w-full pl-8 py-2 text-sm rounded-lg border outline-none transition-colors"
                    :class="search ? 'pr-8' : 'pr-3'"
                    style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
                <button v-if="search" @click="search = ''; searchServers('')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[var(--bg-hover)]"
                    style="color: var(--text-tertiary);" title="Clear search">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5">
                        <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Category pills (hidden when compact) -->
        <div v-if="!compact && !isSearching" class="flex gap-1.5 flex-wrap">
            <button v-for="cat in categories" :key="cat" @click="activeCategory = cat" :class="[
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                activeCategory === cat
                    ? 'bg-blue-500 text-white'
                    : 'border hover:bg-[var(--bg-hover)]',
            ]" style="border-color: var(--border-default);"
                :style="activeCategory !== cat ? 'color: var(--text-secondary);' : ''">
                {{ cat }}
            </button>
        </div>

        <!-- Loading skeletons -->
        <div v-if="isLoadingAny"
            :class="compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'">
            <div v-for="i in compact ? 6 : 9" :key="i" class="rounded-xl border px-5 py-4 flex flex-col gap-3"
                style="background: var(--bg-card); border-color: var(--border-default);">
                <div class="flex items-center gap-3">
                    <SkeletonBlock height="2rem" width="2rem" class="rounded-lg shrink-0" />
                    <SkeletonBlock height="1rem" width="50%" />
                </div>
                <SkeletonBlock height="0.75rem" width="80%" />
                <SkeletonBlock height="0.75rem" width="60%" />
            </div>
        </div>

        <!-- ── Browse mode: grouped ServerCards ── -->
        <template v-else-if="mode === 'browse'">
            <template v-if="groupedByCategory">
                <div v-for="(groupServers, category) in groupedByCategory" :key="category" class="mb-4">
                    <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">{{ category }}</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <ServerCard v-for="server in groupServers" :key="server.id" :server="server"
                            :added="isAdded(server)" :adding="processingId === server.id"
                            :success="successId === server.id" @add="handleAction(server)" />
                    </div>
                </div>
            </template>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <ServerCard v-for="server in filtered" :key="server.id" :server="server" :added="isAdded(server)"
                    :adding="processingId === server.id" :success="successId === server.id"
                    @add="handleAction(server)" />
                <div v-if="filtered.length === 0" class="col-span-3 py-16 text-center">
                    <p class="text-sm" style="color: var(--text-tertiary);">
                        {{ isSearching ? 'No servers found for this search.' : 'No servers match your filters.' }}
                    </p>
                </div>
            </div>
        </template>

        <!-- ── Pick mode: 2-col compact cards ── -->
        <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                :style="compact ? 'max-height: 50vh; overflow-y: auto; padding-right: 2px;' : ''">
                <div v-for="server in filtered" :key="server.id" class="card p-4 flex gap-3 items-start transition-all"
                    :class="isAdded(server) ? 'opacity-60' : 'card-hover cursor-pointer'"
                    @click="!isAdded(server) && handleAction(server)">
                    <!-- Icon -->
                    <img v-if="server.iconUrl" :src="server.iconUrl" alt=""
                        class="w-9 h-9 rounded-lg object-contain shrink-0" />
                    <div v-else
                        class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        :style="`background: ${server.color}`">
                        {{ server.iconLetters }}
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-sm font-semibold truncate" style="color: var(--text-primary);">{{
                                server.name }}</span>
                            <span v-if="server.official"
                                class="badge badge-primary text-[10px] px-1.5 py-0 shrink-0">Official</span>
                        </div>
                        <p class="text-xs leading-relaxed line-clamp-2" style="color: var(--text-secondary);">
                            {{ server.description }}
                        </p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                style="background: var(--bg-muted); color: var(--text-tertiary);">
                                {{ server.transport }}
                            </span>
                            <span v-if="isAdded(server)" class="text-[10px] text-green-500 font-medium">Already
                                added</span>
                        </div>
                    </div>
                    <!-- Action button -->
                    <button v-if="!isAdded(server)"
                        class="shrink-0 mt-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all bg-blue-500 hover:bg-blue-600 active:scale-95 text-white"
                        @click.stop="handleAction(server)">
                        Add
                    </button>
                </div>

                <div v-if="filtered.length === 0" class="col-span-2 py-8 text-center">
                    <p class="text-sm" style="color: var(--text-tertiary);">No servers match your search.</p>
                </div>
            </div>
        </template>
    </div>
</template>
