<script setup lang="ts">
    import { ref } from 'vue';

    const props = defineProps<{
        value: string;
    }>();

    const copied = ref(false);

    async function copy() {
        await navigator.clipboard.writeText(props.value);
        copied.value = true;
        setTimeout(() => (copied.value = false), 2000);
    }
</script>

<template>
    <div class="flex items-stretch text-xs font-mono rounded-lg border overflow-hidden"
        style="background: var(--bg-input); border-color: var(--border-default);">
        <!-- URL text -->
        <code class="flex-1 px-3 py-2 overflow-x-auto leading-5 select-all"
            style="color: var(--text-secondary);">{{ value }}</code>

        <!-- Copy button -->
        <div class="relative shrink-0 flex items-center">
            <!-- "Copied!" tooltip -->
            <Transition enter-active-class="transition-all duration-150" enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-100"
                leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-1">
                <span v-if="copied"
                    class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-sans font-medium whitespace-nowrap pointer-events-none z-10"
                    style="background: #1f2937; color: #fff;">
                    Copied!
                    <span class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                        style="background: #1f2937;" />
                </span>
            </Transition>

            <button type="button" title="Copy to clipboard"
                class="h-full px-3 border-l flex items-center transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                style="border-color: var(--border-default);" @click="copy">
                <!-- Check icon (copied state) -->
                <svg v-if="copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" style="color: #10b981;">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <!-- Clipboard icon (default state) -->
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.75" style="color: var(--text-tertiary);">
                    <rect x="9" y="2" width="6" height="4" rx="1" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M9 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2h-3" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>
        </div>
    </div>
</template>
