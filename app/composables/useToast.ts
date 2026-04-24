/**
 * useToast — minimal app-wide toast/notification composable.
 *
 * Jira: DART-62 (sub-task of DART-60).
 *
 * Single global queue (module-scoped reactive state) so any component can
 * call `useToast().error(...)` without prop-drilling. The visible widget
 * is rendered by `app/components/pss/PssToastContainer.vue` mounted once
 * in the root layout.
 *
 * API surface kept intentionally small — info / success / warning / error
 * + dismiss. No category abstractions, no "actions" — call sites should
 * stay one-liners.
 *
 * Auto-dismiss defaults: 4 s for info / success, 6 s for warning, 8 s for
 * error. Pass `duration: 0` to require manual dismissal.
 */

import { computed, readonly, ref } from 'vue';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  /** Stable identity for v-for keys + `dismiss()`. */
  id: number;
  variant: ToastVariant;
  /** Short human-readable message — already localised by the caller. */
  message: string;
  /** Optional secondary line — e.g. validation field detail. */
  detail?: string;
  /** Auto-dismiss in ms. 0 = sticky until dismissed. */
  duration: number;
  /** Wall-clock when the toast was added — drives sort order. */
  createdAt: number;
}

export interface ToastOptions {
  detail?: string;
  /** Override the default duration (ms). 0 = sticky. */
  duration?: number;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  info: 4000,
  success: 4000,
  warning: 6000,
  error: 8000,
};

/** Module-scoped — shared across every `useToast()` call. */
const toasts = ref<Toast[]>([]);
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function add(
  variant: ToastVariant,
  message: string,
  options: ToastOptions = {},
): number {
  const id = nextId++;
  const duration = options.duration ?? DEFAULT_DURATIONS[variant];
  const toast: Toast = {
    id,
    variant,
    message,
    detail: options.detail,
    duration,
    createdAt: Date.now(),
  };
  toasts.value = [...toasts.value, toast];

  if (duration > 0 && import.meta.client) {
    const handle = setTimeout(() => dismiss(id), duration);
    timers.set(id, handle);
  }
  return id;
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
  const handle = timers.get(id);
  if (handle) {
    clearTimeout(handle);
    timers.delete(id);
  }
}

function clear(): void {
  for (const handle of timers.values()) clearTimeout(handle);
  timers.clear();
  toasts.value = [];
}

export interface UseToastReturn {
  /** Read-only reactive list of active toasts (newest last). */
  list: Readonly<typeof toasts>;
  info: (message: string, options?: ToastOptions) => number;
  success: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export function useToast(): UseToastReturn {
  return {
    list: readonly(toasts) as Readonly<typeof toasts>,
    info: (msg, opts) => add('info', msg, opts),
    success: (msg, opts) => add('success', msg, opts),
    warning: (msg, opts) => add('warning', msg, opts),
    error: (msg, opts) => add('error', msg, opts),
    dismiss,
    clear,
  };
}

/** Convenience computed for templates that don't want to call useToast(). */
export const toastList = computed(() => toasts.value);
