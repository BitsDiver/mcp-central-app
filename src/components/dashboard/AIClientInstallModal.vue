<script setup lang="ts">
  import { ref, computed, watch, markRaw } from 'vue';
  import { ChevronLeft, Check, TriangleAlert, Info, Copy, KeyRound, Loader2, Download } from 'lucide-vue-next';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import { AI_CLIENTS } from '@/data/aiClients';
  import type { AiClient, OsKey } from '@/data/aiClients';
  import { useTenantStore } from '@/stores/tenant';

  import IconVSCode from '@/components/icons/IconVSCode.vue';
  import IconCursor from '@/components/icons/IconCursor.vue';
  import IconWindsurf from '@/components/icons/IconWindsurf.vue';
  import IconZed from '@/components/icons/IconZed.vue';
  import IconCline from '@/components/icons/IconCline.vue';
  import IconJetBrains from '@/components/icons/IconJetBrains.vue';
  import IconOpenWebUI from '@/components/icons/IconOpenWebUI.vue';
  import IconAntigravity from '@/components/icons/IconAntigravity.vue';

  const props = defineProps<{ open: boolean; }>();
  defineEmits<{ close: []; }>();

  // ── Icon registry ──────────────────────────────────────────────────────────
  const ICONS: Record<string, object> = {
    vscode: markRaw(IconVSCode),
    cursor: markRaw(IconCursor),
    windsurf: markRaw(IconWindsurf),
    zed: markRaw(IconZed),
    cline: markRaw(IconCline),
    jetbrains: markRaw(IconJetBrains),
    openwebui: markRaw(IconOpenWebUI),
    antigravity: markRaw(IconAntigravity),
  };

  // ── Store / env ────────────────────────────────────────────────────────────
  const tenantStore = useTenantStore();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ── State ──────────────────────────────────────────────────────────────────
  const step = ref<'select' | 'instructions'>('select');
  const selectedClientId = ref<string | null>(null);
  const os = ref<OsKey>('macos');
  const generatedKey = ref<string | null>(null);
  const isGenerating = ref(false);
  const copiedJson = ref(false);
  const copiedStepIndex = ref<number | null>(null);

  // Reset volatile state when modal opens; go back to grid on close.
  watch(
    () => props.open,
    (val) => {
      if (val) {
        generatedKey.value = null;
        copiedJson.value = false;
        copiedStepIndex.value = null;
      } else {
        step.value = 'select';
      }
    },
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedClient = computed<AiClient | null>(
    () => AI_CLIENTS.find((c) => c.id === selectedClientId.value) ?? null,
  );

  const hasExistingKeys = computed(() => tenantStore.apiKeys.length > 0);

  const displayKey = computed(
    () =>
      generatedKey.value ??
      (tenantStore.selectedKey ? `${tenantStore.selectedKey.keyPrefix}…` : 'YOUR_API_KEY'),
  );

  const isKeyReal = computed(() => generatedKey.value !== null);

  const configJson = computed(() => {
    const client = selectedClient.value;
    if (!client || client.configType !== 'json-file') return '';
    return client.generateConfig(displayKey.value, baseUrl);
  });

  const currentConfigPath = computed(() => {
    const client = selectedClient.value;
    if (!client || client.configType !== 'json-file') return '';
    return client.configPaths[os.value];
  });

  const guiSteps = computed(() => {
    const client = selectedClient.value;
    if (!client || client.configType !== 'gui') return [];
    return client.guiSteps(displayKey.value, baseUrl);
  });

  const modalTitle = computed(() =>
    step.value === 'select' ? 'Connect AI client' : undefined,
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  function continueToInstructions() {
    if (!selectedClientId.value) return;
    step.value = 'instructions';
  }

  function goBack() {
    step.value = 'select';
    generatedKey.value = null;
    copiedJson.value = false;
    copiedStepIndex.value = null;
  }

  async function generateKey() {
    isGenerating.value = true;
    try {
      const label = selectedClient.value?.name ?? 'API Key';
      const newKey = hasExistingKeys.value
        ? await tenantStore.regenerateKey(tenantStore.apiKeys[0].id)
        : await tenantStore.createKey(label);
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

  async function copyStep(code: string, index: number) {
    await navigator.clipboard.writeText(code);
    copiedStepIndex.value = index;
    setTimeout(() => (copiedStepIndex.value = null), 2000);
  }

  function download() {
    const client = selectedClient.value;
    if (!client || client.configType !== 'json-file') return;
    const blob = new Blob([configJson.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = client.exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const OS_LABELS: Record<OsKey, string> = { macos: 'macOS', windows: 'Windows', linux: 'Linux' };
</script>

<template>
  <AppModal :open="open" :title="modalTitle" size="xl" @close="$emit('close')">

    <!-- ══════════════════════════════════════════════════════════════════════
         STEP 1 — Client selection grid
    ══════════════════════════════════════════════════════════════════════════ -->
    <template v-if="step === 'select'">
      <p class="text-sm mb-5" style="color: var(--text-secondary);">
        Select your AI client to get a ready-to-use configuration with a dedicated API key.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button v-for="client in AI_CLIENTS" :key="client.id" type="button"
          class="flex flex-col items-center gap-2.5 rounded-xl p-4 text-center transition-all duration-150 border-2"
          :style="selectedClientId === client.id
            ? 'border-color: var(--color-primary, #3b82f6); background: color-mix(in srgb, var(--color-primary, #3b82f6) 8%, var(--bg-surface));'
            : 'border-color: var(--border-default); background: var(--bg-surface);'"
          :class="selectedClientId === client.id ? '' : 'hover:border-[var(--border-strong)]'"
          @click="selectedClientId = client.id; continueToInstructions()">
          <!-- Check badge -->
          <span v-if="selectedClientId === client.id"
            class="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
            style="background: var(--color-primary, #3b82f6);">
            <Check :size="9" :stroke-width="2.5" stroke="white" />
          </span>

          <!-- Icon wrapper -->
          <div class="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 transition-colors"
            :style="`color: ${selectedClientId === client.id ? 'var(--color-primary, #3b82f6)' : client.brandColor};`">
            <component :is="ICONS[client.id]" class="w-8 h-8" />
          </div>

          <!-- Name + tagline -->
          <div>
            <p class="text-sm font-semibold leading-tight" style="color: var(--text-primary);">{{ client.name }}</p>
            <p class="text-xs mt-0.5 leading-tight" style="color: var(--text-tertiary);">{{ client.tagline }}</p>
          </div>
        </button>
      </div>


    </template>

    <!-- ══════════════════════════════════════════════════════════════════════
         STEP 2 — Client-specific instructions
    ══════════════════════════════════════════════════════════════════════════ -->
    <template v-else-if="selectedClient">
      <!-- ── Instructions header ─ -->
      <div class="flex items-center gap-3 mb-5 pb-4 border-b" style="border-color: var(--border-default);">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :style="`color: ${selectedClient.brandColor}; background: color-mix(in srgb, ${selectedClient.brandColor} 12%, var(--bg-surface));`">
          <component :is="ICONS[selectedClient.id]" class="w-6 h-6" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold" style="color: var(--text-primary);">{{ selectedClient.name }}</h3>
          <p class="text-xs" style="color: var(--text-tertiary);">{{ selectedClient.tagline }}</p>
        </div>
        <button type="button" class="text-xs flex items-center gap-1 transition-colors"
          style="color: var(--text-tertiary);" @click="goBack">
          <ChevronLeft :size="13" :stroke-width="2.5" />
          Change client
        </button>
      </div>

      <!-- ════════════════ JSON-file client ════════════════ -->
      <div v-if="selectedClient.configType === 'json-file'" class="flex flex-col gap-4">

        <!-- OS tabs -->
        <div v-if="selectedClient.showOsPicker" class="flex items-center gap-1">
          <button v-for="(label, key) in OS_LABELS" :key="key" type="button"
            class="text-xs px-3 py-1.5 rounded-md font-medium transition-colors" :style="os === key
              ? 'background: var(--bg-muted); color: var(--text-primary); border: 1px solid var(--border-strong);'
              : 'background: transparent; color: var(--text-tertiary); border: 1px solid transparent;'"
            @click="os = key">
            {{ label }}
          </button>
        </div>

        <!-- File path -->
        <p class="text-xs">
          <span style="color: var(--text-secondary);">Config file: </span>
          <code class="font-mono px-1.5 py-0.5 rounded text-xs"
            style="background: var(--bg-muted); color: var(--text-primary);">{{ currentConfigPath }}</code>
          <span v-if="selectedClient.isSnippet" class="ml-2 text-xs" style="color: var(--text-tertiary);">(snippet —
            merge into existing file)</span>
        </p>

        <!-- Status banner: success -->
        <div v-if="isKeyReal" class="flex items-center gap-2 rounded-lg p-3 border text-sm"
          style="background: color-mix(in srgb, #22c55e 8%, var(--bg-surface)); border-color: color-mix(in srgb, #22c55e 30%, transparent); color: #15803d;">
          <Check :size="15" :stroke-width="2.5" class="shrink-0" />
          <span>Key generated — <strong>save it now, it will not be shown again.</strong></span>
        </div>

        <!-- Status banner: regenerate warning -->
        <div v-else-if="hasExistingKeys" class="flex gap-3 rounded-lg p-3 border text-sm"
          style="background: color-mix(in srgb, #f59e0b 8%, var(--bg-surface)); border-color: color-mix(in srgb, #f59e0b 30%, transparent);">
          <TriangleAlert class="shrink-0 mt-0.5" :size="16" stroke="#f59e0b" />
          <div style="color: #b45309;">
            <p class="font-medium mb-0.5" style="color: #92400e;">
              This will regenerate the key <em>{{ tenantStore.apiKeys[0].label }}</em>
            </p>
            Any existing installation using that key will lose access immediately.
            To add a client without breaking existing ones, create a new key from
            <router-link to="/settings/keys" class="underline font-medium" @click="$emit('close')">
              Settings → API Keys
            </router-link>.
          </div>
        </div>

        <!-- Status banner: first key -->
        <p v-else class="text-xs rounded-lg p-3 border"
          style="background: var(--bg-muted); border-color: var(--border-default); color: var(--text-secondary);">
          Click <strong style="color: var(--text-primary);">Generate key</strong> to create a dedicated
          API key and get the ready-to-paste configuration.
        </p>

        <!-- JSON code block -->
        <div class="rounded-lg overflow-hidden border" style="border-color: var(--border-default);">
          <div class="flex items-center justify-between px-3 py-2 border-b"
            style="background: var(--bg-muted); border-color: var(--border-default);">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono" style="color: var(--text-secondary);">{{ selectedClient.exportFilename
              }}</span>
              <span v-if="isKeyReal"
                class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                style="background: color-mix(in srgb, #22c55e 12%, transparent); color: #15803d;">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Live key
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                style="background: var(--bg-surface); color: var(--text-tertiary); border: 1px solid var(--border-default);">
                Preview
              </span>
            </div>
            <button @click="copyJson" class="flex items-center gap-1.5 text-xs transition-colors"
              :style="copiedJson ? 'color: #22c55e' : 'color: var(--text-tertiary)'">
              <Copy v-if="!copiedJson" :size="13" />
              <Check v-else :size="13" :stroke-width="2.5" />
              {{ copiedJson ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre class="px-4 py-4 text-xs overflow-x-auto font-mono leading-relaxed"
            style="background: var(--bg-surface); color: var(--text-primary);">{{ configJson }}</pre>
        </div>

        <!-- Config note (e.g. Windsurf serverUrl warning) -->
        <div v-if="selectedClient.configNote" class="flex gap-2 rounded-lg px-3 py-2.5 border text-xs"
          style="background: color-mix(in srgb, #3b82f6 6%, var(--bg-surface)); border-color: color-mix(in srgb, #3b82f6 25%, transparent); color: var(--text-secondary);">
          <Info class="shrink-0 mt-0.5" :size="13" stroke="#3b82f6" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span
            v-html="selectedClient.configNote.replace(/`([^`]+)`/g, '<code class=&quot;font-mono px-0.5&quot;>$1</code>')" />
        </div>

        <p class="text-xs" style="color: var(--text-tertiary);">
          Place the file at the path shown above. Your AI client will detect the server automatically.
        </p>
      </div>

      <!-- ════════════════ GUI client ════════════════ -->
      <div v-else-if="selectedClient.configType === 'gui'" class="flex flex-col gap-4">
        <p class="text-sm" style="color: var(--text-secondary);">
          Follow these steps to connect MCP Central in {{ selectedClient.name }}.
        </p>

        <!-- Key generation callout -->
        <div v-if="!isKeyReal" class="flex items-center gap-3 rounded-lg px-3 py-2.5 border text-xs" :style="hasExistingKeys
          ? 'background: color-mix(in srgb, #f59e0b 6%, var(--bg-surface)); border-color: color-mix(in srgb, #f59e0b 25%, transparent);'
          : 'background: var(--bg-muted); border-color: var(--border-default);'">
          <KeyRound class="shrink-0" :size="13" :stroke="hasExistingKeys ? '#f59e0b' : 'var(--text-tertiary)'" />
          <span style="color: var(--text-secondary);">
            <span v-if="hasExistingKeys" style="color: #92400e;">
              <strong>Generate key first</strong> — this will regenerate your existing key
              <em>{{ tenantStore.apiKeys[0].label }}</em>.
            </span>
            <span v-else>
              Click <strong style="color: var(--text-primary);">Generate key</strong> below to get your API key before
              following the steps.
            </span>
          </span>
        </div>

        <!-- Step list -->
        <ol class="flex flex-col gap-3">
          <li v-for="(s, i) in guiSteps" :key="i" class="flex flex-col gap-2">
            <div class="flex items-start gap-3">
              <!-- Step number badge -->
              <span class="shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                style="background: var(--bg-muted); color: var(--text-secondary); border: 1px solid var(--border-default);">
                {{ i + 1 }}
              </span>
              <!-- Step text (may contain HTML like <strong>, <code>, <kbd>) -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p class="text-sm leading-relaxed" style="color: var(--text-primary);" v-html="s.text" />
            </div>

            <!-- Optional code block -->
            <div v-if="s.code" class="ml-8 rounded-lg overflow-hidden border"
              style="border-color: var(--border-default);">
              <div class="flex items-center justify-between px-3 py-1.5 border-b"
                style="background: var(--bg-muted); border-color: var(--border-default);">
                <span class="text-xs font-mono" style="color: var(--text-secondary);">{{ s.codeLabel ?? 'JSON' }}</span>
                <button @click="copyStep(s.code!, i)" class="flex items-center gap-1.5 text-xs transition-colors"
                  :style="copiedStepIndex === i ? 'color: #22c55e' : 'color: var(--text-tertiary)'">
                  <Copy v-if="copiedStepIndex !== i" :size="12" />
                  <Check v-else :size="12" :stroke-width="2.5" />
                  {{ copiedStepIndex === i ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <pre class="px-3 py-3 text-xs overflow-x-auto font-mono leading-relaxed"
                style="background: var(--bg-surface); color: var(--text-primary);">{{ s.code }}</pre>
            </div>
          </li>
        </ol>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════════
         FOOTER
    ══════════════════════════════════════════════════════════════════════════ -->
    <template #footer>
      <AppButton variant="secondary" @click="$emit('close')">Close</AppButton>

      <!-- Step: instructions (json-file) — Generate key + Download -->
      <template v-if="step === 'instructions' && selectedClient?.configType === 'json-file'">
        <AppButton v-if="!isKeyReal" :disabled="isGenerating" @click="generateKey">
          <Loader2 v-if="isGenerating" :size="14" class="animate-spin" />
          <KeyRound v-else :size="14" />
          <span v-if="isGenerating">Generating…</span>
          <span v-else-if="hasExistingKeys">Regenerate key</span>
          <span v-else>Generate key</span>
        </AppButton>

        <AppButton v-else @click="download">
          <Download :size="14" />
          Download {{ selectedClient.exportFilename }}
        </AppButton>
      </template>

      <!-- Step: instructions (gui) — Generate key if not done yet -->
      <template v-if="step === 'instructions' && selectedClient?.configType === 'gui'">
        <AppButton v-if="!isKeyReal" :disabled="isGenerating" @click="generateKey">
          <Loader2 v-if="isGenerating" :size="14" class="animate-spin" />
          <KeyRound v-else :size="14" />
          <span v-if="isGenerating">Generating…</span>
          <span v-else-if="hasExistingKeys">Regenerate key</span>
          <span v-else>Generate key</span>
        </AppButton>
      </template>
    </template>

  </AppModal>
</template>
