<script setup lang="ts">
/**
 * PssToastContainer — the visible widget that renders the global toast
 * queue from `useToast()`.
 *
 * Jira: DART-62.
 *
 * Mount once in the root layout (`app/layouts/app.vue`). Stacks toasts
 * bottom-right on desktop, bottom-centre on mobile (thumb reach).
 * Tailwind classes only — no extra dependencies.
 */
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-vue-next';
import { useToast, type Toast } from '~/composables/useToast';

const { list, dismiss } = useToast();

const VARIANT_STYLES: Record<Toast['variant'], { ring: string; icon: typeof Info }> = {
  info:    { ring: 'ring-sky-400/40    bg-sky-500/10    text-sky-100',    icon: Info },
  success: { ring: 'ring-emerald-400/40 bg-emerald-500/10 text-emerald-100', icon: CheckCircle2 },
  warning: { ring: 'ring-amber-400/40   bg-amber-500/10   text-amber-100',   icon: AlertTriangle },
  error:   { ring: 'ring-rose-400/40    bg-rose-500/10    text-rose-100',    icon: AlertCircle },
};
</script>

<template>
  <div
    aria-live="polite"
    aria-atomic="true"
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end sm:px-0"
  >
    <TransitionGroup name="toast" tag="div" class="flex w-full max-w-sm flex-col gap-2">
      <div
        v-for="toast in list"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex w-full items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 backdrop-blur',
          VARIANT_STYLES[toast.variant].ring,
        ]"
        role="status"
      >
        <component :is="VARIANT_STYLES[toast.variant].icon" class="mt-0.5 h-5 w-5 shrink-0" :aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-snug">{{ toast.message }}</p>
          <p v-if="toast.detail" class="mt-0.5 text-xs opacity-80">{{ toast.detail }}</p>
        </div>
        <button
          type="button"
          class="-m-1 shrink-0 rounded-md p-1 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40"
          :aria-label="`Dismiss ${toast.variant} notification`"
          @click="dismiss(toast.id)"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}
.toast-enter-from {
  transform: translateY(8px);
  opacity: 0;
}
.toast-leave-to {
  transform: translateY(8px);
  opacity: 0;
}
</style>
