<template>
  <!--
    DSyncStatusFooter
    ─────────────────────────────────────────────────────────────────────────────
    Frame A — Internal trust signal for offline-first facilitators (Benson).
    Renders inside app/layouts/app.vue as a sibling AFTER <main class="page-content">.
    Failure states are designed first; success is the boring default.
    Mandate: sprint-tickets/sync-status-footer-v1.md  (CEO approved 23-Apr-2026)
  -->
  <footer
    class="sync-footer"
    :class="modeClass"
    role="status"
    aria-live="polite"
    :title="syncError || undefined"
  >
    <!-- Primary slot: dot + icon + label -->
    <span class="sync-primary">
      <span class="sync-dot" :style="{ backgroundColor: primaryColor }" aria-hidden="true" />
      <component
        :is="primaryIcon"
        :size="14"
        :class="{ 'animate-spin': isSyncing }"
        :style="{ color: primaryColor }"
        aria-hidden="true"
      />
      <span class="sync-label" :style="{ color: primaryColor }">{{ primaryLabel }}</span>
    </span>

    <!-- Pending count: visible during offline / failed / syncing / stale states.
         AC-F2 requires >=14px semibold for legibility at arm''s length. -->
    <span v-if="showPendingSegment" class="sync-sep" aria-hidden="true">·</span>
    <span v-if="showPendingSegment" class="sync-pending">
      {{ pendingCount }} {{ isSyncing ? "to sync" : pendingLabelSuffix }}
    </span>

    <!-- Conflict segment: always surfaced when count > 0, never hidden behind pending. -->
    <span v-if="conflictCount > 0" class="sync-sep" aria-hidden="true">·</span>
    <span v-if="conflictCount > 0" class="sync-conflicts">
      <AlertTriangle :size="14" :style="{ color: amber }" aria-hidden="true" />
      <span :style="{ color: amber }">
        {{ conflictCount }} {{ conflictCount === 1 ? "conflict" : "conflicts" }}
      </span>
    </span>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  WifiOff,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  CloudCheck,
} from "lucide-vue-next";
import { useSyncQueue } from "../../composables/useSyncQueue";
import { useOfflineStatus } from "../../composables/useOfflineStatus";

// ─── State sources (AC-D1) ────────────────────────────────────────────────────
// isOnline comes from useOfflineStatus (already wired to window online/offline
// events). Queue metadata comes from useSyncQueue. No new reactive state is
// introduced in either composable per the ticket constraints.
const { isOnline } = useOfflineStatus();
const {
  pendingCount,
  conflictCount,
  isSyncing,
  syncError,
  lastSyncTime,
} = useSyncQueue();

// ─── Colour tokens (inline to avoid theme drift) ─────────────────────────────
const red = "#ef4444";
const amber = "#f59e0b";
const green = "#22c55e";
const blue = "#3b82f6";

const STALE_MS = 15 * 60 * 1000;

// ─── Live ticker for relative time (AC-D2) ────────────────────────────────────
// Single 60s interval recomputes "Xm ago" without page reload.
const now = ref(Date.now());
let tickHandle: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  tickHandle = setInterval(() => { now.value = Date.now(); }, 60_000);
});
onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle);
});

// ─── Derived: relative time string ────────────────────────────────────────────
const lastSyncMs = computed<number | null>(() => {
  const t = lastSyncTime.value;
  if (!t) return null;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : null;
});

const ageMs = computed<number | null>(() => {
  const t = lastSyncMs.value;
  return t === null ? null : Math.max(0, now.value - t);
});

function formatAge(ms: number): string {
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const isStale = computed<boolean>(() => {
  const a = ageMs.value;
  return a !== null && a > STALE_MS && pendingCount.value > 0;
});

// ─── State machine: priority order matches the visual spec ────────────────────
type Mode = "offline" | "error" | "syncing" | "stale" | "synced";

const mode = computed<Mode>(() => {
  if (!isOnline.value) return "offline";
  if (syncError.value) return "error";
  if (isSyncing.value) return "syncing";
  if (isStale.value) return "stale";
  return "synced";
});

const primaryColor = computed<string>(() => {
  switch (mode.value) {
    case "offline": return red;
    case "error":   return red;
    case "syncing": return blue;
    case "stale":   return amber;
    case "synced":  return green;
  }
});

const primaryIcon = computed(() => {
  switch (mode.value) {
    case "offline": return WifiOff;
    case "error":   return AlertCircle;
    case "syncing": return RefreshCw;
    case "stale":   return Clock;
    case "synced":  return CloudCheck;
  }
});

const primaryLabel = computed<string>(() => {
  switch (mode.value) {
    case "offline": return "Offline";
    case "error":   return "Sync failed";
    case "syncing": return "Syncing…";
    case "stale": {
      const a = ageMs.value;
      return a === null ? "Stale" : `Last synced ${formatAge(a)}`;
    }
    case "synced": {
      const a = ageMs.value;
      // lastSyncTime resets to null on reload (CEO ruling: Q1 option B).
      // Show "Synced just now" until the first sync of the session lands.
      return a === null ? "Synced just now" : `Synced ${formatAge(a)}`;
    }
  }
});

const modeClass = computed(() => `sync-footer--${mode.value}`);

// AC-F2 + AC-F4 + AC-S2 — pending count remains visible across failure states
// and during sync so Benson sees it counting down.
const showPendingSegment = computed<boolean>(() => {
  if (pendingCount.value <= 0) return false;
  return mode.value !== "synced";
});

const pendingLabelSuffix = computed<string>(() => {
  // "pending" reads better than "to sync" when the failure has already happened.
  return mode.value === "error" ? "pending" : "to sync";
});
</script>

<style scoped>
.sync-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  max-height: 32px;
  padding: 6px 12px;
  background: var(--glass-bg, rgba(15, 17, 21, 0.92));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
  font-size: 13px;
  line-height: 1;
  color: var(--text-secondary);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}

.sync-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-label {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.1px;
}

.sync-sep {
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

/* AC-F2: pending number must be legible at arm''s length on 360px. */
.sync-pending {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.sync-conflicts {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Failure-state background tint — subtle, not alarming, but distinguishable. */
.sync-footer--offline,
.sync-footer--error {
  background: linear-gradient(
    to right,
    rgba(239, 68, 68, 0.10),
    var(--glass-bg, rgba(15, 17, 21, 0.92)) 60%
  );
  border-top-color: rgba(239, 68, 68, 0.35);
}

.sync-footer--stale {
  background: linear-gradient(
    to right,
    rgba(245, 158, 11, 0.08),
    var(--glass-bg, rgba(15, 17, 21, 0.92)) 60%
  );
  border-top-color: rgba(245, 158, 11, 0.30);
}

.animate-spin {
  animation: sync-spin 1s linear infinite;
}

@keyframes sync-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* 360px guard: ensure the row never wraps. Secondary segments may ellipsis
   as a last resort (AC-L2). */
@media (max-width: 480px) {
  .sync-footer {
    padding: 6px 10px;
    gap: 6px;
  }
  .sync-conflicts span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
