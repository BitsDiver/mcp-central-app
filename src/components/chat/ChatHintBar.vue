<script setup lang="ts">
    import ModelSelector from '@/components/chat/ModelSelector.vue';
    import ContextRing from '@/components/chat/ContextRing.vue';

    defineProps<{
        usedTokens: number;
        contextUsage: number;
        contextSize: number;
        toolCount: number;
    }>();
</script>

<template>
    <div class="input-hint">
        <ModelSelector />
        <span class="hint-sep">·</span>
        <ContextRing v-if="usedTokens > 0 && contextUsage > 0" :usage="contextUsage" :size="14" />
        <span>ctx {{ contextSize.toLocaleString() }}</span>
        <template v-if="toolCount > 0">
            <span class="hint-sep">·</span>
            <span>{{ toolCount }} tool{{ toolCount !== 1 ? 's' : '' }}</span>
        </template>
    </div>
</template>

<style scoped>
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
