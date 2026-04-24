<template>
  <NuxtLayout name="app">
    <div class="dashboard-page">

      <!-- Onboarding banner -->
      <OnboardingBanner />

      <!-- Greeting header -->
      <div class="page-greeting">
        <div class="greeting-body">
          <p class="greeting-eyebrow">{{ todayLabel }}</p>
          <h1 class="greeting-title">
            {{ greetingText }},
            <span class="greeting-name">{{ firstName }}</span>
          </h1>
          <p class="greeting-sub">Here's what's happening with your program today.</p>
        </div>
        <div class="greeting-actions">
          <button
            class="sync-btn"
            :class="{ 'sync-btn--syncing': isSyncing, 'sync-btn--pending': pendingCount > 0 && !isSyncing }"
            :disabled="isSyncing"
            @click="handleSync"
          >
            <AppIcon :name="!isOnline ? 'wifi-off' : 'refresh-cw'" :size="14" :class="{ 'spin': isSyncing }" />
            <span v-if="isSyncing">{{ syncStatus }}</span>
            <span v-else-if="!isOnline">Offline Mode</span>
            <span v-else-if="pendingCount > 0">Sync {{ pendingCount }} pending</span>
            <span v-else>Sync Data</span>
          </button>
        </div>
      </div>

      <!-- Sync result toast -->
      <Transition name="toast-fade">
        <div v-if="syncToast" class="sync-toast" :class="syncToast.type">
          <AppIcon :name="syncToast.type === 'sync-toast--success' ? 'check-circle' : 'alert-circle'" :size="16" />
          <div class="sync-toast-body">
            <span class="sync-toast-title">{{ syncToast.title }}</span>
            <ul v-if="syncToast.details.length" class="sync-toast-list">
              <li v-for="(d, i) in syncToast.details" :key="i">{{ d }}</li>
            </ul>
          </div>
          <button class="sync-toast-close" @click="syncToast = null">&times;</button>
        </div>
      </Transition>

      <!-- Child route content (Level 1 / 2 / 3) -->
      <NuxtPage />

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSyncQueue } from '../composables/useSyncQueue'
import { useOfflineStatus } from '../composables/useOfflineStatus'
import OnboardingBanner from '../components/onboarding/OnboardingBanner.vue'
import AppIcon from '../components/interfaces/AppIcon.vue'

definePageMeta({
  middleware: ['auth'],
  layout: false,
})

useHead({ title: 'Dashboard \u2014 DART' })

const authStore = useAuthStore()
const { isOnline, pendingCount } = useOfflineStatus()
const { isSyncing, flushQueue, pullBeneficiaries, syncLog } = useSyncQueue()

const syncStatus = ref('Syncing\u2026')
const syncToast = ref<{ type: string; title: string; details: string[] } | null>(null)

const firstName = computed(() => {
  const name = authStore.userName ?? 'there'
  return name.split(' ')[0] || 'there'
})

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

async function handleSync() {
  if (!isOnline.value) return
  syncToast.value = null
  const pushed: string[] = []

  syncStatus.value = 'Pushing pending\u2026'
  await flushQueue()

  for (const entry of syncLog.value) {
    if (entry.startsWith('\u2713') || entry.startsWith('\u26A0') || entry.startsWith('\u2717')) {
      pushed.push(entry)
    }
  }

  syncStatus.value = 'Pulling beneficiaries\u2026'
  await pullBeneficiaries()

  const pullEntry = syncLog.value.find(l => l.startsWith('Pulled'))
  const pullCount = pullEntry?.match(/(\d+)/)?.[1] ?? '0'

  const details: string[] = []
  if (parseInt(pullCount) > 0) details.push(`${pullCount} beneficiaries synced for offline use`)
  if (pushed.length) details.push(...pushed)
  if (!details.length) details.push('Everything is up to date')

  syncToast.value = {
    type: parseInt(pullCount) > 0 || pushed.length ? 'sync-toast--success' : 'sync-toast--info',
    title: 'Sync Complete',
    details,
  }

  setTimeout(() => { syncToast.value = null }, 8000)
}
</script>

<style scoped>
/* ── Dashboard page ────────────────────────────────────────────────────────── */
.dashboard-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ── Greeting header ───────────────────────────────────────────────────────── */
.page-greeting {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.greeting-body {
  min-width: 0;
}

.greeting-eyebrow {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 4px;
  letter-spacing: 0.01em;
}

.greeting-title {
  font-size: clamp(1.25rem, 2.2vw, 1.6rem);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
}

.greeting-name {
  color: var(--primary);
}

.greeting-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ── Sync button ───────────────────────────────────────────────────────────── */
.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sync-btn:hover {
  background: var(--hover-bg);
  border-color: var(--primary);
  color: var(--text-primary);
}

.sync-btn--pending {
  border-color: var(--warning);
  background: var(--warning-bg);
  color: var(--warning);
}

.sync-btn--syncing {
  border-color: var(--primary);
  background: var(--primary-dim);
  color: var(--primary);
  pointer-events: none;
}

.spin {
  animation: spin-icon 1s linear infinite;
}

@keyframes spin-icon {
  to {
    transform: rotate(360deg);
  }
}

/* ── Sync toast ────────────────────────────────────────────────────────────── */
.sync-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
}

.sync-toast--success {
  border-color: var(--success);
  background: var(--success-bg);
  color: var(--success);
}

.sync-toast--info {
  border-color: var(--primary);
  background: var(--primary-dim);
  color: var(--primary);
}

.sync-toast-body {
  flex: 1;
  min-width: 0;
}

.sync-toast-title {
  font-weight: 600;
}

.sync-toast-list {
  margin: 4px 0 0;
  padding-left: 16px;
  list-style: disc;
}

.sync-toast-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.5;
}

.sync-toast-close:hover {
  opacity: 1;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
