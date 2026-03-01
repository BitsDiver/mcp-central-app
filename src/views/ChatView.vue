<script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import ChatSessionList from '@/components/chat/ChatSessionList.vue';
  import ChatInput from '@/components/chat/ChatInput.vue';
  import ChatTopBar from '@/components/chat/ChatTopBar.vue';
  import ChatSessionPromptBar from '@/components/chat/ChatSessionPromptBar.vue';
  import ChatMessagesArea from '@/components/chat/ChatMessagesArea.vue';
  import ChatErrorBanner from '@/components/chat/ChatErrorBanner.vue';
  import { useChatStore } from '@/stores/chat';
  import { useChatSettingsStore } from '@/stores/chatSettings';
  import { useToolStore } from '@/stores/tools';
  import { useTenantStore } from '@/stores/tenant';
  import { useChatGeneration } from '@/composables/useChatGeneration';
  import { useChatMcpSession } from '@/composables/useChatMcpSession';
  import { useSidebarResize } from '@/composables/useSidebarResize';

  // ── Stores ─────────────────────────────────────────────────
  const chatStore = useChatStore();
  const settingsStore = useChatSettingsStore();
  const toolStore = useToolStore();
  const tenantStore = useTenantStore();

  // ── UI state ───────────────────────────────────────────────
  const linkToTenant = ref(false);
  const showSessionPrompt = ref(false);

  // ── Composables ────────────────────────────────────────────
  const { sidebarOpen, sidebarWidth, startSidebarResize } = useSidebarResize();
  const { chatKeyReady } = useChatMcpSession();

  const messagesArea = ref<InstanceType<typeof ChatMessagesArea> | null>(null);

  function scrollToBottom(smooth = false) {
    messagesArea.value?.scrollToBottom(smooth);
  }

  const {
    isGenerating,
    stop,
    generationError,
    usedTokens,
    contextUsage,
    handleSend,
    handleRetry,
  } = useChatGeneration(chatKeyReady, linkToTenant, scrollToBottom);

  // ── Derived data ───────────────────────────────────────────
  const session = computed(() => chatStore.activeSession);
  const messages = computed(() => session.value?.messages ?? []);

  const isConfigured = computed(() => {
    const p = settingsStore.settings.provider ?? 'ollama';
    if (p === 'ollama') return !!settingsStore.settings.ollamaUrl && !!settingsStore.settings.selectedModel;
    return !!settingsStore.settings.selectedModel;
  });

  // ── Scroll management ─────────────────────────────────────
  watch(() => messages.value.length, () => scrollToBottom(true));
  watch(
    () => chatStore.activeSessionId,
    () => {
      usedTokens.value = 0;
      nextTick(() => scrollToBottom(false));
    },
  );
  onMounted(() => scrollToBottom(false));

  // ── Session actions ────────────────────────────────────────
  function newChat() {
    const tenantId = linkToTenant.value ? tenantStore.selectedTenant?.id ?? null : null;
    chatStore.createSession(tenantId);
    nextTick(() => scrollToBottom(false));
  }

  function handleSelectSession(id: string) {
    chatStore.selectSession(id);
  }

  function handleDeleteSession(id: string) {
    chatStore.deleteSession(id);
  }

  // ── Computed helpers ───────────────────────────────────────
  const filteredSessions = computed(() => {
    if (!linkToTenant.value || !tenantStore.selectedTenant) return chatStore.sortedSessions;
    return chatStore.sortedSessions.filter(
      (s) => !s.tenantId || s.tenantId === tenantStore.selectedTenant!.id,
    );
  });

  const retryableIds = computed<Set<string>>(() => {
    const set = new Set<string>();
    const msgs = messages.value;
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === 'user' && msgs[i + 1]?.error) set.add(msgs[i].id);
    }
    const last = msgs[msgs.length - 1];
    const prev = msgs[msgs.length - 2];
    if (prev?.role === 'user' && last?.error) set.add(prev.id);
    return set;
  });
</script>

<template>
  <AppLayout>
    <div class="chat-layout">
      <!-- ── Sidebar ────────────────────────────────────── -->
      <div :class="['chat-sidebar', { 'sidebar-hidden': !sidebarOpen }]"
        :style="sidebarOpen ? `width: ${sidebarWidth}px` : ''">
        <ChatSessionList :sessions="filteredSessions" :active-id="chatStore.activeSessionId"
          :active-tenant-id="tenantStore.selectedTenant?.id" @select="handleSelectSession" @delete="handleDeleteSession"
          @new="newChat" />
        <div v-if="sidebarOpen" class="resize-handle" @mousedown="startSidebarResize" />
      </div>

      <!-- ── Main area ──────────────────────────────────── -->
      <div class="chat-main">
        <ChatTopBar :session="session" :sidebar-open="sidebarOpen" :show-session-prompt="showSessionPrompt"
          :link-to-tenant="linkToTenant" @update:sidebar-open="sidebarOpen = $event"
          @update:show-session-prompt="showSessionPrompt = $event" @update:link-to-tenant="linkToTenant = $event" />

        <ChatSessionPromptBar :session="session" :visible="showSessionPrompt" />

        <!-- Config warning (inline — too small to warrant its own file) -->
        <div v-if="!isConfigured" class="config-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <template v-if="settingsStore.settings.provider === 'ollama' || !settingsStore.settings.provider">
            <span>Ollama is not configured. <router-link to="/settings" class="warning-link">Open Settings</router-link>
              to set up your server URL and model.</span>
          </template>
          <template v-else>
            <span>No model selected for {{ settingsStore.settings.provider.charAt(0).toUpperCase() +
              settingsStore.settings.provider.slice(1) }}.
              <router-link to="/settings" class="warning-link">Open Settings</router-link> to select a model.</span>
          </template>
        </div>

        <ChatMessagesArea ref="messagesArea" :messages="messages" :retryable-ids="retryableIds"
          :tool-count="toolStore.tools.length" :selected-model="settingsStore.settings.selectedModel"
          @retry="handleRetry" />

        <ChatErrorBanner v-if="generationError" :error="generationError" @dismiss="generationError = null" />

        <div class="input-area">
          <ChatInput :disabled="!isConfigured" :is-generating="isGenerating"
            :context-usage="usedTokens > 0 ? contextUsage : undefined"
            :context-tokens="usedTokens > 0 ? usedTokens : undefined" :context-size="settingsStore.settings.contextSize"
            :tool-count="toolStore.tools.length" @send="(c, a, m) => handleSend(c, a, m)" @stop="stop" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
  .chat-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  .chat-sidebar {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-default);
    overflow: hidden;
    transition: width 0.2s ease, opacity 0.2s ease;
    background: var(--bg-sidebar);
    position: relative;
  }

  .sidebar-hidden {
    width: 0;
    opacity: 0;
    pointer-events: none;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .config-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--color-warning-50);
    color: var(--color-warning-700);
    font-size: 13px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-warning-100);
  }

  [data-theme="dark"] .config-warning {
    background: rgba(245, 158, 11, 0.08);
    color: var(--color-warning-500);
    border-color: rgba(245, 158, 11, 0.15);
  }

  .warning-link {
    font-weight: 600;
    text-decoration: underline;
    color: inherit;
  }

  /* ── Resize handle ──────────────────────────────────────────── */
  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    z-index: 5;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 32px;
    border-radius: 1px;
    background: var(--border-default);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .resize-handle:hover::after {
    opacity: 1;
  }

  .input-area {
    padding: 12px 16px 16px;
    flex-shrink: 0;
    max-width: 760px;
    width: 100%;
    margin: 0 auto;
    align-self: center;
  }
</style>
