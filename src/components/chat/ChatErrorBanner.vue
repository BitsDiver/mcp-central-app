<script setup lang="ts">
    import { CircleAlert, X } from 'lucide-vue-next';

    defineProps<{
        error: string;
    }>();

    defineEmits<{
        dismiss: [];
    }>();
</script>

<template>
    <div class="error-banner">
        <CircleAlert :size="14" :stroke-width="2" />
        <span>{{ error }}</span>
        <button type="button" class="error-dismiss" @click="$emit('dismiss')">
            <X :size="12" :stroke-width="2.5" />
        </button>
    </div>
</template>

<style scoped>
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
</style>
