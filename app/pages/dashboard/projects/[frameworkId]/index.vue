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

      <!-- ═══ Header ═══ -->
      <header class="dash-head">
        <div class="dash-head-info">
          <span class="eyebrow">{{ formatType(project.framework_type) }} · Project dashboard</span>
          <h1 class="dash-title">{{ project.project_name }}</h1>
          <p class="dash-meta">
            <span v-if="project.partner_name"><i class="dot" />Partner: {{ project.partner_name }}</span>
            <span v-if="project.reporting_to"><i class="dot" />Reporting to {{ project.reporting_to }}</span>
            <span v-if="logframe"><i class="dot" />Logframe: {{ logframe.name }}</span>
          </p>
        </div>

        <div v-if="project.period_start && project.period_end" class="period">
          <div class="period-head">
            <span>{{ formatDate(project.period_start) }} – {{ formatDate(project.period_end) }}</span>
            <strong v-if="expected !== null" class="num">{{ expected }}%</strong>
          </div>
          <div class="meter"><i :style="{ width: `${expected ?? 0}%` }" /></div>
          <span class="period-note">{{ periodNote }}</span>
        </div>
      </header>

      <!-- ═══ Headline figures ═══ -->
      <section class="kpis" aria-label="Headline figures">
        <div class="kpi kpi--featured">
          <span class="kpi-label">Unique beneficiaries</span>
          <span class="kpi-value num">{{ formatNumber(summary.unique_beneficiaries) }}</span>
          <span class="kpi-foot">Enrolled across all activities</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Logframe progress</span>
          <span class="kpi-value num">{{ overallProgress === null ? '—' : `${overallProgress}%` }}</span>
          <div v-if="overallProgress !== null" class="meter"><i :style="{ width: `${overallProgress}%` }" /></div>
          <span class="kpi-foot">{{ overallProgress === null ? 'No numerical targets yet' : `${formatNumber(totals.actual)} of ${formatNumber(totals.target)} targeted` }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Indicators on track</span>
          <span class="kpi-value num">{{ onTrack }}<small> of {{ targetedCount }}</small></span>
          <span class="kpi-foot">{{ expected === null ? 'Set project dates to judge pace' : `Against ${expected}% of the period passed` }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Activities</span>
          <span class="kpi-value num">{{ activeCount }}</span>
          <span class="kpi-foot">{{ activityFoot }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Locations</span>
          <span class="kpi-value num">{{ summary.total_locations ?? summary.active_locations }}</span>
          <span class="kpi-foot">{{ summary.total_service_points ?? 0 }} service points</span>
        </div>
        <div class="kpi" :class="{ 'kpi--alert': needsSetup > 0 }">
          <span class="kpi-label">Needs setup</span>
          <span class="kpi-value num">{{ needsSetup }}<small> of {{ rows.length }}</small></span>
          <span class="kpi-foot">{{ needsSetup ? 'Indicators missing a target or link' : 'Every indicator is set up' }}</span>
        </div>
      </section>

      <!-- ═══ Summary panels ═══ -->
      <section class="grid2" :class="{ 'grid2--single': !impactColumns.length }">
        <ProjectReachPanel :disaggregations="disaggregations" :summary="summary" />
        <ProjectImpactColumns
          v-if="impactColumns.length"
          :impacts="impactColumns"
          :expected="expected"
          :selected="impactFilter"
          @select="impactFilter = $event"
        />
      </section>

      <!-- ═══ Indicators ═══ -->
      <ProjectIndicatorList
        :groups="groups"
        :expected="expected"
        :impact-filter="impactFilter"
        @clear-impact="impactFilter = null"
      />

      <p class="dash-foot">
        Logframe progress adds indicator targets and actuals together, and the same people can count towards several
        indicators, so it is not a count of unique people. Status compares each indicator with how much of the project
        period has passed: at least 90% of the expected pace is on track, 60–89% needs attention and under 60% is behind.
      </p>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectDetail } from '~/composables/useProjectDetail'
import DashboardBreadcrumb from '~/components/dashboard/DashboardBreadcrumb.vue'
import ProjectReachPanel from '~/components/dashboard/project/ProjectReachPanel.vue'
import ProjectImpactColumns from '~/components/dashboard/project/ProjectImpactColumns.vue'
import ProjectIndicatorList from '~/components/dashboard/project/ProjectIndicatorList.vue'
import AppIcon from '~/components/interfaces/AppIcon.vue'
import {
  formatNumber,
  hasTarget,
  impactAncestor,
  indicatorChecks,
  levelTypeLabel,
  paceStatus,
  periodElapsed,
  type IndicatorGroup,
  type IndicatorRow,
} from '~/utils/projectDashboard'

const route = useRoute()
const frameworkId = route.params.frameworkId as string

const {
  isLoading,
  error,
  project,
  summary,
  disaggregations,
  logframe,
  activities,
  hasData,
  activeCount,
  overallProgress,
  logframeProgress,
  formatDate,
  formatType,
  fetchProjectDetail,
} = useProjectDetail()

const breadcrumbs = computed(() => [
  { title: 'Organisation', href: '/dashboard' },
  { title: project.value.project_name || 'Project', href: route.fullPath, current: true },
])

const levels = computed(() => logframe.value?.levels ?? [])
const indicators = computed(() => logframe.value?.indicators ?? [])

// ── Pace ──────────────────────────────────────────
const expected = computed(() => periodElapsed(project.value.period_start, project.value.period_end))

const periodNote = computed(() => {
  if (expected.value === null) return 'Project dates are not valid'
  if (expected.value === 0) return 'Not started yet'
  if (expected.value === 100) return 'Project period has ended'
  return 'of the project period has passed'
})

// ── Indicator rows ────────────────────────────────
const activityById = computed(() => new Map(activities.value.map(a => [a.id, a])))

const rows = computed<IndicatorRow[]>(() =>
  indicators.value.map((ind) => {
    const progress = hasTarget(ind.target_value) ? Math.round(ind.percentage) : null
    const checks = indicatorChecks(ind)
    return {
      ind,
      progress,
      status: paceStatus(progress, expected.value),
      checks,
      issues: checks.filter(c => c.level === 'warn').length,
      levelLabel: ind.level_type === 'impact' ? '' : `${levelTypeLabel(ind.level_type)}: ${ind.level_title}`,
      fieldCount: ind.target_fields?.length ?? 0,
      activities: (ind.linked_activity_ids ?? [])
        .map(id => activityById.value.get(id))
        .filter((a): a is NonNullable<typeof a> => !!a),
    }
  }),
)

const totals = computed(() => {
  const targeted = indicators.value.filter(ind => hasTarget(ind.target_value))
  return {
    target: targeted.reduce((sum, ind) => sum + (ind.target_value ?? 0), 0),
    actual: targeted.reduce((sum, ind) => sum + (ind.actual_value ?? 0), 0),
  }
})

const targetedCount = computed(() => rows.value.filter(r => r.progress !== null).length)
const onTrack = computed(() => rows.value.filter(r => r.status === 'good' || r.status === 'achieved').length)
const needsSetup = computed(() => rows.value.filter(r => r.issues > 0).length)

// ── Activities ────────────────────────────────────
const linkedActivityIds = computed(() => new Set(indicators.value.flatMap(ind => ind.linked_activity_ids ?? [])))
const activityFoot = computed(() => {
  const inactive = activities.value.length - activeCount.value
  const unlinked = activities.value.filter(a => !linkedActivityIds.value.has(a.id)).length
  return [
    inactive ? `${inactive} inactive` : 'All active',
    unlinked ? `${unlinked} not linked to an indicator` : '',
  ].filter(Boolean).join(' · ')
})

// ── Impacts ───────────────────────────────────────
const impacts = computed(() => levels.value.filter(l => l.level_type === 'impact'))

const impactColumns = computed(() =>
  impacts.value.map((level, i) => {
    const progress = logframeProgress(level.id)
    return {
      id: level.id,
      number: String(i + 1).padStart(2, '0'),
      title: level.title,
      progress,
      status: paceStatus(progress, expected.value),
    }
  }),
)

/** Indicators under the impact they roll up to; the rest go last. */
const groups = computed<IndicatorGroup[]>(() => {
  const byImpact = new Map<string, IndicatorRow[]>()
  const loose: IndicatorRow[] = []
  for (const row of rows.value) {
    const impact = impactAncestor(row.ind.level_id, levels.value)
    if (!impact) { loose.push(row); continue }
    if (!byImpact.has(impact.id)) byImpact.set(impact.id, [])
    byImpact.get(impact.id)!.push(row)
  }

  const out: IndicatorGroup[] = impactColumns.value
    .filter(col => byImpact.has(col.id))
    .map(col => ({
      id: col.id,
      number: col.number,
      title: col.title,
      progress: col.progress,
      link: `/dashboard/projects/${frameworkId}/impacts/${col.id}`,
      rows: byImpact.get(col.id)!,
    }))
  if (loose.length) {
    out.push({ id: 'other', number: '', title: impacts.value.length ? 'Not under an impact' : 'All indicators', progress: null, link: null, rows: loose })
  }
  return out
})

const impactFilter = ref<string | null>(null)

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
