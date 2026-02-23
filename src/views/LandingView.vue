<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { useDarkMode } from '@/composables/useDarkMode'
import AppButton from '@/components/ui/AppButton.vue'

const { loginWithRedirect, isLoading } = useAuth0()
const { isDark, toggle } = useDarkMode()

function login() {
  loginWithRedirect()
}
</script>

<template>
  <div class="min-h-dvh flex flex-col" style="background: var(--bg-base);">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style="background: radial-gradient(circle, #3b82f6, transparent);" />
      <div class="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-8 blur-3xl" style="background: radial-gradient(circle, #22c55e, transparent);" />
    </div>

    <header class="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="font-semibold text-sm" style="color: var(--text-primary);">MCP Central</span>
      </div>
      <button
        @click="toggle"
        class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style="color: var(--text-secondary);"
        :class="'hover:bg-[var(--bg-hover)]'"
      >
        <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </header>

    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border" style="background: var(--bg-muted); color: var(--text-secondary); border-color: var(--border-default);">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />
        Model Context Protocol Proxy
      </div>

      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-2xl leading-tight" style="color: var(--text-primary);">
        One endpoint.<br />
        <span class="text-blue-500">All your MCP servers.</span>
      </h1>

      <p class="text-lg max-w-lg mb-10 leading-relaxed" style="color: var(--text-secondary);">
        Aggregate multiple MCP servers behind a single authenticated proxy. Manage endpoints, monitor connections, and control API keys — all in one place.
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-3">
        <AppButton size="lg" :loading="isLoading" @click="login">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
          </svg>
          Sign in to continue
        </AppButton>
      </div>
    </main>

    <footer class="relative z-10 px-6 py-5 text-center">
      <p class="text-xs" style="color: var(--text-tertiary);">MCP Central &mdash; Powered by Model Context Protocol</p>
    </footer>
  </div>
</template>
