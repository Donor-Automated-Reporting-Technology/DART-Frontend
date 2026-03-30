<template>
  <div class="sync-wrapper">
    <!-- Sync Button -->
    <button
      class="sync-btn"
      :class="{
        'sync-btn--syncing': isSyncing,
        'sync-btn--offline': !isOnline,
        'sync-btn--has-pending': pendingCount > 0 && !isSyncing,
      }"
      :disabled="isSyncing || !isOnline"
      @click="handleSync"
    >
      <span class="sync-icon" :class="{ spinning: isSyncing }">
        <AppIcon name="refresh-cw" :size="18" />
      </span>
      <span class="sync-label">
        <template v-if="isSyncing">Syncing...</template>
        <template v-else-if="!isOnline">Offline</template>
        <template v-else>Sync Now</template>
      </span>
      <span v-if="pendingCount > 0 && !isSyncing" class="sync-badge">
        {{ pendingCount }}
      </span>
    </button>

    <!-- Status indicator -->
    <div class="sync-status">
      <span class="status-dot" :class="statusDotClass"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <!-- Sync Log Modal -->
    <Teleport to="body">
      <div v-if="showLog" class="sync-modal-overlay" @click.self="showLog = false">
        <div class="sync-modal">
          <div class="sync-modal-header">
            <h3 class="sync-modal-title">Sync Log</h3>
            <button class="sync-modal-close" @click="showLog = false">
              <AppIcon name="x" :size="18" />
            </button>
          </div>
          <div class="sync-modal-body">
            <div v-if="syncLog.length === 0" class="sync-log-empty">
              No sync activity yet.
            </div>
            <div v-else class="sync-log-list">
              <div
                v-for="(entry, i) in syncLog"
                :key="i"
                class="sync-log-entry"
                :class="{
                  'log-success': entry.startsWith('✓'),
                  'log-warning': entry.startsWith('⚠'),
                  'log-error': entry.startsWith('✗') || entry.startsWith('Error'),
                }"
              >
                {{ entry }}
              </div>
            </div>
            <div v-if="lastSyncTime" class="sync-log-time">
              Last sync: {{ formatTime(lastSyncTime) }}
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useSyncQueue } from '../../composables/useSyncQueue';
import { useOfflineStatus } from '../../composables/useOfflineStatus';
import AppIcon from '../interfaces/AppIcon.vue';

const authStore = useAuthStore();
const { isOnline, pendingCount, conflictCount, refreshCounts } = useOfflineStatus();
const {
  isSyncing,
  syncError,
  syncLog,
  lastSyncTime,
  flushQueue,
  pullBeneficiaries,
} = useSyncQueue();

const showLog = ref(false);

const statusDotClass = computed(() => {
  if (!isOnline.value) return 'dot-offline';
  if (isSyncing.value) return 'dot-syncing';
  if (pendingCount.value > 0) return 'dot-pending';
  return 'dot-synced';
});

const statusText = computed(() => {
  if (!isOnline.value) return 'Working offline';
  if (isSyncing.value) return 'Syncing data...';
  if (pendingCount.value > 0) return `${pendingCount.value} pending`;
  if (conflictCount.value > 0) return `${conflictCount.value} conflicts`;
  return 'All synced';
});

async function handleSync() {
  const token = authStore.accessToken || undefined;
  await flushQueue(token);
  await refreshCounts();
  showLog.value = true;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
/* ── Sync Button ─────────────────────────────────────────────────────────── */
.sync-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sync-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.sync-btn:hover:not(:disabled) {
  border-color: var(--primary);
  box-shadow: var(--shadow-card);
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-btn--syncing {
  border-color: var(--primary);
  background: var(--primary-dim);
}

.sync-btn--offline {
  border-color: rgba(251, 191, 36, 0.3);
  color: var(--text-muted);
}

.sync-btn--has-pending {
  border-color: rgba(99, 102, 241, 0.3);
}

.sync-icon {
  display: flex;
  align-items: center;
}

.sync-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--primary);
  color: #000;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 10px;
}

/* ── Status Indicator ────────────────────────────────────────────────────── */
.sync-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-synced    { background: #34d399; }
.dot-pending   { background: #818cf8; animation: pulse-dot 2s ease infinite; }
.dot-syncing   { background: #fbbf24; animation: pulse-dot 1s ease infinite; }
.dot-offline   { background: #f87171; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Sync Log Modal ──────────────────────────────────────────────────────── */
.sync-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.sync-modal {
  background: var(--bg-panel, #1a1a2e);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: min(480px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sync-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.sync-modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sync-modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
}

.sync-modal-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.sync-modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-log-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 2rem 0;
}

.sync-log-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sync-log-entry {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.4rem 0.75rem;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.log-success { color: #34d399; }
.log-warning { color: #fbbf24; }
.log-error   { color: #f87171; }

.sync-log-time {
  margin-top: 0.5rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: right;
}
</style>
