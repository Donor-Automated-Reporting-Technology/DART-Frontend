<template>
  <div class="activity-detail">

    <!-- Breadcrumb -->
    <DashboardBreadcrumb :crumbs="breadcrumbs" />

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="loading-skeleton">
      <div class="skeleton-header"></div>
      <div class="skeleton-grid">
        <div v-for="n in 4" :key="n" class="skeleton-card"></div>
      </div>
      <div class="skeleton-table"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="dash-error">
      <AppIcon name="alert-circle" :size="20" />
      <span>{{ error }}</span>
      <button class="btn-retry" @click="fetchActivityDetail(frameworkActivityId)">Retry</button>
    </div>

    <!-- Content -->
    <template v-else-if="hasData">

      <!-- ═══ Activity header card ═══ -->
      <div class="activity-header-card">
        <div class="activity-header-top">
          <div class="activity-header-info">
            <h1 class="activity-header-name">{{ activity.name }}</h1>
            <div class="activity-header-chips">
              <span class="chip">{{ activity.code }}</span>
              <span class="chip">{{ formatPattern(patternType) }}</span>
              <span class="chip">Target: {{ activity.target_count }} {{ activity.target_unit }}</span>
            </div>
          </div>
          <div class="activity-header-progress">
            <svg class="ring" viewBox="0 0 36 36">
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
                :stroke-dasharray="summary.percentage + ', 100'"
              />
            </svg>
            <span class="ring-label">{{ summary.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- ═══ Summary bento grid ═══ -->
      <div class="bento-grid">

        <!-- Hero: unique beneficiaries -->
        <div class="bento-item bento-hero metric-card hero-modern">
          <div class="hero-top">
            <span class="hero-badge">BENEFICIARIES</span>
          </div>
          <div class="metric-primary">
            <span class="metric-big">{{ summary.unique_children }}</span>
            <span class="metric-label">Unique {{ activity.target_unit || 'Beneficiaries' }}</span>
          </div>
          <div class="hero-compact-row">
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ summary.target }}</span>
              <span class="hero-compact-label">Target</span>
            </div>
            <div class="hero-compact-divider"></div>
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ summary.new_this_period }}</span>
              <span class="hero-compact-label">New This Period</span>
            </div>
            <div class="hero-compact-divider"></div>
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ summary.with_disability }}</span>
              <span class="hero-compact-label">With Disability</span>
            </div>
          </div>
        </div>

        <!-- Girls -->
        <div class="bento-item metric-card metric-card--reach metric-card--girls-accent">
          <div class="metric-card-head">
            <span class="metric-label">Girls</span>
            <span class="metric-pct-pill">{{ girlsPct }}%</span>
          </div>
          <div class="metric-target-row">
            <div class="metric-target-block">
              <span class="target-number target-number--girls">{{ summary.girls }}</span>
              <span class="target-caption">Enrolled</span>
            </div>
            <span class="target-slash">/</span>
            <div class="metric-target-block">
              <span class="target-number target-number--muted">{{ summary.target }}</span>
              <span class="target-caption">Target</span>
            </div>
          </div>
          <div class="metric-bar metric-bar--girls">
            <div class="metric-bar-fill metric-bar-fill--girls" :style="{ width: Math.min(girlsPct, 100) + '%' }"></div>
          </div>
        </div>

        <!-- Boys -->
        <div class="bento-item metric-card metric-card--reach metric-card--boys-accent">
          <div class="metric-card-head">
            <span class="metric-label">Boys</span>
            <span class="metric-pct-pill">{{ boysPct }}%</span>
          </div>
          <div class="metric-target-row">
            <div class="metric-target-block">
              <span class="target-number target-number--boys">{{ summary.boys }}</span>
              <span class="target-caption">Enrolled</span>
            </div>
            <span class="target-slash">/</span>
            <div class="metric-target-block">
              <span class="target-number target-number--muted">{{ summary.target }}</span>
              <span class="target-caption">Target</span>
            </div>
          </div>
          <div class="metric-bar metric-bar--boys">
            <div class="metric-bar-fill metric-bar-fill--boys" :style="{ width: Math.min(boysPct, 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- ═══ Attendance overview ═══ -->
      <div class="attendance-section">
        <div class="section-header">
          <div class="section-header-left">
            <h3 class="section-title">Attendance Overview</h3>
          </div>
        </div>
        <div class="attendance-grid">
          <div class="attendance-stat-card">
            <span class="attendance-stat-value">{{ attendance.total_sessions }}</span>
            <span class="attendance-stat-label">Total Sessions</span>
          </div>
          <div class="attendance-stat-card">
            <span class="attendance-stat-value">{{ attendance.total_present }}</span>
            <span class="attendance-stat-label">Total Present</span>
          </div>
          <div class="attendance-stat-card">
            <span class="attendance-stat-value">{{ attendance.total_absent }}</span>
            <span class="attendance-stat-label">Total Absent</span>
          </div>
          <div class="attendance-stat-card">
            <span class="attendance-stat-value" :class="rateColor(attendance.attendance_rate)">{{ attendance.attendance_rate }}%</span>
            <span class="attendance-stat-label">Attendance Rate</span>
          </div>
        </div>
      </div>

      <!-- ═══ Location breakdown chart ═══ -->
      <div v-if="sortedLocations.length" class="loc-chart-section">
        <div class="section-header">
          <div class="section-header-left">
            <h3 class="section-title">Beneficiaries by Location</h3>
            <span class="section-count">{{ sortedLocations.length }} locations</span>
          </div>
        </div>
        <div class="loc-chart-card">
          <div class="loc-chart-rows">
            <div
              v-for="loc in sortedLocations"
              :key="loc.location_id"
              class="loc-chart-row"
            >
              <span class="loc-chart-name" :title="loc.location_name">{{ loc.location_name }}</span>
              <div class="loc-chart-bar-track">
                <div
                  class="loc-chart-bar loc-chart-bar--girls"
                  :style="{ width: locBarWidth(loc.girls) + '%' }"
                  :title="'Girls: ' + loc.girls"
                ></div>
                <div
                  class="loc-chart-bar loc-chart-bar--boys"
                  :style="{ width: locBarWidth(loc.boys) + '%' }"
                  :title="'Boys: ' + loc.boys"
                ></div>
              </div>
              <span class="loc-chart-total">{{ loc.unique }}</span>
            </div>
          </div>
          <div class="trend-legend">
            <span class="legend-item"><span class="legend-dot legend-dot--girls"></span> Girls</span>
            <span class="legend-item"><span class="legend-dot legend-dot--boys"></span> Boys</span>
          </div>
        </div>
      </div>

      <!-- ═══ By Location ═══ -->
      <div v-if="sortedLocations.length" class="location-section">
        <div class="section-header">
          <div class="section-header-left">
            <h3 class="section-title">By Location</h3>
            <span class="section-count">{{ sortedLocations.length }} locations</span>
          </div>
        </div>
        <div class="location-table-wrap">
          <table class="location-table">
            <thead>
              <tr>
                <th class="th-name">Location</th>
                <th>Unique</th>
                <th>Girls</th>
                <th>Boys</th>
                <th>Disability</th>
                <th>Sessions</th>
                <th>Avg Daily</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loc in sortedLocations" :key="loc.location_id">
                <td class="td-name">{{ loc.location_name }}</td>
                <td>{{ loc.unique }}</td>
                <td>{{ loc.girls }}</td>
                <td>{{ loc.boys }}</td>
                <td>{{ loc.disability }}</td>
                <td>{{ loc.sessions_held }}</td>
                <td>{{ loc.avg_daily_present }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Recent Sessions ═══ -->
      <div v-if="sortedSessions.length" class="sessions-section">
        <div class="section-header">
          <div class="section-header-left">
            <h3 class="section-title">Recent Sessions</h3>
            <span class="section-count">{{ sortedSessions.length }}</span>
          </div>
        </div>
        <div class="sessions-table-wrap">
          <table class="sessions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Total</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sortedSessions" :key="s.id">
                <td class="td-date">{{ formatDate(s.date) }}</td>
                <td class="td-name">{{ s.location_name }}</td>
                <td>{{ s.present }}</td>
                <td>{{ s.absent }}</td>
                <td>{{ s.total }}</td>
                <td :class="rateColor(sessionRate(s))">{{ sessionRate(s) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useActivityDetail } from '../../../composables/useActivityDetail'
import DashboardBreadcrumb from '../../../components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '../../../components/interfaces/AppIcon.vue'

const route = useRoute()
const frameworkActivityId = route.params.frameworkActivityId as string

const {
  isLoading,
  error,
  patternType,
  activity,
  summary,
  attendance,
  hasData,
  sortedLocations,
  sortedSessions,
  formatDate,
  formatPattern,
  fetchActivityDetail,
} = useActivityDetail()

const breadcrumbs = computed(() => [
  { title: 'Organisation', href: '/dashboard' },
  { title: activity.value.name || 'Activity', href: route.fullPath, current: true },
])

const girlsPct = computed(() => {
  const t = summary.value.target
  return t ? Math.min(Math.round((summary.value.girls / t) * 100), 100) : 0
})

const boysPct = computed(() => {
  const t = summary.value.target
  return t ? Math.min(Math.round((summary.value.boys / t) * 100), 100) : 0
})

const locMax = computed(() => {
  let max = 0
  for (const loc of sortedLocations.value) {
    if (loc.unique > max) max = loc.unique
  }
  return max || 1
})

function locBarWidth(val: number): number {
  return Math.max((val / locMax.value) * 100, 1)
}

function rateColor(rate: number): string {
  if (rate >= 80) return 'clr-green'
  if (rate >= 50) return 'clr-yellow'
  return 'clr-red'
}

function sessionRate(s: { present: number; total: number }): number {
  return s.total ? Math.round((s.present / s.total) * 100) : 0
}

onMounted(() => fetchActivityDetail(frameworkActivityId))
</script>

<style scoped>
/* ── Loading skeleton ──────────────────────────────── */
.loading-skeleton { animation: fadeIn 0.3s ease; display: flex; flex-direction: column; gap: 24px; }
.skeleton-header {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 120px;
  animation: pulse 1.5s ease infinite;
}
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 140px;
  animation: pulse 1.5s ease infinite;
}
.skeleton-table {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 300px;
  animation: pulse 1.5s ease infinite;
}

/* ── Error ───────────────────────────────────────── */
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

/* ═══ Layout ═════════════════════════════════════ */
.activity-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ═══ Activity header card ════════════════════════ */
.activity-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.activity-header-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, var(--primary-dim) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.activity-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  position: relative;
}
.activity-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.activity-header-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.025em;
  line-height: 1.25;
}
.activity-header-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Progress ring */
.activity-header-progress {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}
.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  stroke: var(--hover-bg, rgba(0, 0, 0, 0.06));
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
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* ═══ Bento grid (summary) ════════════════════════ */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  animation: fadeIn 0.35s ease-out;
}
.bento-item { min-width: 0; }
.bento-hero { grid-column: 1 / -1; }
@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-hero { grid-column: auto; }
}

/* ── Metric cards ────────────────────────────────── */
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

.hero-modern {
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
.hero-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted, #AEAEB2);
  background: var(--hover-bg, rgba(0, 0, 0, 0.03));
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

/* Hero compact row */
.hero-compact-row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 14px 0 0;
  border-top: 1px solid var(--border-subtle);
}
.hero-compact-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.hero-compact-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.hero-compact-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.hero-compact-divider {
  width: 1px;
  height: 28px;
  background: var(--border-subtle);
  flex-shrink: 0;
}

/* ── Reach cards ─────────────────────────────────── */
.metric-card--reach { gap: 14px; }
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
.target-number--muted { color: var(--text-muted, #AEAEB2); }
.target-number--girls { color: var(--data-teal); }
.target-number--boys { color: var(--data-purple); }
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
  background: var(--hover-bg, rgba(0, 0, 0, 0.03));
  border-radius: 3px;
  overflow: hidden;
}
.metric-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.metric-bar-fill--girls { background: var(--data-teal); opacity: 0.7; }
.metric-bar-fill--boys { background: var(--data-purple); opacity: 0.7; }

/* Card accent tints */
[data-theme="light"] .metric-card--girls-accent { background: var(--data-teal-dim); border-color: rgba(13, 148, 136, 0.12); }
[data-theme="light"] .metric-card--boys-accent { background: var(--data-purple-dim); border-color: rgba(124, 58, 237, 0.12); }

/* ═══ Shared chips ════════════════════════════════ */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}

/* ═══ Section shared styles ═══════════════════════ */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

/* ═══ Attendance overview ═════════════════════════ */
.attendance-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.attendance-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 640px) {
  .attendance-grid { grid-template-columns: repeat(2, 1fr); }
}
.attendance-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.attendance-stat-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}
.attendance-stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.attendance-stat-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ═══ Location breakdown chart ═════════════════════ */
.loc-chart-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.loc-chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  padding: 24px;
}
.loc-chart-rows {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.loc-chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.loc-chart-name {
  width: 120px;
  min-width: 120px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc-chart-bar-track {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 22px;
  background: var(--hover-bg, rgba(0, 0, 0, 0.03));
  border-radius: 6px;
  overflow: hidden;
}
.loc-chart-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
  min-width: 2px;
}
.loc-chart-bar--girls { background: var(--data-teal); opacity: 0.8; }
.loc-chart-bar--boys { background: var(--data-purple); opacity: 0.7; }
.loc-chart-total {
  min-width: 36px;
  text-align: right;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.legend-dot--girls { background: var(--data-teal); opacity: 0.8; }
.legend-dot--boys { background: var(--data-purple); opacity: 0.7; }
.trend-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 500;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.legend-dot--present { background: var(--data-teal); opacity: 0.8; }
.legend-dot--absent { background: var(--data-purple); opacity: 0.7; }

/* ═══ Location table ══════════════════════════════ */
.location-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.location-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  overflow: hidden;
}
.location-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.location-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface, rgba(0, 0, 0, 0.015));
}
.location-table td {
  padding: 12px 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  font-variant-numeric: tabular-nums;
}
.location-table tbody tr:last-child td {
  border-bottom: none;
}
.location-table tbody tr:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.02));
}
.th-name { min-width: 160px; }
.td-name {
  font-weight: 600;
  color: var(--text-primary);
}

/* ═══ Sessions table ══════════════════════════════ */
.sessions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sessions-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  overflow: hidden;
}
.sessions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.sessions-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface, rgba(0, 0, 0, 0.015));
}
.sessions-table td {
  padding: 12px 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  font-variant-numeric: tabular-nums;
}
.sessions-table tbody tr:last-child td {
  border-bottom: none;
}
.sessions-table tbody tr:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.02));
}
.td-date {
  white-space: nowrap;
  font-weight: 500;
}

/* ═══ Color helpers ═══════════════════════════════ */
.clr-green { color: var(--progress-high, #34C759); }
.clr-yellow { color: var(--progress-mid, #FF9500); }
.clr-red { color: var(--progress-low, #FF3B30); }

/* ═══ Animations ══════════════════════════════════ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ═══ Mobile ══════════════════════════════════════ */
@media (max-width: 640px) {
  .activity-header-top { flex-direction: column; gap: 16px; }
  .activity-header-progress { align-self: flex-start; }
  .location-table-wrap, .sessions-table-wrap { overflow-x: auto; }
  .location-table, .sessions-table { min-width: 600px; }
}
</style>
