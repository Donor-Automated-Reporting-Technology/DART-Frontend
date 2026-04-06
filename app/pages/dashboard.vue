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
          <select v-model="period" class="period-select">
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
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

            <!-- Bento metrics grid -->
            <div class="bento-grid">
              <DashStatCard
                class="bento-item bento-hero"
                label="Total Beneficiaries"
                :value="demographics.total_beneficiaries"
                sub="Registered across all locations"
                icon="users"
                icon-color="primary"
                :accent="true"
              />
              <DashStatCard
                class="bento-item"
                label="Active Activities"
                :value="activitySummary.length"
                sub="In current period"
                icon="activity"
                icon-color="success"
              />
              <DashStatCard
                class="bento-item"
                label="Locations"
                :value="locations.length"
                sub="Service points"
                icon="map-pin"
                icon-color="accent"
              />
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

              <!-- Compact view -->
              <div v-if="!activityDeepDive" class="activity-compact">
                <div v-for="a in activitySummary" :key="a.code" class="activity-row">
                  <span class="activity-name">{{ a.name }}</span>
                  <div class="activity-bar-group">
                    <div class="activity-bar">
                      <div
                        class="activity-bar-fill"
                        :class="barColor(a.percentage)"
                        :style="{ width: Math.min(a.percentage, 100) + '%' }"
                      />
                    </div>
                    <span class="activity-pct" :class="barColor(a.percentage)">{{ a.percentage }}%</span>
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

            <!-- Beneficiary Snapshot -->
            <div class="insight-card">
              <h4 class="insight-title">Beneficiary Snapshot</h4>

              <div class="insight-metric">
                <div class="insight-row">
                  <span class="insight-label">Girls & Women</span>
                  <span class="insight-value">{{ demographics.girls_women }}</span>
                </div>
                <div class="insight-bar">
                  <div class="insight-bar-fill" :style="{ width: girlsPct + '%' }"></div>
                </div>
                <span class="insight-pct">{{ girlsPct }}% of total</span>
              </div>

              <div class="insight-metric">
                <div class="insight-row">
                  <span class="insight-label">Boys & Men</span>
                  <span class="insight-value">{{ demographics.boys_men }}</span>
                </div>
                <div class="insight-bar">
                  <div class="insight-bar-fill insight-bar-fill--alt" :style="{ width: boysPct + '%' }"></div>
                </div>
                <span class="insight-pct">{{ boysPct }}% of total</span>
              </div>

              <div class="insight-metric">
                <div class="insight-row">
                  <span class="insight-label">With Disability</span>
                  <span class="insight-value">{{ demographics.with_disability }}</span>
                </div>
                <div class="insight-bar">
                  <div class="insight-bar-fill insight-bar-fill--warn" :style="{ width: disabilityPct + '%' }"></div>
                </div>
                <span class="insight-pct">{{ disabilityPct }}% inclusive reach</span>
              </div>
            </div>

            <!-- Performance Snapshots (YouTube-style trends) -->
            <div class="insight-card">
              <h4 class="insight-title">Performance Snapshots</h4>
              <div class="perf-list">
                <div v-for="a in activitySummary" :key="a.code" class="perf-item">
                  <div class="perf-info">
                    <span class="perf-name">{{ a.name }}</span>
                    <span class="perf-detail">{{ a.actual }} / {{ a.target }}</span>
                  </div>
                  <div
                    class="perf-trend"
                    :class="a.percentage >= 50 ? 'perf-trend--up' : 'perf-trend--down'"
                  >
                    <span class="perf-arrow">{{ a.percentage >= 50 ? '\u2191' : '\u2193' }}</span>
                    <span class="perf-pct">{{ a.percentage }}%</span>
                  </div>
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
import DashStatCard from '../components/dashboard/DashStatCard.vue'
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
  period,
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

function barColor(pct: number): string {
  if (pct >= 80) return 'clr-green'
  if (pct >= 50) return 'clr-yellow'
  return 'clr-red'
}

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
  color: var(--primary);
}

.greeting-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0;
}

.greeting-actions { flex-shrink: 0; }

.period-select {
  padding: 8px 32px 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2386868B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  transition: border-color 0.15s;
}

.period-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring, rgba(0, 122, 255, 0.2));
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

/* \u2500\u2500 Bento Grid \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
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

/* \u2500\u2500 Section cards (Activity Progress, Sessions) \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
  background: var(--primary-dim);
  color: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}
.deep-dive-btn:hover {
  background: var(--primary-hover);
}

/* \u2500\u2500 Compact activity rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.activity-compact {
  padding: 4px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.activity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.activity-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
  flex-shrink: 0;
}

.activity-bar-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 280px;
}

.activity-bar {
  flex: 1;
  height: 6px;
  background: var(--hover-bg);
  border-radius: 3px;
  overflow: hidden;
}

.activity-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.activity-bar-fill.clr-green,
.activity-bar-fill.clr-yellow,
.activity-bar-fill.clr-red { background: var(--primary); }

.activity-pct {
  font-size: 0.75rem;
  font-weight: 600;
  width: 40px;
  text-align: right;
  flex-shrink: 0;
  color: var(--primary);
}

.activity-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* \u2500\u2500 Deep Dive expanded \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.activity-deep {
  animation: fadeIn 0.25s ease;
}

/* \u2500\u2500 Session list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
.session-presence { font-size: 0.82rem; font-weight: 600; color: var(--primary); }
.session-date { font-size: 0.72rem; color: var(--text-muted); }

/* \u2500\u2500 Right column: Insights panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Insight cards \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
  background: var(--primary-dim);
  border-color: rgba(0, 122, 255, 0.12);
}

.insight-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

/* \u2500\u2500 Insight metrics \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.insight-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insight-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.insight-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.insight-value {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.insight-pct {
  font-size: 0.7rem;
  color: var(--text-muted);
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
  background: var(--primary);
  transition: width 0.5s ease;
}
.insight-bar-fill--alt { background: var(--primary); opacity: 0.7; }
.insight-bar-fill--warn { background: var(--primary); opacity: 0.5; }

/* \u2500\u2500 Performance Snapshots (YouTube-style) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.perf-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.perf-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.perf-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
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

.perf-detail {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.perf-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.perf-trend--up {
  background: var(--primary-dim);
  color: var(--primary);
}

.perf-trend--down {
  background: rgba(0, 122, 255, 0.06);
  color: var(--text-muted);
}

.perf-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.78rem;
  padding: 8px 0;
}

/* \u2500\u2500 Overall Progress ring \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
  stroke: var(--primary);
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

/* \u2500\u2500 Animations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* \u2500\u2500 Responsive \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (max-width: 1024px) {
  .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .skeleton-grid { grid-template-columns: 1fr; }
  .dashboard-page { gap: 20px; }
}
</style>
