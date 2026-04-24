<script setup lang="ts">
/**
 * PssErrorBoundary — catches errors thrown during render or in `setup()`
 * of any descendant and shows a recoverable fallback UI.
 *
 * Jira: DART-62.
 *
 * Use to wrap a page body or a non-critical widget so a single broken
 * component doesn't blank the screen. For async errors from API calls,
 * pair with `useToast().error(pssErrorToToast(err).message)` at the call
 * site — this boundary only catches synchronous Vue-render errors.
 *
 * Slots:
 *   default  — the protected content
 *   fallback — optional override; receives `{ error, retry }`
 *
 * Emits:
 *   error — fires whenever a child throws (for logging hooks)
 */
import { onErrorCaptured, ref } from 'vue';
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';

interface Props {
  /** Headline shown in the default fallback. */
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
});

const emit = defineEmits<{
  error: [error: unknown];
}>();

const caught = ref<unknown>(null);
/** Bumped to force a re-render of the slot content on retry. */
const renderKey = ref(0);

onErrorCaptured((err) => {
  caught.value = err;
  emit('error', err);
  // Stop propagation — let this boundary handle it.
  return false;
});

function retry(): void {
  caught.value = null;
  renderKey.value++;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
</script>

<template>
  <slot v-if="!caught" :key="renderKey" />
  <slot v-else name="fallback" :error="caught" :retry="retry">
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center"
      role="alert"
    >
      <AlertTriangle class="h-8 w-8 text-rose-400" aria-hidden="true" />
      <div>
        <p class="text-sm font-semibold text-rose-200">{{ props.title }}</p>
        <p class="mt-1 text-xs text-rose-300/80">{{ errorMessage(caught) }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        @click="retry"
      >
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  </slot>
</template>
