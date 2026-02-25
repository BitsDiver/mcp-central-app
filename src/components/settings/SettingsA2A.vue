<script setup lang="ts">
    import { computed } from 'vue';
    import CopyField from '@/components/ui/CopyField.vue';

    const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

    const publicCardUrl = computed(() => `${BASE_URL}/.well-known/agent-card.json`);
    const extendedCardUrl = computed(() => `${BASE_URL}/a2a/extendedAgentCard?apiKey=<your-api-key>`);
    const sendUrl = computed(() => `${BASE_URL}/a2a/message:send`);
    const streamUrl = computed(() => `${BASE_URL}/a2a/message:stream`);
</script>

<template>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto flex flex-col gap-8">
        <!-- Header -->
        <div>
            <h2 class="text-base font-semibold" style="color: var(--text-primary);">A2A Integration</h2>
            <p class="text-sm mt-1" style="color: var(--text-secondary);">
                mcp-central exposes an
                <a href="https://google.github.io/A2A/" target="_blank" rel="noopener noreferrer"
                    class="underline hover:opacity-80">A2A v1.0</a>
                HTTP+JSON server so external agents can discover and call the tools of any tenant.
            </p>
        </div>

        <!-- Public agent card -->
        <div class="card p-5 flex flex-col gap-3">
            <div>
                <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Public Agent Card</h3>
                <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                    Unauthenticated — announces that this server supports A2A with streaming and push
                    notifications. No tenant-specific skills are listed.
                </p>
            </div>
            <CopyField :value="publicCardUrl" />
        </div>

        <!-- Extended agent card -->
        <div class="card p-5 flex flex-col gap-3">
            <div>
                <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Extended Agent Card</h3>
                <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                    Authenticated — lists all skills (tools) available to the authenticated tenant.
                    Replace <code class="font-mono">&lt;your-api-key&gt;</code> with one of your API Keys.
                </p>
            </div>
            <CopyField :value="extendedCardUrl" />
            <p class="text-xs" style="color: var(--text-tertiary);">
                Authentication is also accepted via the
                <code class="font-mono">X-API-Key</code> or
                <code class="font-mono">Authorization: Bearer &lt;key&gt;</code> headers.
            </p>
        </div>

        <!-- Sending messages -->
        <div class="card p-5 flex flex-col gap-3">
            <div>
                <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Sending Messages</h3>
                <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                    External agents call tools by sending an A2A message to one of these endpoints.
                    The request body must contain a
                    <code class="font-mono">DataPart</code> (or a JSON
                    <code class="font-mono">TextPart</code>) with
                    <code class="font-mono">{ "tool": "&lt;namespace/name&gt;", "args": {{ '{}' }} }</code>.
                </p>
            </div>
            <div class="flex flex-col gap-2 text-xs font-mono" style="color: var(--text-secondary);">
                <div class="flex items-center gap-2">
                    <span class="badge badge-neutral shrink-0">POST</span>
                    <code class="px-2 py-1 rounded overflow-x-auto"
                        style="background: var(--bg-muted);">{{ sendUrl }}</code>
                    <span style="color: var(--text-tertiary);">— blocking, returns completed Task</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="badge badge-neutral shrink-0">POST</span>
                    <code class="px-2 py-1 rounded overflow-x-auto"
                        style="background: var(--bg-muted);">{{ streamUrl }}</code>
                    <span style="color: var(--text-tertiary);">— SSE stream (working → artifact → completed)</span>
                </div>
            </div>
        </div>
    </div>
</template>
