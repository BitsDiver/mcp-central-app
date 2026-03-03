<script setup lang="ts">
  import { useAuth0 } from '@auth0/auth0-vue';
  import { useDarkMode } from '@/composables/useDarkMode';
  import AppButton from '@/components/ui/AppButton.vue';
  import { Layers, Sun, Moon, LogIn } from 'lucide-vue-next';

  const { loginWithRedirect, isLoading } = useAuth0();
  const { isDark, toggle } = useDarkMode();

  function login() {
    loginWithRedirect();
  }
</script>

<template>
  <div class="min-h-dvh flex flex-col" style="background: var(--bg-base);">
    <!-- Fork me on GitHub ribbon -->
    <a href="https://github.com/BitsDiver/mcp-central" target="_blank" rel="noopener noreferrer" class="github-ribbon"
      aria-label="Fork me on GitHub">
      <span>Fork me on GitHub</span>
    </a>

    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style="background: radial-gradient(circle, #3b82f6, transparent);" />
      <div class="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-8 blur-3xl"
        style="background: radial-gradient(circle, #22c55e, transparent);" />
    </div>

    <header class="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Layers :size="18" color="white" :stroke-width="2.5" />
        </div>
        <span class="font-semibold text-sm" style="color: var(--text-primary);">MCP Central</span>
      </div>
      <div class="flex items-center gap-3">
        <button @click="toggle" class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          style="color: var(--text-secondary);" :class="'hover:bg-[var(--bg-hover)]'">
          <Sun v-if="isDark" :size="18" :stroke-width="2" />
          <Moon v-else :size="18" :stroke-width="2" />
        </button>
      </div>
    </header>

    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
        style="background: var(--bg-muted); color: var(--text-secondary); border-color: var(--border-default);">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />
        Model Context Protocol Proxy
      </div>

      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-2xl leading-tight"
        style="color: var(--text-primary);">
        One endpoint.<br />
        <span class="text-blue-500">All your MCP servers.</span>
      </h1>

      <p class="text-lg max-w-lg mb-10 leading-relaxed" style="color: var(--text-secondary);">
        Aggregate multiple MCP servers (local, private or public) behind a single authenticated proxy. Manage endpoints,
        monitor connections, and control API keys — all in one place.
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-3">
        <AppButton size="lg" :loading="isLoading" @click="login">
          <LogIn :size="16" :stroke-width="2" />
          Sign in to continue
        </AppButton>
      </div>
    </main>

    <footer class="relative z-10 px-6 py-5 text-center">
      <p class="text-xs" style="color: var(--text-tertiary);">MCP Central &mdash; Powered with ❤️ by <a
          href="https://lagarde-cyber.com" target="_blank" rel="noopener noreferrer">LaGarde Cyber</a></p>
    </footer>
  </div>
</template>

<style scoped>
  .github-ribbon {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 50;
    width: 150px;
    height: 150px;
    overflow: hidden;
    pointer-events: none;
  }

  .github-ribbon span {
    position: absolute;
    display: block;
    width: 225px;
    padding: 6px 0;
    background: #181717;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-align: center;
    text-decoration: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
    cursor: pointer;
    /* position the ribbon diagonally */
    top: 38px;
    right: -58px;
    transform: rotate(45deg);
  }

  .github-ribbon span:hover {
    background: #333;
  }
</style>
