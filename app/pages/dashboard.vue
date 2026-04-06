<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="dashboard-page">

      <!-- Onboarding banner -->
      <OnboardingBanner />

      <!-- Greeting header — clean, minimal -->
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
            :class="{ 'sync-btn--syncing': isSyncing }"
            :disabled="isSyncing || !isOnline"
            @click="handleSync"
          >
            <AppIcon name="refresh-cw" :size="14" :class="{ 'spin': isSyncing }" />
            <span v-if="isSyncing">Syncing…</span>
            <span v-else-if="!isOnline">Offline</span>
            <span v-else-if="pendingCount > 0">Sync {{ pendingCount }}</span>
            <span v-else>Synced</span>
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="loading-skeleton">
        <div class="skeleton-grid">
          <div v-for="n in 6" :key="n" class="skeleton-card"></div>
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

      <!-- ══════════════════════════════════════════════════════════════════
           LIVE DASHBOARD — Three-column Bento Layout
           Center: Primary data visualization (reports, activities)
           Right:  At-a-Glance beneficiary insights
           ══════════════════════════════════════════════════════════════════ -->
      <template v-else>
        <div class="dashboard-body">

          <!-- ─── CENTER COLUMN: Primary data ─────────────────────────── -->
          <div class="dashboard-center">

            <!-- Bento metrics grid — targets & actuals first -->
            <div class="bento-grid">
              <div class="bento-item bento-hero metric-card hero-modern">
                <div class="hero-top">
                  <div class="hero-icon-wrap">
                    <AppIcon name="users" :size="20" />
                  </div>
                  <span class="hero-badge">This Quarter</span>
                </div>
                <div class="metric-primary">
                  <span class="metric-big">{{ demographics.total_beneficiaries }}</span>
                  <span class="metric-label">Total Beneficiaries</span>
                </div>
                <div class="metric-splits-modern">
                  <div class="split-card">
                    <div class="split-card-dot"></div>
                    <span class="split-card-value">{{ demographics.girls_women }}</span>
                    <span class="split-card-label">Girls & Women</span>
                  </div>
                  <div class="split-card">
                    <div class="split-card-dot split-card-dot--alt"></div>
                    <span class="split-card-value">{{ demographics.boys_men }}</span>
                    <span class="split-card-label">Boys & Men</span>
                  </div>
                  <div class="split-card">
                    <div class="split-card-dot split-card-dot--muted"></div>
                    <span class="split-card-value">{{ demographics.with_disability }}</span>
                    <span class="split-card-label">With Disability</span>
                  </div>
                </div>
              </div>

              <!-- Per-activity target vs actual cards -->
              <div
                v-for="a in activitySummary.slice(0, 4)"
                :key="a.code"
                class="bento-item metric-card metric-card--activity"
              >
                <div class="metric-card-head">
                  <span class="metric-label">{{ a.name }}</span>
                  <span class="metric-pct-pill">{{ a.percentage }}%</span>
                </div>
                <div class="metric-target-row">
                  <div class="metric-target-block">
                    <span class="target-number">{{ a.actual }}</span>
                    <span class="target-caption">Actual</span>
                  </div>
                  <span class="target-slash">/</span>
                  <div class="metric-target-block">
                    <span class="target-number target-number--muted">{{ a.target }}</span>
                    <span class="target-caption">Target</span>
                  </div>
                </div>
                <div class="metric-bar">
                  <div class="metric-bar-fill" :style="{ width: Math.min(a.percentage, 100) + '%' }"></div>
                </div>
              </div>

              <!-- Summary cards row -->
              <div class="bento-item metric-card metric-card--compact">
                <span class="compact-value">{{ activitySummary.length }}</span>
                <span class="compact-label">Active Activities</span>
                <span class="compact-sub">Current period</span>
              </div>
              <div class="bento-item metric-card metric-card--compact">
                <span class="compact-value">{{ locations.length }}</span>
                <span class="compact-label">Locations</span>
                <span class="compact-sub">Service points</span>
              </div>
            </div>

            <!-- Activity Progress — with Deep Dive toggle -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-header-left">
                  <h3 class="section-title">Activity Progress</h3>
                  <span class="section-count">{{ activitySummary.length }} activities</span>
                </div>
                <button
                  class="deep-dive-btn"
                  @click="activityDeepDive = !activityDeepDive"
                >
                  <AppIcon :name="activityDeepDive ? 'chevron-up' : 'bar-chart-2'" :size="14" />
                  {{ activityDeepDive ? 'Collapse' : 'Deep Dive' }}
                </button>
              </div>

              <!-- Compact view — actual vs target priority -->
              <div v-if="!activityDeepDive" class="activity-compact">
                <div v-for="a in activitySummary" :key="a.code" class="activity-row">
                  <div class="activity-row-top">
                    <span class="activity-name">{{ a.name }}</span>
                    <div class="activity-numbers">
                      <span class="activity-actual">{{ a.actual }}</span>
                      <span class="activity-sep">/</span>
                      <span class="activity-target">{{ a.target }}</span>
                    </div>
                  </div>
                  <div class="activity-row-bottom">
                    <div class="activity-bar">
                      <div
                        class="activity-bar-fill"
                        :style="{ width: Math.min(a.percentage, 100) + '%' }"
                      />
                    </div>
                    <span class="activity-pct">{{ a.percentage }}%</span>
                  </div>
                </div>
                <div v-if="activitySummary.length === 0" class="activity-empty">
                  No activity data for this period.
                </div>
              </div>

              <!-- Deep Dive expanded view -->
              <div v-else class="activity-deep">
                <ActivitySummaryTable :activities="activitySummary" />
              </div>
            </div>

            <!-- Recent Sessions -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-header-left">
                  <h3 class="section-title">Recent Sessions</h3>
                </div>
              </div>
              <div v-if="recentSessions.length === 0" class="section-empty">
                No sessions recorded yet.
              </div>
              <div v-else class="session-list">
                <div v-for="s in recentSessions.slice(0, 5)" :key="s.id" class="session-item">
                  <div class="session-info">
                    <span class="session-activity">{{ s.activity_name }}</span>
                    <span class="session-location">{{ s.location_name }}</span>
                  </div>
                  <div class="session-meta">
                    <span class="session-presence">{{ s.present_count }}/{{ s.total_count }}</span>
                    <span class="session-date">{{ formatDate(s.session_date) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location Breakdown -->
            <LocationBreakdown :locations="locations" />
          </div>

          <!-- ─── RIGHT COLUMN: At-a-Glance Insights ──────────────────── -->
          <aside class="dashboard-insights">

            <!-- Beneficiary Snapshot — big numbers first -->
            <div class="insight-card">
              <h4 class="insight-title">Beneficiary Snapshot</h4>
              <div class="insight-hero">
                <span class="insight-hero-num">{{ demographics.total_beneficiaries }}</span>
                <span class="insight-hero-label">Total Registered</span>
              </div>
              <div class="insight-breakdown">
                <div class="insight-row-item">
                  <div class="insight-row-top">
                    <span class="insight-value">{{ demographics.girls_women }}</span>
                    <span class="insight-pct">{{ girlsPct }}%</span>
                  </div>
                  <span class="insight-label">Girls & Women</span>
                  <div class="insight-bar">
                    <div class="insight-bar-fill" :style="{ width: girlsPct + '%' }"></div>
                  </div>
                </div>
                <div class="insight-row-item">
                  <div class="insight-row-top">
                    <span class="insight-value">{{ demographics.boys_men }}</span>
                    <span class="insight-pct">{{ boysPct }}%</span>
                  </div>
                  <span class="insight-label">Boys & Men</span>
                  <div class="insight-bar">
                    <div class="insight-bar-fill insight-bar-fill--alt" :style="{ width: boysPct + '%' }"></div>
                  </div>
                </div>
                <div class="insight-row-item">
                  <div class="insight-row-top">
                    <span class="insight-value">{{ demographics.with_disability }}</span>
                    <span class="insight-pct">{{ disabilityPct }}%</span>
                  </div>
                  <span class="insight-label">With Disability</span>
                  <div class="insight-bar">
                    <div class="insight-bar-fill insight-bar-fill--warn" :style="{ width: disabilityPct + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Performance Snapshots (YouTube-style trends) -->
            <div class="insight-card">
              <h4 class="insight-title">Performance Snapshots</h4>
              <div class="perf-list">
                <div v-for="a in activitySummary" :key="a.code" class="perf-item">
                  <div class="perf-left">
                    <div
                      class="perf-trend"
                      :class="a.percentage >= 50 ? 'perf-trend--up' : 'perf-trend--down'"
                    >
                      {{ a.percentage >= 50 ? '\u2191' : '\u2193' }}
                    </div>
                  </div>
                  <div class="perf-info">
                    <span class="perf-name">{{ a.name }}</span>
                    <div class="perf-numbers">
                      <span class="perf-actual">{{ a.actual }}</span>
                      <span class="perf-sep">/</span>
                      <span class="perf-target">{{ a.target }}</span>
                    </div>
                  </div>
                  <span class="perf-pct-badge">{{ a.percentage }}%</span>
                </div>
                <div v-if="activitySummary.length === 0" class="perf-empty">
                  No performance data yet.
                </div>
              </div>
            </div>

            <!-- Overall Progress ring -->
            <div class="insight-card insight-card--highlight">
              <h4 class="insight-title">Overall Progress</h4>
              <div class="overall-block">
                <div class="overall-ring">
                  <svg viewBox="0 0 36 36" class="ring-svg">
                    <path
                      class="ring-bg"
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke-width="3"
                    />
                    <path
                      class="ring-fill"
                      d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke-width="3"
                      :stroke-dasharray="overallProgress + ', 100'"
                    />
                  </svg>
                  <span class="ring-label">{{ overallProgress }}%</span>
                </div>
                <span class="overall-sub">Average across all activities</span>
              </div>
            </div>

          </aside>

        </div>
      </template>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useDashboard } from '../composables/useDashboard'
import { useSyncQueue } from '../composables/useSyncQueue'
import { useOfflineStatus } from '../composables/useOfflineStatus'
import ActivitySummaryTable from '../components/dashboard/ActivitySummaryTable.vue'
import LocationBreakdown from '../components/dashboard/LocationBreakdown.vue'
import OnboardingBanner from '../components/onboarding/OnboardingBanner.vue'
import AppIcon from '../components/interfaces/AppIcon.vue'

definePageMeta({
  middleware: ['auth'],
  layout: false,
})

useHead({ title: 'Dashboard \u2014 DART' })

const breadcrumbs = [
  { title: 'Home', href: '/' },
  { title: 'Dashboard', href: '/dashboard', current: true },
]

const authStore = useAuthStore()

const {
  isLoading,
  error,
  demographics,
  activitySummary,
  locations,
  recentSessions,
  hasData,
  todayLabel,
  formatDate,
  fetchDashboard,
  overallProgress,
} = useDashboard()

const { isOnline, pendingCount } = useOfflineStatus()
const { isSyncing, flushQueue } = useSyncQueue()

async function handleSync() {
  await flushQueue()
  await fetchDashboard()
}

// \u2500\u2500 Deep Dive toggle
const activityDeepDive = ref(false)

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
/* \u2500\u2500 Dashboard page container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1440px;
}

/* \u2500\u2500 Greeting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.page-greeting {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0;
}

.greeting-body { flex: 1; }

.greeting-eyebrow {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0 0 0.25rem;
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
  color: var(--text-primary);
}

.greeting-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0;
}

.greeting-actions { flex-shrink: 0; }

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.sync-btn:hover:not(:disabled) {
  border-color: var(--data-teal);
  background: var(--data-teal-dim);
}
.sync-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sync-btn--syncing {
  border-color: var(--data-teal);
  color: var(--data-teal);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

/* \u2500\u2500 Loading skeleton \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.loading-skeleton { animation: fadeIn 0.3s ease; }
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 140px;
  animation: pulse 1.5s ease infinite;
}

/* \u2500\u2500 Error \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--error-bg);
  border: 1px solid rgba(255, 59, 48, 0.12);
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
  transition: background 0.15s;
}
.btn-retry:hover { background: var(--error-bg); }

/* \u2500\u2500 Empty state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2550\u2550\u2550\u2550 Three-column body layout \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
.dashboard-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
  align-items: start;
}

@media (max-width: 1100px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

/* \u2500\u2500 Center column \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.dashboard-center {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

/* ── Bento Grid ──────────────────────────────────────── */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  animation: fadeIn 0.35s ease-out;
}

.bento-item { min-width: 0; }

.bento-hero {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-hero { grid-column: auto; }
}

/* ── Metric cards ────────────────────────────────────── */
.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}
.metric-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}

/* Hero: modern top card */
.hero-modern {
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
}
.hero-modern::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, var(--data-teal-dim) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.hero-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--data-teal-dim);
  color: var(--data-teal);
}
.hero-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted, #AEAEB2);
  background: var(--hover-bg, rgba(0,0,0,0.03));
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}
.metric-primary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 22px;
}
.metric-big {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.metric-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary, #86868B);
}

/* Demographic split mini-cards */
.metric-splits-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.split-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 12px;
  background: var(--bg-input, rgba(0,0,0,0.02));
  border-radius: var(--radius-md, 16px);
  transition: background 0.15s;
}
.split-card:hover {
  background: var(--hover-bg);
}
.split-card-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--data-teal);
  margin-bottom: 2px;
}
.split-card-dot--alt {
  background: var(--data-purple);
}
.split-card-dot--muted {
  background: var(--text-muted, #AEAEB2);
}
.split-card-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary, #1D1D1F);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.split-card-label {
  font-size: 0.68rem;
  color: var(--text-muted, #AEAEB2);
  font-weight: 500;
}
@media (max-width: 480px) {
  .metric-splits-modern { grid-template-columns: 1fr; }
}

/* Activity target/actual cards */
.metric-card--activity {
  gap: 14px;
}
.metric-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.metric-pct-pill {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--hover-bg);
  padding: 3px 10px;
  border-radius: 20px;
  font-variant-numeric: tabular-nums;
}
.metric-target-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}
.metric-target-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.target-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}
.target-number--muted {
  color: var(--text-muted, #AEAEB2);
}
.target-caption {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted, #AEAEB2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.target-slash {
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--text-muted, #AEAEB2);
  line-height: 1;
  margin-bottom: 14px;
}
.metric-bar {
  height: 5px;
  background: var(--hover-bg, rgba(0,0,0,0.03));
  border-radius: 3px;
  overflow: hidden;
}
.metric-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--data-teal);
  opacity: 0.55;
  transition: width 0.5s ease;
}

/* Compact summary cards */
.metric-card--compact {
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 28px 24px;
}
.compact-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.compact-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #1D1D1F);
}
.compact-sub {
  font-size: 0.72rem;
  color: var(--text-muted, #AEAEB2);
}

/* ── Section cards (Activity Progress, Sessions) ─────── */
.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
}
.section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.section-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
}
.section-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Deep Dive button */
.deep-dive-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--data-teal-dim);
  color: var(--data-teal);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}
.deep-dive-btn:hover {
  background: rgba(45, 212, 191, 0.16);
}

/* ── Activity compact rows (actual/target priority) ──── */
.activity-compact {
  padding: 4px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.activity-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.activity-row-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.activity-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
}
.activity-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
}
.activity-actual {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.activity-sep {
  font-size: 0.85rem;
  font-weight: 300;
  color: var(--text-muted);
}
.activity-target {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-muted, #AEAEB2);
  font-variant-numeric: tabular-nums;
}
.activity-row-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
}
.activity-bar {
  flex: 1;
  height: 5px;
  background: var(--hover-bg, rgba(0,0,0,0.03));
  border-radius: 3px;
  overflow: hidden;
}
.activity-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--data-teal);
  opacity: 0.55;
  transition: width 0.5s ease;
}
.activity-pct {
  font-size: 0.72rem;
  font-weight: 600;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
  color: var(--text-secondary);
}
.activity-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Deep Dive expanded */
.activity-deep {
  animation: fadeIn 0.25s ease;
}

/* ── Session list ────────────────────────────────────── */
.session-list {
  display: flex;
  flex-direction: column;
}
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px;
  transition: background 0.12s;
}
.session-item:hover { background: var(--hover-bg-subtle); }
.session-info { display: flex; flex-direction: column; gap: 2px; }
.session-activity { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.session-location { font-size: 0.72rem; color: var(--text-muted); }
.session-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.session-presence { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.session-date { font-size: 0.72rem; color: var(--text-muted); }

/* ── Right column: Insights panel ────────────────────── */
.dashboard-insights {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: calc(var(--topbar-height, 56px) + 24px);
}
@media (max-width: 1100px) {
  .dashboard-insights {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}

/* ── Insight cards ───────────────────────────────────── */
.insight-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.insight-card--highlight {
  background: var(--data-teal-dim);
  border-color: rgba(45, 212, 191, 0.12);
}
.insight-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

/* Insight hero number */
.insight-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
}
.insight-hero-num {
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}
.insight-hero-label {
  font-size: 0.72rem;
  color: var(--text-muted, #AEAEB2);
  font-weight: 500;
}

/* Insight breakdown rows */
.insight-breakdown {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.insight-row-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.insight-row-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.insight-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary, #86868B);
}
.insight-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.insight-pct {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.insight-bar {
  height: 4px;
  background: var(--hover-bg);
  border-radius: 2px;
  overflow: hidden;
}
.insight-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--data-teal);
  opacity: 0.65;
  transition: width 0.5s ease;
}
.insight-bar-fill--alt { background: var(--data-purple); opacity: 0.55; }
.insight-bar-fill--warn { background: var(--warning); opacity: 0.50; }

/* ── Performance Snapshots ───────────────────────────── */
.perf-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.perf-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.perf-left {
  flex-shrink: 0;
}
.perf-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.82rem;
  font-weight: 700;
}
.perf-trend--up {
  background: var(--success-bg);
  color: var(--success);
}
.perf-trend--down {
  background: var(--warning-bg);
  color: var(--warning);
}
.perf-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.perf-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.perf-numbers {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.perf-actual {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.perf-sep {
  font-size: 0.72rem;
  font-weight: 300;
  color: var(--text-muted);
}
.perf-target {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.perf-pct-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.perf-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.78rem;
  padding: 8px 0;
}

/* ── Overall Progress ring ───────────────────────────── */
.overall-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.overall-ring {
  position: relative;
  width: 80px;
  height: 80px;
}
.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  stroke: var(--hover-bg);
}
.ring-fill {
  stroke: var(--data-teal);
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.overall-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
}

/* ── Animations ──────────────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 1024px) {
  .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .skeleton-grid { grid-template-columns: 1fr; }
  .dashboard-page { gap: 20px; }
}
</style>
