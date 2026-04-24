<template>
  <div class="project-detail">

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
      <button class="btn-retry" @click="fetchProjectDetail(frameworkId)">Retry</button>
    </div>

    <!-- Content -->
    <template v-else-if="hasData">

      <!-- ═══ Project header card ═══ -->
      <div class="project-header-card">
        <div class="project-header-top">
          <div class="project-header-info">
            <h1 class="project-header-name">{{ project.project_name }}</h1>
            <div class="project-header-chips">
              <span class="chip">
                <AppIcon name="layers" :size="12" />
                {{ formatType(project.framework_type) }}
              </span>
              <span class="chip">
                <AppIcon name="users" :size="12" />
                {{ project.partner_name }}
              </span>
              <span class="chip">
                <AppIcon name="briefcase" :size="12" />
                {{ project.reporting_to }}
              </span>
              <span class="chip">
                <AppIcon name="calendar" :size="12" />
                {{ formatDate(project.period_start) }} — {{ formatDate(project.period_end) }}
              </span>
            </div>
          </div>
          <div class="project-header-progress">
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
                :stroke-dasharray="overallProgress + ', 100'"
              />
            </svg>
            <span class="ring-label">{{ overallProgress }}%</span>
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
            <span class="metric-big">{{ summary.unique_beneficiaries }}</span>
            <span class="metric-label">Unique Beneficiaries</span>
          </div>
          <div class="hero-compact-row">
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ summary.total_locations }}</span>
              <span class="hero-compact-label">Locations</span>
            </div>
            <div class="hero-compact-divider"></div>
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ activeCount }}</span>
              <span class="hero-compact-label">Activities</span>
            </div>
            <div class="hero-compact-divider"></div>
            <div class="hero-compact-item">
              <span class="hero-compact-value">{{ summary.total_service_points }}</span>
              <span class="hero-compact-label">Service Points</span>
            </div>
          </div>
        </div>

        <!-- Girls: actual / target -->
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
              <span class="target-number target-number--muted">{{ summary.target_breakdown.girls }}</span>
              <span class="target-caption">Target</span>
            </div>
          </div>
          <div class="metric-bar metric-bar--girls">
            <div class="metric-bar-fill metric-bar-fill--girls" :style="{ width: Math.min(girlsPct, 100) + '%' }"></div>
          </div>
        </div>

        <!-- Boys: actual / target -->
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
              <span class="target-number target-number--muted">{{ summary.target_breakdown.boys }}</span>
              <span class="target-caption">Target</span>
            </div>
          </div>
          <div class="metric-bar metric-bar--boys">
            <div class="metric-bar-fill metric-bar-fill--boys" :style="{ width: Math.min(boysPct, 100) + '%' }"></div>
          </div>
        </div>

        <!-- Disability: actual / target -->
        <div class="bento-item metric-card metric-card--reach metric-card--disability-accent">
          <div class="metric-card-head">
            <span class="metric-label">With Disability</span>
            <span class="metric-pct-pill">{{ disabilityPct }}%</span>
          </div>
          <div class="metric-target-row">
            <div class="metric-target-block">
              <span class="target-number target-number--disability">{{ summary.with_disability }}</span>
              <span class="target-caption">Enrolled</span>
            </div>
            <span class="target-slash">/</span>
            <div class="metric-target-block">
              <span class="target-number target-number--muted">{{ disabilityTarget }}</span>
              <span class="target-caption">Target</span>
            </div>
          </div>
          <div class="metric-bar metric-bar--disability">
            <div class="metric-bar-fill metric-bar-fill--disability" :style="{ width: Math.min(disabilityPct, 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- ═══ Activities section ═══ -->
      <div class="activities-section">
        <div class="section-header">
          <div class="section-header-left">
            <h3 class="section-title">Active Activities</h3>
            <span class="section-count">{{ sortedActivities.length }}</span>
          </div>
          <span class="section-hint">
            <AppIcon name="mouse-pointer" :size="12" />
            Click to explore
          </span>
        </div>

        <div v-if="sortedActivities.length === 0" class="section-empty">
          No active activities in this project.
        </div>

        <div v-else class="activity-grid">
          <div
            v-for="a in sortedActivities"
            :key="a.id"
            class="activity-card"
            @click="navigateToActivity(a.id)"
          >
            <!-- Top: name + arrow -->
            <div class="activity-card-top">
              <div class="activity-card-title-block">
                <span class="activity-card-name">{{ a.name }}</span>
                <span class="activity-card-code">{{ a.code }}</span>
              </div>
              <span class="status-dot status-dot--active" title="Active"></span>
              <AppIcon name="chevron-right" :size="16" class="activity-arrow" />
            </div>

            <!-- Chips: pattern + target unit -->
            <div class="activity-chips">
              <span class="chip">
                <AppIcon name="git-branch" :size="12" />
                {{ formatPattern(a.pattern_type) }}
              </span>
              <span class="chip">
                <AppIcon name="target" :size="12" />
                {{ a.target_count }} {{ a.target_unit }}
              </span>
            </div>

            <!-- Stats row -->
            <div class="activity-stats">
              <div class="activity-stat">
                <span class="activity-stat-value">{{ a.actual_count }} <span class="activity-stat-of">/ {{ a.target_count }}</span></span>
                <span class="activity-stat-label">Enrolled</span>
              </div>
              <div class="activity-stat-divider"></div>
              <div class="activity-stat">
                <span class="activity-stat-value" :class="pctColor(a.percentage)">{{ a.percentage }}%</span>
                <span class="activity-stat-label">Progress</span>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="activity-progress">
              <div class="activity-progress-track">
                <div
                  class="activity-progress-fill"
                  :class="pctColor(a.percentage)"
                  :style="{ width: Math.min(a.percentage, 100) + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectDetail } from '../../../composables/useProjectDetail'
import DashboardBreadcrumb from '../../../components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '../../../components/interfaces/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.frameworkId as string

const {
  isLoading,
  error,
  project,
  summary,
  activities,
  hasData,
  sortedActivities,
  activeCount,
  overallProgress,
  formatDate,
  formatType,
  formatPattern,
  fetchProjectDetail,
} = useProjectDetail()

const breadcrumbs = computed(() => [
  { title: 'Organisation', href: '/dashboard' },
  { title: project.value.project_name || 'Project', href: route.fullPath, current: true },
])

const disabilityTarget = computed(() =>
  summary.value.target_breakdown.girls_with_disability + summary.value.target_breakdown.boys_with_disability,
)

const girlsPct = computed(() => {
  const t = summary.value.target_breakdown.girls
  return t ? Math.min(Math.round((summary.value.girls / t) * 100), 100) : 0
})

const boysPct = computed(() => {
  const t = summary.value.target_breakdown.boys
  return t ? Math.min(Math.round((summary.value.boys / t) * 100), 100) : 0
})

const disabilityPct = computed(() => {
  const t = disabilityTarget.value
  return t ? Math.min(Math.round((summary.value.with_disability / t) * 100), 100) : 0
})

function pctColor(pct: number): string {
  if (pct >= 80) return 'clr-green'
  if (pct >= 50) return 'clr-yellow'
  return 'clr-red'
}

function navigateToActivity(id: string) {
  router.push(`/dashboard/activities/${id}`)
}

onMounted(() => fetchProjectDetail(frameworkId))
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

/* ═══ Project header card ═════════════════════════ */
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.project-header-card::before {
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
.project-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  position: relative;
}
.project-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-header-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.025em;
  line-height: 1.25;
}
.project-header-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Progress ring in header */
.project-header-progress {
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
  stroke: var(--hover-bg, rgba(0,0,0,0.06));
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

/* Hero compact row (locations / activities) */
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

/* ── Reach cards (actual / target) ───────────────── */
.metric-card--reach {
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
.target-number--muted { color: var(--text-muted, #AEAEB2); }
.target-number--girls { color: var(--data-teal); }
.target-number--boys { color: var(--data-purple); }
.target-number--disability { color: var(--warning); }
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
  transition: width 0.5s ease;
}
.metric-bar-fill--girls { background: var(--data-teal); opacity: 0.7; }
.metric-bar-fill--boys { background: var(--data-purple); opacity: 0.7; }
.metric-bar-fill--disability { background: var(--warning); opacity: 0.7; }

/* Card accent tints (light mode) */
[data-theme="light"] .metric-card--girls-accent { background: var(--data-teal-dim); border-color: rgba(13, 148, 136, 0.12); }
[data-theme="light"] .metric-card--boys-accent { background: var(--data-purple-dim); border-color: rgba(124, 58, 237, 0.12); }
[data-theme="light"] .metric-card--disability-accent { background: rgba(255, 149, 0, 0.06); border-color: rgba(255, 149, 0, 0.12); }

/* Bento grid: 3 columns for reach cards */
@media (min-width: 900px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .bento-hero { grid-column: 1 / -1; }
}

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

/* ═══ Activities section ══════════════════════════ */
.activities-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
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
.section-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}
.section-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

/* ── Activity grid ───────────────────────────────── */
.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
@media (max-width: 480px) {
  .activity-grid { grid-template-columns: 1fr; }
}

/* ── Activity card ───────────────────────────────── */
.activity-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s ease;
}
.activity-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  border: 1.5px solid transparent;
  pointer-events: none;
  transition: border-color 0.2s ease;
}
.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
.activity-card:hover::after {
  border-color: var(--primary);
}
.activity-card:active {
  transform: scale(0.99);
}
.activity-card--inactive {
  opacity: 0.6;
}

/* Card top row */
.activity-card-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.activity-card-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.activity-card-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.activity-card-code {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  letter-spacing: 0.02em;
}

/* Status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
.status-dot--active {
  background: var(--success, #34C759);
  box-shadow: 0 0 6px rgba(52, 199, 89, 0.4);
}
.status-dot--inactive {
  background: var(--text-muted, #AEAEB2);
}

/* Arrow */
.activity-arrow {
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}
.activity-card:hover .activity-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
}

/* Chips */
.activity-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Stats row */
.activity-stats {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.activity-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.activity-stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.activity-stat-value.clr-green { color: var(--progress-high); }
.activity-stat-value.clr-yellow { color: var(--progress-mid); }
.activity-stat-value.clr-red { color: var(--progress-low); }
.activity-stat-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.activity-stat-of {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
}
.activity-stat-divider {
  width: 1px;
  height: 28px;
  background: var(--border-subtle);
  flex-shrink: 0;
}

/* Progress bar */
.activity-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.activity-progress-track {
  height: 5px;
  background: var(--hover-bg);
  border-radius: 3px;
  overflow: hidden;
}
.activity-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.activity-progress-fill.clr-green { background: var(--progress-high); }
.activity-progress-fill.clr-yellow { background: var(--progress-mid); }
.activity-progress-fill.clr-red { background: var(--progress-low); }

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
  .project-header-top { flex-direction: column; gap: 16px; }
  .project-header-progress { align-self: flex-start; }
  .activity-arrow { opacity: 0.5; transform: translateX(0); }
}
</style>
