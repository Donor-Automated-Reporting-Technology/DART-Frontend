<!--
  PssSyncStatusBar — persistent online/offline + queued-actions indicator.

  Jira: DART-67 (sub-task of DART-60).

  Reads exclusively from `usePssSyncQueue` (DART-68); introduces no new
  reactive state of its own. Mobile-first: renders in a single ≤32px
  row that does not wrap at a 360px viewport.

  Placement is the integrating layout's responsibility — this component
  exposes a `position` prop ('inline' | 'sticky-bottom') so the caller
  decides whether to dock it. Default 'inline' so dropping the tag
  anywhere is safe (no hidden positioning behaviour).

  States (priority order — only the highest-priority badge shows):

    1. offline                   → red    "Offline"
    2. dead items > 0            → red    "N failed — Retry" (clickable)
    3. syncError && pending > 0  → red    "Sync failed — Retry"
    4. failed items > 0          → amber  "N retrying"
    5. isSyncing                 → blue   "Syncing… (N left)"
    6. pending > 0               → amber  "N to sync"
    7. all clear                 → green  "Synced [Xm ago | just now]"

  Tap behaviour: in any retryable state, the whole bar is a button that
  invokes `retry()`. Otherwise it is a non-interactive status region.
-->

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  WifiOff,
  AlertTriangle,
  RefreshCw,
  CloudUpload,
  CloudCheck,
} from 'lucide-vue-next';
import { usePssSyncQueue } from '../composables/usePssSyncQueue';

interface Props {
  /**
   * `'inline'` renders in normal flow (default — safest).
   * `'sticky-bottom'` adds `position: sticky; bottom: 0` so the bar
   * dockable inside a scroll container (e.g. main content slot).
   */
  position?: 'inline' | 'sticky-bottom';
}
const props = withDefaults(defineProps<Props>(), { position: 'inline' });

const {
  pending,
  failed,
  dead,
  isSyncing,
  lastSyncTime,
  syncError,
  isOnline,
  retry,
} = usePssSyncQueue();

// ── Live "Xm ago" — recompute every 30s ──────────────────────────────────

const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 30_000);
});
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer);
});

const lastSyncedLabel = computed<string>(() => {
  if (!lastSyncTime.value) return 'Synced just now';
  const ageSec = Math.max(0, Math.floor((nowTick.value - Date.parse(lastSyncTime.value)) / 1000));
  if (ageSec < 60) return 'Synced just now';
  const m = Math.floor(ageSec / 60);
  if (m < 60) return `Synced ${m}m ago`;
  const h = Math.floor(m / 60);
  return `Synced ${h}h ago`;
});

// ── Derived state — pick exactly one variant per render ─────────────────

type Variant = 'offline' | 'dead' | 'failed-now' | 'failed' | 'syncing' | 'pending' | 'synced';

const variant = computed<Variant>(() => {
  if (!isOnline.value) return 'offline';
  if (dead.value > 0) return 'dead';
  if (syncError.value && pending.value > 0) return 'failed-now';
  if (failed.value > 0) return 'failed';
  if (isSyncing.value) return 'syncing';
  if (pending.value > 0) return 'pending';
  return 'synced';
});

const isRetryable = computed(() =>
  ['dead', 'failed-now', 'failed'].includes(variant.value),
);

const label = computed<string>(() => {
  switch (variant.value) {
    case 'offline':    return 'Offline';
    case 'dead':       return `${dead.value} failed — Retry`;
    case 'failed-now': return 'Sync failed — Retry';
    case 'failed':     return `${failed.value} retrying`;
    case 'syncing':    return pending.value > 0 ? `Syncing… (${pending.value} left)` : 'Syncing…';
    case 'pending':    return `${pending.value} to sync`;
    case 'synced':     return lastSyncedLabel.value;
  }
});

const titleAttr = computed<string | undefined>(() =>
  variant.value === 'failed-now' && syncError.value ? syncError.value : undefined,
);

// ── Click handler — only retries in retryable variants ──────────────────

function onClick(): void {
  if (!isRetryable.value) return;
  void retry();
}
</script>

<template>
  <component
    :is="isRetryable ? 'button' : 'div'"
    class="pss-sync-bar"
    :class="[`pss-sync-bar--${variant}`, { 'pss-sync-bar--sticky': props.position === 'sticky-bottom' }]"
    :type="isRetryable ? 'button' : undefined"
    :title="titleAttr"
    role="status"
    aria-live="polite"
    :aria-label="label"
    @click="onClick"
  >
    <span class="pss-sync-bar__dot" :class="`pss-sync-bar__dot--${variant}`" aria-hidden="true" />

    <WifiOff       v-if="variant === 'offline'"                          :size="14" class="pss-sync-bar__icon" />
    <AlertTriangle v-else-if="variant === 'dead' || variant === 'failed-now' || variant === 'failed'" :size="14" class="pss-sync-bar__icon" />
    <RefreshCw     v-else-if="variant === 'syncing'"                     :size="14" class="pss-sync-bar__icon pss-sync-bar__icon--spin" />
    <CloudUpload   v-else-if="variant === 'pending'"                     :size="14" class="pss-sync-bar__icon" />
    <CloudCheck    v-else                                                :size="14" class="pss-sync-bar__icon" />

    <span class="pss-sync-bar__label">{{ label }}</span>
  </component>
</template>

<style scoped>
.pss-sync-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 32px;
  padding: 0 0.65rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: var(--pss-sync-bg, rgba(255, 255, 255, 0.04));
  color: var(--pss-sync-fg, #d4d4d8);
  font: 600 13px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

button.pss-sync-bar { cursor: pointer; }
button.pss-sync-bar:hover  { filter: brightness(1.1); }
button.pss-sync-bar:active { transform: translateY(1px); }
button.pss-sync-bar:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 2px;
}

.pss-sync-bar--sticky {
  position: sticky;
  bottom: 8px;
  z-index: 20;
}

.pss-sync-bar__dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: currentColor;
  flex: 0 0 auto;
}

.pss-sync-bar__icon { flex: 0 0 auto; }
.pss-sync-bar__icon--spin { animation: pss-spin 900ms linear infinite; }

.pss-sync-bar__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Variant colours — meet WCAG AA on a #0f0f1a background ─────────── */
.pss-sync-bar--offline,
.pss-sync-bar--dead,
.pss-sync-bar--failed-now {
  --pss-sync-bg: rgba(220, 38, 38, 0.16);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.5);
}

.pss-sync-bar--failed,
.pss-sync-bar--pending {
  --pss-sync-bg: rgba(245, 158, 11, 0.14);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.45);
}

.pss-sync-bar--syncing {
  --pss-sync-bg: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.45);
}

.pss-sync-bar--synced {
  --pss-sync-bg: rgba(34, 197, 94, 0.14);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.4);
}

@keyframes pss-spin {
  to { transform: rotate(360deg); }
}

/* ── 360px viewport guard ──────────────────────────────────────────── */
@media (max-width: 360px) {
  .pss-sync-bar { font-size: 12px; padding: 0 0.5rem; }
}
</style>
