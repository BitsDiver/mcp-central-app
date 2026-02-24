import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ChatSession, ChatMessage } from "@/types";

const STORAGE_KEY = "mcp-chat-sessions";

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = defineStore("chat", () => {
  const sessions = ref<ChatSession[]>(loadSessions());
  const activeSessionId = ref<string | null>(sessions.value[0]?.id ?? null);

  const sortedSessions = computed(() =>
    [...sessions.value].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );

  const activeSession = computed(
    () => sessions.value.find((s) => s.id === activeSessionId.value) ?? null,
  );

  function createSession(tenantId?: string | null): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      title: "New conversation",
      tenantId: tenantId ?? null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.value.unshift(session);
    activeSessionId.value = session.id;
    saveSessions(sessions.value);
    return session;
  }

  function selectSession(id: string): void {
    activeSessionId.value = id;
  }

  function deleteSession(id: string): void {
    sessions.value = sessions.value.filter((s) => s.id !== id);
    if (activeSessionId.value === id) {
      activeSessionId.value = sortedSessions.value[0]?.id ?? null;
    }
    saveSessions(sessions.value);
  }

  function renameSession(id: string, title: string): void {
    const session = sessions.value.find((s) => s.id === id);
    if (session) {
      session.title = title;
      session.updatedAt = new Date().toISOString();
      saveSessions(sessions.value);
    }
  }

  function addMessage(sessionId: string, message: ChatMessage): void {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    if (session.messages.length === 1 && message.role === "user") {
      session.title =
        message.content.slice(0, 60) + (message.content.length > 60 ? "…" : "");
    }
    saveSessions(sessions.value);
  }

  function updateMessage(
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ): void {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return;
    const msg = session.messages.find((m) => m.id === messageId);
    if (msg) {
      Object.assign(msg, patch);
      session.updatedAt = new Date().toISOString();
      saveSessions(sessions.value);
    }
  }

  function clearSession(sessionId: string): void {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session) {
      session.messages = [];
      session.updatedAt = new Date().toISOString();
      saveSessions(sessions.value);
    }
  }

  function persist(): void {
    saveSessions(sessions.value);
  }

  /** Remove all messages that come AFTER the message with the given id (keep it). */
  function removeMessagesAfter(sessionId: string, afterMsgId: string): void {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return;
    const idx = session.messages.findIndex((m) => m.id === afterMsgId);
    if (idx < 0) return;
    session.messages = session.messages.slice(0, idx + 1);
    session.updatedAt = new Date().toISOString();
    saveSessions(sessions.value);
  }

  function setSessionPrompt(id: string, prompt: string): void {
    const session = sessions.value.find((s) => s.id === id);
    if (!session) return;
    session.systemPrompt = prompt || undefined;
    session.updatedAt = new Date().toISOString();
    saveSessions(sessions.value);
  }

  return {
    sessions,
    sortedSessions,
    activeSessionId,
    activeSession,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    addMessage,
    updateMessage,
    clearSession,
    setSessionPrompt,
    persist,
    removeMessagesAfter,
  };
});
