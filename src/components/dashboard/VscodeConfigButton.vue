<script setup lang="ts">
  import { ref, computed } from 'vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import { useTenantStore } from '@/stores/tenant';

  const tenantStore = useTenantStore();
  const showModal = ref(false);
  const copiedJson = ref(false);
  const isGenerating = ref(false);

  /** The plain-text key returned by createKey / regenerateKey — shown once */
  const generatedKey = ref<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const mcpUrl = computed(() => `${baseUrl}/mcp`);

  const hasExistingKeys = computed(() => tenantStore.apiKeys.length > 0);

  /**
   * Key shown in the JSON:
   *  - after generation  → full plain-text key
   *  - before generation → `prefix…` if a key exists, else placeholder
   */
  const displayKey = computed(() =>
    generatedKey.value
    ?? (tenantStore.selectedKey ? `${tenantStore.selectedKey.keyPrefix}…` : 'YOUR_API_KEY'),
  );

  const isKeyReal = computed(() => generatedKey.value !== null);

  const configJson = computed(() => JSON.stringify({
    servers: {
      'MCP Central': {
        type: 'http',
        url: mcpUrl.value,
        headers: { Authorization: `Bearer ${displayKey.value}` },
      },
    },
  }, null, 2));

  function openModal() {
    generatedKey.value = null;
    showModal.value = true;
  }

  async function generateKey() {
    isGenerating.value = true;
    try {
      const newKey = hasExistingKeys.value
        ? await tenantStore.regenerateKey(tenantStore.apiKeys[0].id)
        : await tenantStore.createKey('VS Code');
      generatedKey.value = newKey.key;
    } finally {
      isGenerating.value = false;
    }
  }

  async function copyJson() {
    await navigator.clipboard.writeText(configJson.value);
    copiedJson.value = true;
    setTimeout(() => (copiedJson.value = false), 2000);
  }

  function download() {
    const blob = new Blob([configJson.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp.json';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<template>
  <AppButton variant="primary" size="sm" @click="openModal">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
      <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    Install MCP Central to VS Code
  </AppButton>

  <AppModal :open="showModal" title="VS Code MCP Configuration" size="lg" @close="showModal = false">
    <div class="flex flex-col gap-4">

      <!-- ── Status banner (contextual) ─────────────────────────────── -->
      <!-- After generation: success -->
      <div v-if="isKeyReal" class="flex items-center gap-2 rounded-lg p-3 border text-sm"
        style="background: color-mix(in srgb, #22c55e 8%, var(--bg-surface)); border-color: color-mix(in srgb, #22c55e 30%, transparent); color: #15803d;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          class="shrink-0">
          <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Key generated — <strong>save it now, it will not be shown again.</strong></span>
      </div>

      <!-- Before generation: regenerate warning -->
      <div v-else-if="hasExistingKeys" class="flex gap-3 rounded-lg p-3 border text-sm"
        style="background: color-mix(in srgb, #f59e0b 8%, var(--bg-surface)); border-color: color-mix(in srgb, #f59e0b 30%, transparent);">
        <svg class="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
          stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div style="color: #b45309;">
          <p class="font-medium mb-0.5" style="color: #92400e;">This will regenerate the key <em>{{
            tenantStore.apiKeys[0].label }}</em></p>
          Any previous VS Code installation using that key will lose access immediately.
          To add a machine without breaking existing ones, create a new key from
          <router-link to="/settings/keys" class="underline font-medium" @click="showModal = false">Settings → API
            Keys</router-link>.
        </div>
      </div>

      <!-- Before generation: first key info -->
      <p v-else class="text-xs rounded-lg p-3 border"
        style="background: var(--bg-muted); border-color: var(--border-default); color: var(--text-secondary);">
        Click <strong style="color: var(--text-primary);">Generate key</strong> to create a dedicated API key and
        get a ready-to-use <code class="font-mono px-1 rounded"
          style="background: var(--bg-surface);">.vscode/mcp.json</code>.
      </p>

      <!-- ── JSON block — always visible ────────────────────────────── -->
      <div class="rounded-lg overflow-hidden border" style="border-color: var(--border-default);">
        <!-- Code block header -->
        <div class="flex items-center justify-between px-3 py-2 border-b"
          style="background: var(--bg-muted); border-color: var(--border-default);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono" style="color: var(--text-secondary);">.vscode/mcp.json</span>
            <!-- State pill -->
            <span v-if="isKeyReal" class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
              style="background: color-mix(in srgb, #22c55e 12%, transparent); color: #15803d;">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              Live key
            </span>
            <span v-else class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
              style="background: var(--bg-surface); color: var(--text-tertiary); border: 1px solid var(--border-default);">
              Preview
            </span>
          </div>
          <!-- Copy button — always enabled so the user can copy the preview too -->
          <button @click="copyJson" class="flex items-center gap-1.5 text-xs transition-colors"
            :style="copiedJson ? 'color: #22c55e' : 'color: var(--text-tertiary)'">
            <svg v-if="!copiedJson" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ copiedJson ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <pre class="px-4 py-4 text-xs overflow-x-auto font-mono leading-relaxed"
          style="background: var(--bg-surface); color: var(--text-primary);">{{ configJson }}</pre>
      </div>

      <p class="text-xs" style="color: var(--text-tertiary);">
        Save as <code class="font-mono px-1 rounded" style="background: var(--bg-muted);">.vscode/mcp.json</code>
        in your project root. VS Code will automatically detect the server and expose all your configured tools.
      </p>
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="showModal = false">Close</AppButton>

      <!-- Generate / Regenerate (before key is created) -->
      <AppButton v-if="!isKeyReal" :disabled="isGenerating" @click="generateKey">
        <svg v-if="isGenerating" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" class="animate-spin">
          <path d="M21 12a9 9 0 11-6.22-8.56" stroke-linecap="round" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="isGenerating">Generating…</span>
        <span v-else-if="hasExistingKeys">Regenerate key</span>
        <span v-else>Generate key</span>
      </AppButton>

      <!-- Download (after key is created) -->
      <AppButton v-else @click="download">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        Download mcp.json
      </AppButton>
    </template>
  </AppModal>
</template>
