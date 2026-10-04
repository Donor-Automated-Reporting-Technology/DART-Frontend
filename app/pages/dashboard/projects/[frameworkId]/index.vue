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
  (logframe.value?.levels ?? []).map((level, i) => {
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

/* ═══ Page tokens ═════════════════════════════════
   Brand teal (#077163) is the single accent. Secondary text is kept dark
   (light theme) / bright (dark theme) so it stays readable on cards. */
.project-detail {
  --brand: #077163;
  --brand-deep: #054f45;
  --brand-soft: rgba(7, 113, 99, 0.14);
  --brand-text: #5cc8b6;
  --d-card: var(--bg-card);
  --d-tile: #1f1f26;
  --d-text: #f4f4f5;
  --d-text-2: #d4d4d8;
  --d-track: rgba(255, 255, 255, 0.12);
  --d-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  --d-shadow-hover: 0 14px 34px rgba(0, 0, 0, 0.45);

  display: flex;
  flex-direction: column;
  gap: 28px;
  color: var(--d-text);
}
:global([data-theme="light"]) .project-detail {
  --brand-text: #077163;
  --d-card: #ffffff;
  --d-tile: #f2f6f5;
  --d-text: #111827;
  --d-text-2: #374151;
  --d-track: rgba(7, 113, 99, 0.14);
  --d-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
  --d-shadow-hover: 0 16px 36px rgba(7, 113, 99, 0.16);
}

.eyebrow {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--brand-text);
}

/* ═══ Progress rings ══════════════════════════════ */
.ring { position: relative; flex-shrink: 0; display: grid; place-items: center; }
.ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring circle { fill: none; stroke-width: 3.2; }
.ring-bg { stroke: var(--d-track); }
.ring-fill { stroke: var(--brand-text); stroke-linecap: round; transition: stroke-dasharray 0.8s ease; }
.ring-value {
  position: absolute; font-weight: 750; color: var(--d-text); font-variant-numeric: tabular-nums;
}
.ring-value small { font-size: 0.6em; font-weight: 600; margin-left: 1px; color: var(--d-text-2); }
.ring--lg { width: 92px; height: 92px; }
.ring--lg .ring-value { font-size: 1.35rem; }
.ring--sm { width: 54px; height: 54px; }
.ring--sm .ring-value { font-size: 0.85rem; }

/* ═══ Project header ══════════════════════════════ */
.project-hero {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  padding: 28px 30px; border-radius: 16px;
  background: var(--d-card); box-shadow: var(--d-shadow);
}
.project-hero::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 4px;
  background: linear-gradient(90deg, var(--brand) 0%, #0fa58f 100%);
}
.project-hero-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.project-hero-name {
  margin: 0; font-size: 1.6rem; font-weight: 750; line-height: 1.25; letter-spacing: -0.02em;
  color: var(--d-text); overflow-wrap: anywhere;
}
.project-hero-meta {
  display: flex; flex-wrap: wrap; gap: 4px 0; margin: 4px 0 0;
  font-size: 0.88rem; color: var(--d-text-2);
}
.project-hero-meta span:not(:last-child)::after { content: '·'; margin: 0 10px; opacity: 0.6; }
.project-hero-progress { display: flex; align-items: center; gap: 14px; }
.ring-caption { font-size: 0.78rem; font-weight: 600; line-height: 1.35; color: var(--d-text-2); }

/* ═══ KPI tiles ═══════════════════════════════════ */
.kpi-grid { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 16px; }
.kpi {
  display: flex; flex-direction: column; gap: 6px; min-width: 0;
  padding: 20px 22px; border-radius: 14px; background: var(--d-card); box-shadow: var(--d-shadow);
}
.kpi-label { font-size: 0.8rem; font-weight: 600; color: var(--d-text-2); }
.kpi-value {
  font-size: 1.9rem; font-weight: 750; line-height: 1.1; letter-spacing: -0.02em;
  color: var(--d-text); font-variant-numeric: tabular-nums;
}
.kpi-foot { font-size: 0.78rem; color: var(--d-text-2); }
.kpi--featured {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%);
}
.kpi--featured::after {
  content: ''; position: absolute; right: -40px; bottom: -60px; width: 180px; height: 180px;
  border-radius: 50%; background: rgba(255, 255, 255, 0.07);
}
.kpi--featured .kpi-label,
.kpi--featured .kpi-foot { color: rgba(255, 255, 255, 0.88); }
.kpi--featured .kpi-value { color: #fff; font-size: 2.4rem; }

/* ═══ Sections ════════════════════════════════════ */
.block { display: flex; flex-direction: column; gap: 14px; }
.block-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.block-title {
  display: flex; align-items: center; gap: 8px;
  margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--d-text);
}
.block-count {
  padding: 2px 9px; font-size: 0.75rem; font-weight: 700; border-radius: 999px;
  color: var(--brand-text); background: var(--brand-soft);
}
.block-hint { margin: 4px 0 0; font-size: 0.86rem; color: var(--d-text-2); }
.block-empty {
  padding: 20px; font-size: 0.88rem; color: var(--d-text-2);
  background: var(--d-card); border-radius: 12px;
}

/* ═══ Impact cards ════════════════════════════════ */
.impact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
.impact-card {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; gap: 14px;
  padding: 22px 22px 18px; min-height: 210px; border-radius: 16px;
  color: inherit; text-decoration: none;
  background: var(--d-card); box-shadow: var(--d-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
/* Soft brand glow in the corner, brighter on hover. */
.impact-card::before {
  content: ''; position: absolute; z-index: -1; top: -90px; right: -90px;
  width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, var(--brand-soft) 0%, transparent 70%);
  transition: transform 0.35s ease, opacity 0.35s ease; opacity: 0.8;
}
.impact-card:hover { transform: translateY(-3px); box-shadow: var(--d-shadow-hover); }
.impact-card:hover::before { transform: scale(1.35); opacity: 1; }
.impact-card:focus-visible { outline: 2px solid var(--brand-text); outline-offset: 3px; }

.impact-watermark {
  position: absolute; z-index: -1; left: 14px; bottom: -26px;
  font-size: 6.5rem; font-weight: 800; line-height: 1; letter-spacing: -0.05em;
  color: var(--brand-text); opacity: 0.06; pointer-events: none;
}
.impact-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.impact-index {
  padding: 4px 10px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--brand-text); background: var(--brand-soft); border-radius: 999px;
}
.impact-pill {
  padding: 4px 10px; font-size: 0.74rem; font-weight: 600;
  color: var(--d-text-2); background: var(--d-tile); border-radius: 999px;
}
.impact-title {
  margin: 0; font-size: 1.02rem; font-weight: 650; line-height: 1.45; color: var(--d-text);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.impact-bar { height: 6px; border-radius: 999px; background: var(--d-track); overflow: hidden; }
.impact-bar-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--brand) 0%, #0fa58f 100%);
  transition: width 0.8s ease;
}
.impact-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; }
.impact-stats { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.82rem; color: var(--d-text-2); }
.impact-stats strong { font-weight: 700; color: var(--d-text); }
.impact-go {
  display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px;
  font-size: 1rem; border-radius: 50%; color: var(--brand-text); background: var(--brand-soft);
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.impact-card:hover .impact-go { transform: translateX(3px); background: var(--brand); color: #fff; }

/* ═══ Activity cards ══════════════════════════════ */
.activity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.activity-card {
  display: flex; flex-direction: column; align-items: stretch; gap: 6px; text-align: left;
  padding: 18px 20px; border: none; border-radius: 14px; cursor: pointer; font: inherit; color: inherit;
  background: var(--d-card); box-shadow: var(--d-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.activity-card:hover { transform: translateY(-2px); box-shadow: var(--d-shadow-hover); }
.activity-card:focus-visible { outline: 2px solid var(--brand-text); outline-offset: 3px; }
.activity-card--inactive { opacity: 0.7; }
.activity-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.activity-module {
  padding: 3px 9px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;
  color: var(--d-text); background: var(--d-tile); border-radius: 6px;
}
.activity-status {
  display: inline-flex; align-items: center; gap: 6px; margin-left: auto;
  font-size: 0.76rem; font-weight: 600; color: var(--d-text-2);
}
.activity-status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--d-text-2); opacity: 0.6; }
.activity-status--on { color: var(--brand-text); }
.activity-status--on::before { background: var(--brand-text); opacity: 1; box-shadow: 0 0 0 3px var(--brand-soft); }
.activity-name { font-size: 0.98rem; font-weight: 650; line-height: 1.35; color: var(--d-text); overflow-wrap: anywhere; }
.activity-meta { font-size: 0.8rem; color: var(--d-text-2); }
.activity-foot {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 10px;
  margin-top: 12px; padding-top: 14px; border-top: 1px dashed var(--d-track);
}
.activity-count { display: flex; align-items: baseline; gap: 6px; }
.activity-count-value { font-size: 1.5rem; font-weight: 750; color: var(--d-text); font-variant-numeric: tabular-nums; }
.activity-count-label { font-size: 0.8rem; color: var(--d-text-2); }
.activity-links { font-size: 0.78rem; font-weight: 600; color: var(--brand-text); text-align: right; }

/* ═══ Animations ══════════════════════════════════ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ═══ Responsive ══════════════════════════════════ */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .kpi--featured { grid-column: 1 / -1; }
}
@media (max-width: 640px) {
  .project-hero { flex-direction: column; align-items: flex-start; padding: 22px 18px; }
  .impact-grid, .activity-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .impact-card, .activity-card, .impact-card::before, .impact-go { transition: none; }
}
</style>
