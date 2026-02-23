<script setup lang="ts">
import { ref, computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()
const showModal = ref(false)
const copied = ref(false)

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const mcpUrl = computed(() => `${baseUrl}/mcp`)

const apiKeyPlaceholder = computed(() =>
  tenantStore.selectedKey ? `${tenantStore.selectedKey.keyPrefix}...` : 'YOUR_API_KEY'
)

const vscodeConfig = computed(() => ({
  servers: {
    'central-mcp': {
      type: 'http',
      url: mcpUrl.value,
      headers: {
        Authorization: `Bearer ${apiKeyPlaceholder.value}`,
      },
    },
  },
}))

const configJson = computed(() => JSON.stringify(vscodeConfig.value, null, 2))

async function copy() {
  await navigator.clipboard.writeText(configJson.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function download() {
  const blob = new Blob([configJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mcp.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <AppButton variant="secondary" size="sm" @click="showModal = true">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
      <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    VS Code config
  </AppButton>

  <AppModal :open="showModal" title="VS Code MCP Configuration" size="lg" @close="showModal = false">
    <div class="flex flex-col gap-4">
      <p class="text-sm" style="color: var(--text-secondary);">
        Add this to your workspace's <code class="px-1 py-0.5 rounded text-xs font-mono" style="background: var(--bg-muted);">.vscode/mcp.json</code> file to connect VS Code to your central-MCP server.
      </p>

      <div class="rounded-lg overflow-hidden border" style="border-color: var(--border-default);">
        <div class="flex items-center justify-between px-4 py-2 border-b" style="background: var(--bg-muted); border-color: var(--border-default);">
          <span class="text-xs font-mono" style="color: var(--text-secondary);">.vscode/mcp.json</span>
          <button
            @click="copy"
            class="text-xs flex items-center gap-1.5 transition-colors"
            :style="copied ? 'color: #22c55e' : 'color: var(--text-tertiary)'"
          >
            <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <pre class="px-4 py-4 text-xs overflow-x-auto font-mono leading-relaxed" style="background: var(--bg-surface); color: var(--text-primary);">{{ configJson }}</pre>
      </div>

      <div class="rounded-lg p-3 border text-xs" style="background: var(--bg-muted); border-color: var(--border-default); color: var(--text-secondary);">
        <p class="font-medium mb-1" style="color: var(--text-primary);">How to use</p>
        <ol class="list-decimal list-inside flex flex-col gap-1.5">
          <li>Go to <router-link to="/keys" class="text-blue-500 hover:underline" @click="showModal = false">API Keys</router-link> and create a key for this tenant. <span class="font-medium" style="color: var(--text-primary);">Copy it immediately</span> — it is shown only once.</li>
          <li>Replace <code class="font-mono px-1 rounded" style="background: var(--bg-surface);">{{ apiKeyPlaceholder }}</code> in the config above with your actual key.</li>
          <li>Save the file as <code class="font-mono px-1 rounded" style="background: var(--bg-surface);">.vscode/mcp.json</code> in your project root.</li>
          <li>VS Code will automatically detect the central-MCP server and expose all your configured tools.</li>
        </ol>
      </div>
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="showModal = false">Close</AppButton>
      <AppButton @click="download">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Download mcp.json
      </AppButton>
    </template>
  </AppModal>
</template>
