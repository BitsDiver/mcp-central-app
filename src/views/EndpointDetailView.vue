<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import StatusBadge from '@/components/ui/StatusBadge.vue';
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
  import AppToggle from '@/components/ui/AppToggle.vue';
  import ToolList from '@/components/tools/ToolList.vue';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useStatusStore } from '@/stores/status';

  import type { EndpointStatus } from '@/types';
  import { ChevronRight, Link, Trash2 } from 'lucide-vue-next';

  const route = useRoute();
  const router = useRouter();
  const endpointStore = useEndpointStore();
  const statusStore = useStatusStore();

  const endpointId = route.params.id as string;
  const showDeleteDialog = ref(false);
  const deleting = ref(false);

  const endpoint = computed(() =>
    endpointStore.endpoints.find((e) => e.id === endpointId) ?? null
  );

  const status = computed(() =>
    (statusStore.upstreams.find((u) => u.endpointId === endpointId)?.status ?? 'disconnected') as EndpointStatus
  );

  onMounted(async () => {
    if (!endpoint.value) await endpointStore.load();
  });

  async function handleToggle() {
    if (!endpoint.value) return;
    await endpointStore.toggle(endpoint.value.id, !endpoint.value.isEnabled);
  }

  async function confirmDelete() {
    if (!endpoint.value) return;
    deleting.value = true;
    try {
      await endpointStore.remove(endpoint.value.id);
      await router.push('/endpoints');
    } finally {
      deleting.value = false;
    }
  }

  function formatDate(d: string | null): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
  }

</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <router-link to="/endpoints" class="text-sm hover:underline"
          style="color: var(--text-secondary);">Endpoints</router-link>
        <ChevronRight :size="14" :stroke-width="2" style="color: var(--text-tertiary);" />
        <span class="text-sm font-medium" style="color: var(--text-primary);">{{ endpoint?.name ?? 'Loading…' }}</span>
      </div>

      <div v-if="!endpoint" class="flex items-center gap-3 py-12 justify-center">
        <span class="animate-spin-smooth w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span class="text-sm" style="color: var(--text-secondary);">Loading endpoint…</span>
      </div>

      <template v-else>
        <!-- Endpoint detail card -->
        <div class="card overflow-hidden mb-6">
          <!-- Header: name, tags, actions -->
          <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2.5">
                <!-- Registry icon chip -->
                <span v-if="endpoint.iconLetters || endpoint.iconUrl"
                  class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold overflow-hidden"
                  :style="{
                    background: endpoint.iconUrl ? 'transparent' : 'var(--bg-muted)',
                    border: endpoint.iconUrl ? 'none' : '1px solid var(--border-default)',
                    color: endpoint.iconUrl ? 'transparent' : 'var(--text-secondary)',
                  }">
                  <img v-if="endpoint.iconUrl" :src="endpoint.iconUrl" class="w-full h-full object-cover"
                    :alt="endpoint.iconLetters ?? ''" />
                  <span v-else style="color: white;">{{ endpoint.iconLetters }}</span>
                </span>
                <!-- Fallback: muted chip with link icon -->
                <span v-else class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style="background: var(--bg-muted); border: 1px solid var(--border-default);">
                  <Link :size="18" :stroke-width="1.75" style="color: var(--text-tertiary);" />
                </span>
                <h1 class="text-xl font-semibold" style="color: var(--text-primary);">{{ endpoint.name }}</h1>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <code class="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md"
                  style="background: var(--bg-muted); color: var(--text-secondary);">{{ endpoint.namespace }}</code>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-md"
                  style="background: var(--bg-muted); color: var(--text-secondary);">{{ endpoint.transport }}</span>
                <StatusBadge :status="status" />
              </div>
              <!-- Connection target -->
              <div v-if="endpoint.url" class="mt-3.5">
                <p class="text-[10px] uppercase tracking-wide font-semibold mb-1" style="color: var(--text-tertiary);">
                  URL</p>
                <code class="text-xs font-mono break-all leading-relaxed"
                  style="color: var(--text-secondary);">{{ endpoint.url }}</code>
              </div>
              <div v-if="endpoint.command" class="mt-3.5">
                <p class="text-[10px] uppercase tracking-wide font-semibold mb-1" style="color: var(--text-tertiary);">
                  Command</p>
                <code class="text-xs font-mono"
                  style="color: var(--text-secondary);">{{ endpoint.command }}{{ endpoint.args?.length ? ' ' + endpoint.args.join(' ') : '' }}</code>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0 pt-0.5">
              <AppToggle :model-value="endpoint.isEnabled" @update:model-value="handleToggle"
                :label="endpoint.isEnabled ? 'Enabled' : 'Disabled'" />
              <AppButton variant="danger" size="sm" @click="showDeleteDialog = true">
                <Trash2 :size="14" :stroke-width="2" />
                Remove
              </AppButton>
            </div>
          </div>
          <!-- Meta strip -->
          <div class="px-6 py-3 border-t flex flex-wrap gap-x-8 gap-y-2"
            style="background: var(--bg-muted); border-color: var(--border-default);">
            <div>
              <p class="text-[10px] uppercase tracking-wide font-semibold" style="color: var(--text-tertiary);">Last
                connected</p>
              <p class="text-sm mt-0.5" style="color: var(--text-primary);">{{ formatDate(endpoint.lastConnectedAt) }}
              </p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wide font-semibold" style="color: var(--text-tertiary);">Created
              </p>
              <p class="text-sm mt-0.5" style="color: var(--text-primary);">{{ formatDate(endpoint.createdAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Tools -->
        <ToolList :endpoint-id="endpointId" />
      </template>
    </div>

    <ConfirmDialog :open="showDeleteDialog" title="Remove Endpoint"
      :message="`Remove '${endpoint?.name}'? This action cannot be undone.`" confirm-label="Remove" :loading="deleting"
      @confirm="confirmDelete" @cancel="showDeleteDialog = false" />
  </AppLayout>
</template>
