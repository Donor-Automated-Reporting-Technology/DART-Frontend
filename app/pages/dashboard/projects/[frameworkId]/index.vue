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
        <span class="eyebrow">{{ formatType(project.framework_type) }} · Project dashboard</span>
        <h1 class="dash-title">{{ project.project_name }}</h1>
        <div v-if="canExport" class="dash-head-actions">
          <button type="button" class="tu-btn tu-btn--ghost" :disabled="exporting" @click="exportProject">
            <AppIcon name="download" :size="16" />
            {{ exporting ? 'Preparing…' : 'Download project Excel' }}
          </button>
          <span class="tu-muted">All beneficiaries (every location) + one sheet per activity</span>
          <span v-if="exportError" class="tu-muted" style="color: var(--error)">{{ exportError }}</span>
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
          <span class="kpi-foot">{{ paceNote }}</span>
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
      <section class="grid2" :class="{ 'grid2--single': !impactCards.length }">
        <ProjectReachPanel :disaggregations="disaggregations" :summary="summary" />
        <ProjectYearProgress
          v-if="impactYears.length"
          :impacts="impactYears"
          :current-year="currentYear"
          :active="activeImpact"
          @select="activeImpact = $event"
        />
        <ProjectImpactColumns
          v-else-if="impactCards.length"
          :impacts="impactCards"
          :expected="expected"
          :selected="activeImpact"
          @select="activeImpact = $event ?? activeImpact"
        />
      </section>

      <!-- ═══ Indicators ═══ -->
      <ProjectIndicatorList
        :groups="groups"
        :expected="expected"
        :active="activeImpact"
        @select="activeImpact = $event"
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
import ProjectYearProgress from '~/components/dashboard/project/ProjectYearProgress.vue'
import ProjectIndicatorList from '~/components/dashboard/project/ProjectIndicatorList.vue'
import AppIcon from '~/components/interfaces/AppIcon.vue'
import { useAuthStore } from '~/stores/auth'
import { canDownloadData, downloadFile } from '~/services/teamupApi'
import {
  currentYearIndex,
  formatNumber,
  hasTarget,
  impactAncestor,
  indicatorChecks,
  indicatorHasData,
  indicatorProgress,
  levelTypeLabel,
  paceStatus,
  periodElapsed,
  yearLabel,
  type ImpactYears,
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

const paceNote = computed(() => {
  if (expected.value === null) return 'Set project dates to judge pace'
  if (expected.value === 0) return 'Project has not started yet'
  return `Against ${expected.value}% of the period passed`
})

const years = computed(() => project.value.years ?? [])
const currentYear = computed(() => currentYearIndex(years.value))

// ── Indicator rows ────────────────────────────────
const activityById = computed(() => new Map(activities.value.map(a => [a.id, a])))

const rows = computed<IndicatorRow[]>(() =>
  indicators.value.map((ind) => {
    const progress = indicatorProgress(ind)
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

/** Indicator rows under each impact (outcomes and outputs included). */
const rowsByImpact = computed(() => {
  const map = new Map<string, IndicatorRow[]>()
  for (const row of rows.value) {
    const impact = impactAncestor(row.ind.level_id, levels.value)
    const key = impact?.id ?? 'other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return map
})

/** Progress of a set of rows against their numerical targets. */
function rollup(list: IndicatorRow[]): number | null {
  const targeted = list.filter(r => hasTarget(r.ind.target_value))
  if (!targeted.length) {
    const measured = list.filter(r => r.progress !== null)
    return measured.length ? Math.round(measured.reduce((s, r) => s + r.progress!, 0) / measured.length) : null
  }
  const target = targeted.reduce((s, r) => s + (r.ind.target_value ?? 0), 0)
  const actual = targeted.reduce((s, r) => s + r.ind.actual_value, 0)
  return Math.min(Math.round((actual / target) * 100), 100)
}

/** Impacts numbered in logframe order, those with data first. */
const impactCards = computed(() => {
  const cards = impacts.value.map((level, i) => {
    const list = rowsByImpact.value.get(level.id) ?? []
    const progress = rollup(list)
    return {
      id: level.id,
      number: String(i + 1).padStart(2, '0'),
      title: level.title,
      rows: list,
      progress,
      status: paceStatus(progress, expected.value),
      hasData: list.some(r => indicatorHasData(r.ind)),
    }
  })
  return [...cards.filter(c => c.hasData), ...cards.filter(c => !c.hasData)]
})

const impactYears = computed<ImpactYears[]>(() => {
  if (!years.value.length) return []
  const today = new Date().toISOString().slice(0, 10)
  return impactCards.value.map((card) => {
    const yearRows = card.rows.map(r => r.ind.years ?? [])
    const points = years.value.map((y) => {
      let target = 0
      let actual = 0
      for (const list of yearRows) {
        const entry = list.find(e => e.year === y.year)
        target += entry?.target ?? 0
        actual += entry?.actual ?? 0
      }
      return { year: y.year, label: yearLabel(y), target, actual, pct: target ? Math.round((actual / target) * 100) : 0, future: y.start > today }
    })
    const targeted = card.rows.filter(r => hasTarget(r.ind.target_value))
    return {
      id: card.id,
      number: card.number,
      title: card.title,
      target: targeted.reduce((s, r) => s + (r.ind.target_value ?? 0), 0),
      actual: card.rows.reduce((s, r) => s + r.ind.actual_value, 0),
      hasYearTargets: points.some(p => p.target > 0),
      years: points,
    }
  })
})

/** Indicators under the impact they roll up to (data first); the rest go last. */
const groups = computed<IndicatorGroup[]>(() => {
  const out: IndicatorGroup[] = impactCards.value
    .filter(card => card.rows.length)
    .map(card => ({
      id: card.id,
      number: card.number,
      title: card.title,
      progress: card.progress,
      link: `/dashboard/projects/${frameworkId}/impacts/${card.id}`,
      hasData: card.hasData,
      rows: card.rows,
    }))
  const loose = rowsByImpact.value.get('other') ?? []
  if (loose.length) {
    out.push({
      id: 'other', number: '', title: impacts.value.length ? 'Not under an impact' : 'All indicators',
      progress: rollup(loose), link: null, hasData: loose.some(r => indicatorHasData(r.ind)), rows: loose,
    })
  }
  return out
})

// The impact on screen in both the year chart and the indicator list.
const activeImpact = ref<string | null>(null)

onMounted(() => fetchProjectDetail(frameworkId))

// Project workbook: managers and M&E only (the API enforces the same roles).
const canExport = computed(() => canDownloadData(useAuthStore().userRole))
const exporting = ref(false)
const exportError = ref('')
async function exportProject() {
  exporting.value = true
  exportError.value = ''
  try {
    await downloadFile(`/api/v1/frameworks/${frameworkId}/export`, 'project.xlsx')
  } catch (e: any) {
    exportError.value = e?.message ?? 'Download failed'
  } finally {
    exporting.value = false
  }
}
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
.dash-head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
</style>
