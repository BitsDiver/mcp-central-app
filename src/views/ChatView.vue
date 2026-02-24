<script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import ChatSessionList from '@/components/chat/ChatSessionList.vue';
  import ChatMessage from '@/components/chat/ChatMessage.vue';
  import ChatInput from '@/components/chat/ChatInput.vue';
  import AppToggle from '@/components/ui/AppToggle.vue';
  import { useChatStore } from '@/stores/chat';
  import { useChatSettingsStore } from '@/stores/chatSettings';
  import { useToolStore } from '@/stores/tools';
  import { useTenantStore } from '@/stores/tenant';
  import { useOllama } from '@/composables/useOllama';
  import { getChatKey, clearChatKey, storeChatKey } from '@/composables/useChatMcpKey';
  import { initMcpSession, resetMcpSession } from '@/api/mcpClient';
  import type { ChatMessage as ChatMessageType, ChatAttachment, ChatToolCall } from '@/types';

  const chatStore = useChatStore();
  const settingsStore = useChatSettingsStore();
  const toolStore = useToolStore();
  const tenantStore = useTenantStore();
  const { isGenerating, generate, stop } = useOllama();

  const messagesContainer = ref<HTMLElement | null>(null);
  const sidebarOpen = ref(true);
  const linkToTenant = ref(false);
  const generationError = ref<string | null>(null);

  /** True once a valid MCP session has been initialised for the active tenant */
  const chatKeyReady = ref(false);
  const isEnablingTools = ref(false);

  // Re-init MCP session whenever the active tenant changes
  watch(
    () => tenantStore.selectedTenant?.id,
    async (tenantId) => {
      resetMcpSession();
      chatKeyReady.value = false;
      if (!tenantId) return;
      const stored = getChatKey(tenantId);
      if (!stored) return;
      try {
        await initMcpSession(stored.key);
        chatKeyReady.value = true;
      } catch {
        // Key was revoked server-side — clear stale entry and show safeguard
        clearChatKey(tenantId);
      }
    },
    { immediate: true },
  );

  async function enableChatTools() {
    const tenant = tenantStore.selectedTenant;
    if (!tenant) return;
    isEnablingTools.value = true;
    generationError.value = null;
    try {
      const newKey = await tenantStore.createKey(`${tenant.name} — AI Chat`);
      storeChatKey(tenant.id, newKey.id, newKey.key);
      await initMcpSession(newKey.key);
      chatKeyReady.value = true;
    } catch (err) {
      generationError.value = err instanceof Error ? err.message : String(err);
    } finally {
      isEnablingTools.value = false;
    }
  }

  const session = computed(() => chatStore.activeSession);
  const messages = computed(() => session.value?.messages ?? []);

  const isConfigured = computed(
    () => !!settingsStore.settings.ollamaUrl && !!settingsStore.settings.selectedModel,
  );

  function scrollToBottom(smooth = false) {
    nextTick(() => {
      const el = messagesContainer.value;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  watch(
    () => messages.value.length,
    () => scrollToBottom(true),
  );

  watch(
    () => chatStore.activeSessionId,
    () => nextTick(() => scrollToBottom(false)),
  );

  onMounted(() => {
    scrollToBottom(false);
  });

  function generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function ensureActiveSession(): string {
    if (!chatStore.activeSessionId) {
      const tenantId = linkToTenant.value ? tenantStore.selectedTenant?.id ?? null : null;
      chatStore.createSession(tenantId);
    }
    return chatStore.activeSessionId!;
  }

  async function handleSend(content: string, attachments: ChatAttachment[]) {
    if (!isConfigured.value) return;
    generationError.value = null;

    const sessionId = ensureActiveSession();

    const userMsg: ChatMessageType = {
      id: generateId(),
      role: 'user',
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toISOString(),
    };
    chatStore.addMessage(sessionId, userMsg);

    const assistantId = generateId();
    const assistantMsg: ChatMessageType = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    chatStore.addMessage(sessionId, assistantMsg);
    scrollToBottom(true);

    const allMessages = [...chatStore.activeSession!.messages.filter((m) => !m.isStreaming || m.id === assistantId)];

    let activeTcMessage: ChatMessageType | null = null;

    await generate({
      ollamaUrl: settingsStore.settings.ollamaUrl,
      model: settingsStore.settings.selectedModel,
      contextSize: settingsStore.settings.contextSize,
      systemPrompt: settingsStore.settings.systemPrompt || undefined,
      messages: allMessages.slice(0, -1),
      tools: chatKeyReady.value ? toolStore.tools : [],

      onToken(text, thinking) {
        chatStore.updateMessage(sessionId, assistantId, {
          content: text,
          thinking: thinking || undefined,
          isStreaming: true,
        });
        scrollToBottom(false);
      },

      async onToolCall(toolCall: ChatToolCall) {
        if (!activeTcMessage) {
          activeTcMessage = {
            id: generateId(),
            role: 'tool',
            content: '',
            toolCalls: [],
            createdAt: new Date().toISOString(),
          };
          chatStore.addMessage(sessionId, activeTcMessage);
        }

        const existing = activeTcMessage.toolCalls?.find((tc) => tc.id === toolCall.id);
        if (existing) {
          Object.assign(existing, toolCall);
          chatStore.persist();
        } else {
          activeTcMessage.toolCalls = [...(activeTcMessage.toolCalls ?? []), toolCall];
          chatStore.updateMessage(sessionId, activeTcMessage.id, {
            toolCalls: activeTcMessage.toolCalls,
          });
        }

        if (toolCall.status === 'success' || toolCall.status === 'error') {
          activeTcMessage = null;
          const nextAssistId = generateId();
          const nextAssist: ChatMessageType = {
            id: nextAssistId,
            role: 'assistant',
            content: '',
            isStreaming: true,
            createdAt: new Date().toISOString(),
          };
          chatStore.addMessage(sessionId, nextAssist);
          scrollToBottom(true);
        }
      },

      onDone(finalContent, finalThinking) {
        const lastAssistant = [...chatStore.activeSession!.messages]
          .reverse()
          .find((m) => m.role === 'assistant' && m.isStreaming);
        if (lastAssistant) {
          chatStore.updateMessage(sessionId, lastAssistant.id, {
            content: finalContent,
            thinking: finalThinking || undefined,
            isStreaming: false,
          });
        }
        scrollToBottom(true);
      },

      onError(err) {
        generationError.value = err;
        chatStore.updateMessage(sessionId, assistantId, { isStreaming: false });
      },
    });
  }

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

  const filteredSessions = computed(() => {
    if (!linkToTenant.value || !tenantStore.selectedTenant) {
      return chatStore.sortedSessions;
    }
    return chatStore.sortedSessions.filter(
      (s) => !s.tenantId || s.tenantId === tenantStore.selectedTenant!.id,
    );
  });
</script>

<template>
  <AppLayout>
    <div class="chat-layout">
      <div :class="['chat-sidebar', { 'sidebar-hidden': !sidebarOpen }]">
        <ChatSessionList :sessions="filteredSessions" :active-id="chatStore.activeSessionId"
          :active-tenant-id="tenantStore.selectedTenant?.id" @select="handleSelectSession" @delete="handleDeleteSession"
          @new="newChat" />
      </div>

      <div class="chat-main">
        <div class="chat-topbar">
          <button type="button" class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen"
            :title="sidebarOpen ? 'Hide sessions' : 'Show sessions'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round" />
            </svg>
          </button>

          <div class="topbar-center">
            <span v-if="session" class="session-title-display">{{ session.title }}</span>
            <span v-else class="session-title-display muted">New conversation</span>
          </div>

          <div class="topbar-right">
            <div class="tenant-link-toggle">
              <span class="toggle-label">Link to tenant</span>
              <AppToggle :model-value="linkToTenant" @update:model-value="linkToTenant = $event" />
            </div>
          </div>
        </div>

        <!-- AI tools safeguard: shown when tools exist but no MCP session yet -->
        <div v-if="!chatKeyReady && toolStore.tools.length > 0" class="tools-safeguard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round" />
          </svg>
          <span>
            <strong>{{ toolStore.tools.length }} tool{{ toolStore.tools.length !== 1 ? 's' : '' }} available</strong>
            — enable AI tools to let the model use them in this session.
          </span>
          <button type="button" class="safeguard-btn" :disabled="isEnablingTools" @click="enableChatTools">
            <svg v-if="isEnablingTools" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" class="animate-spin">
              <path d="M21 12a9 9 0 11-6.22-8.56" stroke-linecap="round" />
            </svg>
            {{ isEnablingTools ? 'Connecting…' : 'Enable AI tools' }}
          </button>
        </div>

        <div v-if="!isConfigured" class="config-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Ollama is not configured. <router-link to="/settings" class="warning-link">Open Settings</router-link>
            to set up your server URL and model.</span>
        </div>

        <div ref="messagesContainer" class="messages-area">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <p class="empty-title">Start a conversation</p>
            <p class="empty-sub">
              <template v-if="toolStore.tools.length > 0">
                {{ toolStore.tools.length }} tool{{ toolStore.tools.length !== 1 ? 's' : '' }} available
              </template>
              <template v-else>
                No tools loaded
              </template>
              <span v-if="settingsStore.settings.selectedModel"> · {{ settingsStore.settings.selectedModel }}</span>
            </p>
          </div>

          <div v-else class="messages-list">
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />
          </div>
        </div>

        <div v-if="generationError" class="error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
          </svg>
          <span>{{ generationError }}</span>
          <button type="button" class="error-dismiss" @click="generationError = null">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="input-area">
          <ChatInput :disabled="!isConfigured" :is-generating="isGenerating" @send="handleSend" @stop="stop" />
          <p class="input-hint">
            <span v-if="settingsStore.settings.selectedModel">{{ settingsStore.settings.selectedModel }}</span>
            <span v-else style="color: var(--color-warning-600)">No model selected</span>
            <span class="hint-sep">·</span>
            ctx {{ settingsStore.settings.contextSize.toLocaleString() }}
            <span v-if="toolStore.tools.length > 0">
              <span class="hint-sep">·</span>
              {{ toolStore.tools.length }} tool{{ toolStore.tools.length !== 1 ? 's' : '' }}
            </span>
          </p>
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

  .chat-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    background: var(--bg-surface);
  }

  .sidebar-toggle {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: all 0.12s ease;
  }

  .sidebar-toggle:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .topbar-center {
    flex: 1;
    min-width: 0;
  }

  .session-title-display {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  .session-title-display.muted {
    color: var(--text-tertiary);
    font-weight: 400;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .tenant-link-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
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

  .tools-safeguard {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: color-mix(in srgb, #6366f1 6%, var(--bg-surface));
    color: var(--text-secondary);
    font-size: 13px;
    flex-shrink: 0;
    border-bottom: 1px solid color-mix(in srgb, #6366f1 20%, transparent);
  }

  [data-theme="dark"] .tools-safeguard {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
  }

  .safeguard-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, #6366f1 40%, transparent);
    background: color-mix(in srgb, #6366f1 10%, transparent);
    color: #6366f1;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.12s ease;
    flex-shrink: 0;
  }

  .safeguard-btn:hover:not(:disabled) {
    background: color-mix(in srgb, #6366f1 18%, transparent);
  }

  .safeguard-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .warning-link {
    font-weight: 600;
    text-decoration: underline;
    color: inherit;
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
  }

  .empty-chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
  }

  .empty-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full);
    background: var(--bg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .empty-sub {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 760px;
    width: 100%;
    margin: 0 auto;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--color-danger-50);
    color: var(--color-danger-700);
    font-size: 13px;
    flex-shrink: 0;
  }

  [data-theme="dark"] .error-banner {
    background: rgba(239, 68, 68, 0.08);
    color: var(--color-danger-500);
  }

  .error-dismiss {
    margin-left: auto;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    cursor: pointer;
    color: inherit;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .input-area {
    padding: 12px 16px 16px;
    flex-shrink: 0;
    max-width: 760px;
    width: 100%;
    margin: 0 auto;
    align-self: center;
  }

  .input-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--text-tertiary);
    margin: 6px 0 0;
    padding: 0 4px;
  }

  .hint-sep {
    opacity: 0.4;
  }
</style>
