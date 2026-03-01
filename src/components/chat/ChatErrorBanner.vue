<script setup lang="ts">
    defineProps<{
        error: string;
    }>();

    defineEmits<{
        dismiss: [];
    }>();
</script>

<template>
    <div class="error-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
        </svg>
        <span>{{ error }}</span>
        <button type="button" class="error-dismiss" @click="$emit('dismiss')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
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
