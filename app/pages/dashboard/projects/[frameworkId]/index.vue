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

      <!-- ═══ Project header ═══ -->
      <header class="project-hero">
        <div class="project-hero-info">
          <span class="eyebrow">Project dashboard</span>
          <h1 class="project-hero-name">{{ project.project_name }}</h1>
          <p class="project-hero-meta">
            <span>{{ formatType(project.framework_type) }}</span>
            <span v-if="project.partner_name">{{ project.partner_name }}</span>
            <span v-if="project.reporting_to">Reporting to {{ project.reporting_to }}</span>
            <span v-if="project.period_start">{{ formatDate(project.period_start) }} – {{ formatDate(project.period_end) }}</span>
          </p>
        </div>

        <div v-if="overallProgress !== null" class="project-hero-progress">
          <div class="ring ring--lg">
            <svg viewBox="0 0 36 36">
              <circle class="ring-bg" cx="18" cy="18" r="15.9155" />
              <circle class="ring-fill" cx="18" cy="18" r="15.9155" :stroke-dasharray="`${overallProgress} 100`" />
            </svg>
            <span class="ring-value">{{ overallProgress }}<small>%</small></span>
          </div>
          <span class="ring-caption">Logframe<br />progress</span>
        </div>
      </header>

      <!-- ═══ Headline numbers ═══ -->
      <section class="kpi-grid">
        <div class="kpi kpi--featured">
          <span class="kpi-label">Unique beneficiaries</span>
          <span class="kpi-value">{{ summary.unique_beneficiaries.toLocaleString() }}</span>
          <span class="kpi-foot">Enrolled across the project</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Impacts</span>
          <span class="kpi-value">{{ impactCards.length }}</span>
          <span class="kpi-foot">{{ indicatorTotal }} indicator{{ indicatorTotal === 1 ? '' : 's' }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Activities</span>
          <span class="kpi-value">{{ activeCount }}</span>
          <span class="kpi-foot">{{ activities.length - activeCount }} inactive</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Locations</span>
          <span class="kpi-value">{{ summary.total_locations ?? summary.active_locations }}</span>
          <span class="kpi-foot">{{ summary.total_service_points ?? 0 }} service points</span>
        </div>
      </section>

      <!-- ═══ Impacts ═══ -->
      <section v-if="impactCards.length" class="block">
        <div class="block-head">
          <div>
            <h2 class="block-title">Impacts</h2>
            <p class="block-hint">The change this project is working towards. Open an impact to see its targets and activities.</p>
          </div>
        </div>

        <div class="impact-grid">
          <NuxtLink
            v-for="card in impactCards"
            :key="card.id"
            :to="`/dashboard/projects/${frameworkId}/impacts/${card.id}`"
            class="impact-card"
          >
            <span class="impact-watermark" aria-hidden="true">{{ card.number }}</span>

            <div class="impact-top">
              <span class="impact-index">Impact {{ card.number }}</span>
              <div v-if="card.progress !== null" class="ring ring--sm" :title="`${card.progress}% of target reached`">
                <svg viewBox="0 0 36 36">
                  <circle class="ring-bg" cx="18" cy="18" r="15.9155" />
                  <circle class="ring-fill" cx="18" cy="18" r="15.9155" :stroke-dasharray="`${card.progress} 100`" />
                </svg>
                <span class="ring-value">{{ card.progress }}<small>%</small></span>
              </div>
              <span v-else class="impact-pill">No targets yet</span>
            </div>

            <h3 class="impact-title" :title="card.title">{{ card.title }}</h3>

            <div v-if="card.target > 0" class="impact-bar">
              <div class="impact-bar-fill" :style="{ width: `${card.progress}%` }" />
            </div>

            <div class="impact-foot">
              <div class="impact-stats">
                <span v-if="card.target > 0"><strong>{{ card.actual.toLocaleString() }}</strong> of {{ card.target.toLocaleString() }}</span>
                <span><strong>{{ card.indicators }}</strong> indicator{{ card.indicators === 1 ? '' : 's' }}</span>
                <span><strong>{{ card.activities }}</strong> activit{{ card.activities === 1 ? 'y' : 'ies' }}</span>
                <span v-if="card.children"><strong>{{ card.children }}</strong> outcome{{ card.children === 1 ? '' : 's' }}/output{{ card.children === 1 ? '' : 's' }}</span>
              </div>
              <span class="impact-go" aria-hidden="true">→</span>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- ═══ Activities ═══ -->
      <section class="block">
        <div class="block-head">
          <div>
            <h2 class="block-title">Activities <span class="block-count">{{ projectActivities.length }}</span></h2>
            <p class="block-hint">Everything delivered under this project. Click an activity to explore its data.</p>
          </div>
        </div>

        <div v-if="!projectActivities.length" class="block-empty">
          No activities on this project yet.
        </div>

        <div v-else class="activity-grid">
          <button
            v-for="a in projectActivities"
            :key="a.id"
            type="button"
            class="activity-card"
            :class="{ 'activity-card--inactive': !a.is_active }"
            @click="navigateToActivity(a)"
          >
            <div class="activity-top">
              <span v-if="a.module" class="activity-module">{{ a.module.toUpperCase() }}</span>
              <span class="activity-status" :class="{ 'activity-status--on': a.is_active }">
                {{ a.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <span class="activity-name">{{ a.name }}</span>
            <span v-if="a.code || a.pattern_type" class="activity-meta">
              {{ [a.code, a.pattern_type ? formatPattern(a.pattern_type) : ''].filter(Boolean).join(' · ') }}
            </span>

            <div class="activity-foot">
              <div class="activity-count">
                <span class="activity-count-value">{{ a.actual_count.toLocaleString() }}</span>
                <span class="activity-count-label">enrolled</span>
              </div>
              <span class="activity-links">
                {{ impactsFedBy(a.id) ? `Feeds ${impactsFedBy(a.id)} impact${impactsFedBy(a.id) === 1 ? '' : 's'}` : 'Not linked yet' }}
              </span>
            </div>
          </button>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectDetail } from '~/composables/useProjectDetail'
import { activityDashboardRoute } from '~/utils/activityConfig'
import DashboardBreadcrumb from '~/components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '~/components/interfaces/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.frameworkId as string

const {
  isLoading,
  error,
  project,
  summary,
  logframe,
  activities,
  hasData,
  activeCount,
  overallProgress,
  logframeProgress,
  formatDate,
  formatType,
  formatPattern,
  fetchProjectDetail,
} = useProjectDetail()

const breadcrumbs = computed(() => [
  { title: 'Organisation', href: '/dashboard' },
  { title: project.value.project_name || 'Project', href: route.fullPath, current: true },
])

// Every activity on the project, active first. Activities linked to an impact
// are listed here too so the project dashboard never hides one.
const projectActivities = computed(() =>
  [...activities.value].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name),
  ),
)

const indicatorTotal = computed(() => logframe.value?.indicators?.length ?? 0)

/** One card per impact, with its progress rolled up from its own indicators. */
const impactCards = computed(() =>
  (logframe.value?.levels ?? []).filter(level => level.level_type === 'impact').map((level, i) => {
    const indicators = (logframe.value?.indicators ?? []).filter(ind => ind.level_id === level.id)
    const targeted = indicators.filter(ind => ind.target_value != null && ind.target_value > 0)
    const activityIds = new Set(indicators.flatMap(ind => ind.linked_activity_ids ?? []))
    return {
      id: level.id,
      title: level.title,
      number: String(i + 1).padStart(2, '0'),
      progress: logframeProgress(level.id),
      target: targeted.reduce((sum, ind) => sum + (ind.target_value ?? 0), 0),
      actual: targeted.reduce((sum, ind) => sum + (ind.actual_value ?? 0), 0),
      indicators: indicators.length,
      activities: activityIds.size,
      children: (logframe.value?.levels ?? []).filter(l => l.parent_id === level.id).length,
    }
  }),
)

/** How many impacts an activity feeds through its linked indicators. */
const impactsByActivity = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const ind of logframe.value?.indicators ?? []) {
    for (const id of ind.linked_activity_ids ?? []) {
      if (!map.has(id)) map.set(id, new Set())
      map.get(id)!.add(ind.level_id)
    }
  }
  return map
})
function impactsFedBy(activityId: string): number {
  return impactsByActivity.value.get(activityId)?.size ?? 0
}

/** Open the activity dashboard for the module that owns the activity. */
function navigateToActivity(activity: { id: string; module?: string | null }) {
  router.push(activityDashboardRoute(activity.module, activity.id))
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


/* Layout and cards: assets/css/project-dashboard.css (.project-detail). */

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
