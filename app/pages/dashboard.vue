<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
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
          <select v-model="period" class="period-select">
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
        <div class="greeting-accent" aria-hidden="true"></div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="loading-skeleton">
        <div class="skeleton-grid">
          <div v-for="n in 4" :key="n" class="skeleton-card"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="dash-error">
        <AppIcon name="alert-circle" :size="20" />
        <span>{{ error }}</span>
        <button class="btn-retry" @click="fetchDashboard">Retry</button>
      </div>

      <!-- Empty state: setup checklist -->
      <div v-else-if="!hasData" class="empty-state">
        <div class="empty-icon">
          <AppIcon name="layout" :size="32" />
        </div>
        <h2 class="empty-title">Welcome to DART</h2>
        <p class="empty-sub">Complete these steps to start tracking your programme.</p>
        <div class="checklist">
          <NuxtLink to="/settings/framework" class="check-item">
            <span class="check-dot" />
            <span>Configure your activity framework</span>
          </NuxtLink>
          <NuxtLink to="/settings/locations" class="check-item">
            <span class="check-dot" />
            <span>Set up locations &amp; service points</span>
          </NuxtLink>
          <NuxtLink to="/beneficiaries/register" class="check-item">
            <span class="check-dot" />
            <span>Register your first beneficiary</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Live dashboard -->
      <template v-else>
        <!-- Stat cards -->
        <div class="stats-grid">
          <DashStatCard
            label="Total Beneficiaries"
            :value="demographics.total_beneficiaries"
            sub="Registered"
            icon="users"
            icon-color="primary"
            :accent="true"
          />
          <DashStatCard
            label="Girls / Women"
            :value="demographics.girls_women"
            :sub="girlsPct + '% of total'"
            icon="heart"
            icon-color="accent"
          />
          <DashStatCard
            label="Boys / Men"
            :value="demographics.boys_men"
            :sub="boysPct + '% of total'"
            icon="users"
            icon-color="success"
          />
          <DashStatCard
            label="With Disability"
            :value="demographics.with_disability"
            :sub="disabilityPct + '% inclusive reach'"
            icon="shield"
            icon-color="warning"
          />
        </div>

        <!-- Activity summary + recent sessions -->
        <div class="main-grid">
          <ActivitySummaryTable :activities="activitySummary" />

          <div class="recent-sessions">
            <div class="rs-header">
              <h3 class="rs-title">Recent Sessions</h3>
            </div>
            <div v-if="recentSessions.length === 0" class="rs-empty">No sessions recorded yet.</div>
            <div v-else class="rs-list">
              <div v-for="s in recentSessions.slice(0, 5)" :key="s.id" class="rs-item">
                <div class="rs-info">
                  <span class="rs-activity">{{ s.activity_name }}</span>
                  <span class="rs-location">{{ s.location_name }}</span>
                </div>
                <div class="rs-meta">
                  <span class="rs-presence">{{ s.present_count }}/{{ s.total_count }}</span>
                  <span class="rs-date">{{ formatDate(s.session_date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Location breakdown -->
        <LocationBreakdown :locations="locations" />
      </template>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useDashboard } from '../composables/useDashboard'
import DashStatCard from '../components/dashboard/DashStatCard.vue'
import ActivitySummaryTable from '../components/dashboard/ActivitySummaryTable.vue'
import LocationBreakdown from '../components/dashboard/LocationBreakdown.vue'
import OnboardingBanner from '../components/onboarding/OnboardingBanner.vue'
import AppIcon from '../components/interfaces/AppIcon.vue'

definePageMeta({
  middleware: ['auth'],
  layout: false,
})

useHead({ title: 'Dashboard — DART' })

const breadcrumbs = [
  { title: 'Home', href: '/' },
  { title: 'Dashboard', href: '/dashboard', current: true },
]

const authStore = useAuthStore()

const {
  isLoading,
  error,
  period,
  demographics,
  activitySummary,
  locations,
  recentSessions,
  hasData,
  todayLabel,
  formatDate,
  fetchDashboard,
} = useDashboard()

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

const girlsPct = computed(() => {
  if (!demographics.value.total_beneficiaries) return 0
  return Math.round((demographics.value.girls_women / demographics.value.total_beneficiaries) * 100)
})

const boysPct = computed(() => {
  if (!demographics.value.total_beneficiaries) return 0
  return Math.round((demographics.value.boys_men / demographics.value.total_beneficiaries) * 100)
})

const disabilityPct = computed(() => {
  if (!demographics.value.total_beneficiaries) return 0
  return Math.round((demographics.value.with_disability / demographics.value.total_beneficiaries) * 100)
})

onMounted(fetchDashboard)
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  max-width: 1280px;
}

/* ── Greeting ──────────────────────────────────────────────────────────── */
.page-greeting {
  position: relative;
  padding: 1.75rem 2rem;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.greeting-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--gradient-brand);
  border-radius: 3px 3px 0 0;
}

.greeting-body { position: relative; flex: 1; }

.greeting-eyebrow {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0 0 0.35rem;
}

.greeting-title {
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
}

.greeting-name {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.greeting-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.4rem 0 0;
}

.greeting-actions {
  position: relative;
  flex-shrink: 0;
}

.period-select {
  padding: 8px 32px 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
}

.period-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

/* ── Loading ───────────────────────────────────────────────────────────── */
.loading-skeleton { animation: fadeIn 0.3s ease; }

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 140px;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Error ─────────────────────────────────────────────────────────────── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 0.85rem;
}

.btn-retry {
  margin-left: auto;
  padding: 0.4rem 1rem;
  border: 1px solid var(--error);
  background: transparent;
  color: var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-retry:hover { background: color-mix(in srgb, var(--error) 8%, transparent); }

/* ── Empty state ───────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-dim);
  color: var(--primary);
  margin-bottom: 16px;
}

.empty-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.empty-sub { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 24px; }

.checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

.check-item:hover { border-color: var(--primary); background: var(--primary-dim); text-decoration: none; }

.check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}

/* ── Stats grid ────────────────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  animation: fadeIn 0.35s ease-out;
}

@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

/* ── Main grid (activity + sessions) ───────────────────────────────────── */
.main-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 1024px) { .main-grid { grid-template-columns: 1fr; } }

/* ── Recent sessions ───────────────────────────────────────────────────── */
.recent-sessions {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.rs-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.rs-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.rs-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.rs-list { display: flex; flex-direction: column; }

.rs-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
}

.rs-item:last-child { border-bottom: none; }
.rs-item:hover { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }

.rs-info { display: flex; flex-direction: column; gap: 2px; }
.rs-activity { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.rs-location { font-size: 0.72rem; color: var(--text-muted); }

.rs-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.rs-presence { font-size: 0.82rem; font-weight: 600; color: var(--primary); }
.rs-date { font-size: 0.72rem; color: var(--text-muted); }

@media (max-width: 1024px) {
  .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .skeleton-grid { grid-template-columns: 1fr; }
}
</style>
