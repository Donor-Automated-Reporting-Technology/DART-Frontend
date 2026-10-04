<template>
  <div class="project-detail level-dash">

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

    <div v-else-if="hasData && !level" class="block-empty">
      This part of the logframe no longer exists.
      <NuxtLink :to="`/dashboard/projects/${frameworkId}`" class="inline-link">Back to the project</NuxtLink>
    </div>

    <!-- Content -->
    <template v-else-if="hasData && level">

      <!-- ═══ Header ═══ -->
      <header class="project-hero">
        <div class="project-hero-info">
          <span class="eyebrow">{{ typeLabel(level.level_type) }}</span>
          <h1 class="project-hero-name level-title">{{ level.title }}</h1>
          <p class="project-hero-meta">
            <span>{{ project.project_name }}</span>
            <span v-if="parentLevel">Part of {{ typeLabel(parentLevel.level_type).toLowerCase() }} “{{ shorten(parentLevel.title, 48) }}”</span>
            <span v-if="outcomeCount">{{ outcomeCount }} outcome{{ outcomeCount === 1 ? '' : 's' }}</span>
            <span v-if="outputCount">{{ outputCount }} output{{ outputCount === 1 ? '' : 's' }}</span>
          </p>
        </div>

        <div v-if="levelProgress !== null" class="project-hero-progress">
          <div class="ring ring--lg">
            <svg viewBox="0 0 36 36">
              <circle class="ring-bg" cx="18" cy="18" r="15.9155" />
              <circle class="ring-fill" cx="18" cy="18" r="15.9155" :stroke-dasharray="`${levelProgress} 100`" />
            </svg>
            <span class="ring-value">{{ levelProgress }}<small>%</small></span>
          </div>
          <span class="ring-caption">Target<br />progress</span>
        </div>
      </header>

      <!-- ═══ Targets ═══ -->
      <section class="block">
        <div class="block-head">
          <div>
            <h2 class="block-title">Targets</h2>
            <p class="block-hint">What this {{ typeLabel(level.level_type).toLowerCase() }} committed to, against what has been achieved so far.</p>
          </div>
        </div>

        <div v-if="!levelIndicators.length" class="block-empty">
          No indicator has been set yet. Add one in Settings → Projects → Logframe.
        </div>

        <article v-for="ind in levelIndicators" :key="ind.id" class="target-card">
          <div class="target-head">
            <span v-if="ind.code" class="target-code">{{ ind.code }}</span>
            <h3 class="target-statement">{{ ind.indicator }}</h3>
          </div>

          <!-- Overall target -->
          <div v-if="hasTarget(ind.target_value)" class="target-main">
            <div class="target-figures">
              <span class="target-actual">{{ fmt(ind.actual_value) }}</span>
              <span class="target-of">of {{ fmt(ind.target_value!) }}{{ ind.unit ? ` ${ind.unit}` : '' }}</span>
            </div>
            <span class="target-pct">{{ ind.percentage }}%</span>
            <div class="target-bar"><div class="target-bar-fill" :style="{ width: `${ind.percentage}%` }" /></div>
            <span class="target-note">Overall target · counted from {{ linkedLabel(ind.linked_activity_ids.length) }}</span>
          </div>

          <!-- Custom target fields -->
          <div v-if="(ind.target_fields ?? []).length" class="field-list">
            <div v-for="(tf, i) in ind.target_fields" :key="i" class="field-row">
              <div class="field-row-head">
                <span class="field-name">{{ tf.label }}</span>
                <span class="field-figures">
                  <template v-if="tf.actual != null">
                    <strong>{{ fmt(tf.actual) }}</strong>
                    <template v-if="tf.target != null"> of {{ fmt(tf.target) }}</template>
                  </template>
                  <template v-else-if="tf.target != null">Target {{ fmt(tf.target) }}</template>
                  <template v-else>—</template>
                  {{ tf.unit ?? (tf.type === 'percent' ? '%' : '') }}
                </span>
              </div>
              <div v-if="tf.target != null && tf.actual != null" class="target-bar target-bar--thin">
                <div class="target-bar-fill" :style="{ width: `${tf.percentage}%` }" />
              </div>
              <span class="field-source" :class="`field-source--${tf.source}`">{{ sourceLabel(tf) }}</span>
            </div>
          </div>

          <p v-if="!hasTarget(ind.target_value) && !(ind.target_fields ?? []).length" class="target-note">
            No numerical targets set for this indicator yet.
          </p>
        </article>
      </section>

      <!-- ═══ Outcomes & outputs ═══ -->
      <section v-if="childLevels.length" class="block">
        <div class="block-head">
          <div>
            <h2 class="block-title">{{ level.level_type === 'impact' ? 'Outcomes & outputs' : 'Outputs' }}</h2>
            <p class="block-hint">How this {{ typeLabel(level.level_type).toLowerCase() }} is being delivered. Open one to see its targets.</p>
          </div>
        </div>

        <div class="tree">
          <div v-for="child in childLevels" :key="child.id" class="tree-node">
            <NuxtLink :to="levelLink(child.id)" class="tree-card" :class="`tree-card--${child.level_type}`">
              <div class="tree-card-top">
                <span class="tree-type">{{ typeLabel(child.level_type) }}</span>
                <span v-if="progressOf(child.id) !== null" class="tree-pct">{{ progressOf(child.id) }}%</span>
                <span v-else class="tree-none">No targets yet</span>
              </div>
              <span class="tree-title">{{ child.title }}</span>
              <div v-if="progressOf(child.id) !== null" class="target-bar target-bar--thin">
                <div class="target-bar-fill" :style="{ width: `${progressOf(child.id)}%` }" />
              </div>
              <span class="tree-meta">{{ levelMeta(child.id) }}</span>
            </NuxtLink>

            <!-- Outputs under an outcome -->
            <div v-if="childrenOf(child.id).length" class="tree-children">
              <NuxtLink
                v-for="out in childrenOf(child.id)"
                :key="out.id"
                :to="levelLink(out.id)"
                class="tree-leaf"
              >
                <span class="tree-type tree-type--leaf">{{ typeLabel(out.level_type) }}</span>
                <span class="tree-leaf-title">{{ out.title }}</span>
                <span class="tree-leaf-pct">{{ progressOf(out.id) !== null ? `${progressOf(out.id)}%` : '—' }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ Activities ═══ -->
      <section class="block">
        <div class="block-head">
          <div>
            <h2 class="block-title">Activities <span class="block-count">{{ levelActivities.length }}</span></h2>
            <p class="block-hint">Activities feeding this {{ typeLabel(level.level_type).toLowerCase() }}<template v-if="childLevels.length"> and its {{ level.level_type === 'impact' ? 'outcomes and outputs' : 'outputs' }}</template>.</p>
          </div>
        </div>

        <div v-if="!levelActivities.length" class="block-empty">
          No activities linked yet. Switch them on from the indicator in Settings → Logframe.
        </div>

        <div v-else class="activity-grid">
          <button
            v-for="a in levelActivities"
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
              <span class="activity-links">{{ feedsLabel(a.id) }}</span>
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
import type { ProjectLogframeLevel } from '~/interfaces/dashboard'
import { levelTypeLabel as typeLabel, targetFieldSourceLabel as sourceLabel } from '~/utils/projectDashboard'

// Remount when moving between levels (impact → outcome → output).
definePageMeta({ key: (r) => r.fullPath })

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.frameworkId as string
const levelId = route.params.impactId as string

const {
  isLoading,
  error,
  project,
  logframe,
  activities,
  hasData,
  logframeProgress,
  formatPattern,
  fetchProjectDetail,
} = useProjectDetail()

// ─── Hierarchy ───

const levels = computed<ProjectLogframeLevel[]>(() => logframe.value?.levels ?? [])
const level = computed(() => levels.value.find(l => l.id === levelId) ?? null)
const parentLevel = computed(() => levels.value.find(l => l.id === level.value?.parent_id) ?? null)

function childrenOf(id: string): ProjectLogframeLevel[] {
  return levels.value
    .filter(l => l.parent_id === id)
    .sort((a, b) =>
      Number(a.level_type === 'output') - Number(b.level_type === 'output') || (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )
}
const childLevels = computed(() => childrenOf(levelId))

/** This level and everything beneath it. */
const subtreeIds = computed(() => {
  const ids = [levelId]
  for (let i = 0; i < ids.length; i++) {
    for (const l of levels.value) if (l.parent_id === ids[i]) ids.push(l.id)
  }
  return ids
})
const descendants = computed(() => levels.value.filter(l => subtreeIds.value.slice(1).includes(l.id)))
const outcomeCount = computed(() => descendants.value.filter(l => l.level_type === 'outcome').length)
const outputCount = computed(() => descendants.value.filter(l => l.level_type === 'output').length)

const breadcrumbs = computed(() => {
  const chain: ProjectLogframeLevel[] = []
  let current = parentLevel.value
  while (current && chain.length < 10) {
    chain.unshift(current)
    current = levels.value.find(l => l.id === current!.parent_id) ?? null
  }
  return [
    { title: 'Organisation', href: '/dashboard' },
    { title: project.value.project_name || 'Project', href: `/dashboard/projects/${frameworkId}` },
    ...chain.map(l => ({ title: shorten(l.title, 30), href: levelLink(l.id) })),
    { title: shorten(level.value?.title || 'Impact', 30), href: route.fullPath, current: true },
  ]
})

function levelLink(id: string): string {
  return `/dashboard/projects/${frameworkId}/impacts/${id}`
}

// ─── Targets ───

const indicators = computed(() => logframe.value?.indicators ?? [])
const levelIndicators = computed(() => indicators.value.filter(ind => ind.level_id === levelId))
const levelProgress = computed(() => logframeProgress(levelId))

function progressOf(id: string): number | null {
  return logframeProgress(id)
}

function levelMeta(id: string): string {
  const inds = indicators.value.filter(ind => ind.level_id === id)
  const targeted = inds.filter(ind => hasTarget(ind.target_value))
  const parts = [`${inds.length} indicator${inds.length === 1 ? '' : 's'}`]
  if (targeted.length) {
    const actual = targeted.reduce((s, ind) => s + ind.actual_value, 0)
    const target = targeted.reduce((s, ind) => s + (ind.target_value ?? 0), 0)
    parts.unshift(`${fmt(actual)} of ${fmt(target)}`)
  }
  const outputs = childrenOf(id).length
  if (outputs) parts.push(`${outputs} output${outputs === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function hasTarget(v: number | null | undefined): boolean {
  return v != null && v > 0
}

function linkedLabel(n: number): string {
  return n ? `${n} linked activit${n === 1 ? 'y' : 'ies'}` : 'no linked activities yet'
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function shorten(t: string, max: number): string {
  return t.length > max ? `${t.slice(0, max)}…` : t
}

// ─── Activities ───

/** Activity id → the levels (within this subtree) it feeds. */
const feedsByActivity = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const ind of indicators.value) {
    if (!subtreeIds.value.includes(ind.level_id)) continue
    for (const id of ind.linked_activity_ids ?? []) {
      if (!map.has(id)) map.set(id, new Set())
      map.get(id)!.add(ind.level_id)
    }
  }
  return map
})

const levelActivities = computed(() =>
  activities.value
    .filter(a => feedsByActivity.value.has(a.id))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name)),
)

function feedsLabel(activityId: string): string {
  const fed = [...(feedsByActivity.value.get(activityId) ?? [])]
    .map(id => levels.value.find(l => l.id === id)?.level_type)
    .filter(Boolean) as string[]
  const types = [...new Set(fed)].map(t => typeLabel(t).toLowerCase())
  return types.length ? `Feeds ${types.join(' & ')}` : ''
}

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

/* Shared hero, rings, blocks and activity cards: assets/css/project-dashboard.css */
.level-title { font-size: 1.45rem; }
.inline-link { margin-left: 6px; font-weight: 600; color: var(--brand-text); }

/* ═══ Target cards ════════════════════════════════ */
.target-card {
  display: flex; flex-direction: column; gap: 18px;
  padding: 22px 24px; border-radius: 16px; background: var(--d-card); box-shadow: var(--d-shadow);
}
.target-head { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.target-code {
  padding: 3px 10px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em;
  color: #fff; background: var(--brand); border-radius: 6px;
}
.target-statement { margin: 0; font-size: 1.02rem; font-weight: 650; line-height: 1.5; color: var(--d-text); }

.target-main {
  display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 10px 16px;
  padding: 18px 20px; border-radius: 12px; background: var(--d-tile);
}
.target-figures { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.target-actual { font-size: 2rem; font-weight: 750; line-height: 1; color: var(--d-text); font-variant-numeric: tabular-nums; }
.target-of { font-size: 0.95rem; font-weight: 600; color: var(--d-text-2); }
.target-pct { font-size: 1.25rem; font-weight: 750; color: var(--brand-text); }
.target-main .target-bar, .target-main .target-note { grid-column: 1 / -1; }
.target-bar { height: 8px; border-radius: 999px; background: var(--d-track); overflow: hidden; }
.target-bar--thin { height: 6px; }
.target-bar-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--brand) 0%, #0fa58f 100%);
  transition: width 0.8s ease;
}
.target-note { margin: 0; font-size: 0.8rem; color: var(--d-text-2); }

.field-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.field-row {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px 16px; border-radius: 12px; background: var(--d-tile);
}
.field-row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.field-name { font-size: 0.9rem; font-weight: 650; color: var(--d-text); overflow-wrap: anywhere; }
.field-figures { flex-shrink: 0; font-size: 0.85rem; color: var(--d-text-2); font-variant-numeric: tabular-nums; }
.field-figures strong { font-size: 1.05rem; font-weight: 750; color: var(--d-text); }
.field-source { font-size: 0.76rem; font-weight: 600; color: var(--d-text-2); }
.field-source--computed, .field-source--manual { color: var(--brand-text); }

/* ═══ Outcomes & outputs tree ═════════════════════ */
.tree { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; align-items: start; }
.tree-node { display: flex; flex-direction: column; gap: 8px; }
.tree-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 18px 20px; border-radius: 14px; color: inherit; text-decoration: none;
  background: var(--d-card); box-shadow: var(--d-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.tree-card:hover { transform: translateY(-2px); box-shadow: var(--d-shadow-hover); }
.tree-card:focus-visible, .tree-leaf:focus-visible { outline: 2px solid var(--brand-text); outline-offset: 3px; }
.tree-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tree-type {
  padding: 3px 10px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: #fff; background: var(--brand); border-radius: 999px;
}
.tree-card--output .tree-type, .tree-type--leaf { color: var(--brand-text); background: var(--brand-soft); }
.tree-pct { font-size: 1rem; font-weight: 750; color: var(--brand-text); }
.tree-none { font-size: 0.76rem; font-weight: 600; color: var(--d-text-2); }
.tree-title { font-size: 0.96rem; font-weight: 650; line-height: 1.45; color: var(--d-text); overflow-wrap: anywhere; }
.tree-meta { font-size: 0.8rem; color: var(--d-text-2); }

.tree-children {
  display: flex; flex-direction: column; gap: 6px;
  margin-left: 18px; padding-left: 14px; border-left: 2px solid var(--brand-soft);
}
.tree-leaf {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px; color: inherit; text-decoration: none;
  background: var(--d-card); box-shadow: var(--d-shadow); transition: background 0.15s;
}
.tree-leaf:hover { background: var(--brand-soft); }
.tree-leaf-title {
  flex: 1; min-width: 0; font-size: 0.86rem; font-weight: 600; color: var(--d-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tree-leaf-pct { flex-shrink: 0; font-size: 0.84rem; font-weight: 700; color: var(--brand-text); }

/* ═══ Animations ══════════════════════════════════ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 640px) {
  .target-card { padding: 18px 16px; }
  .tree { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .tree-card, .target-bar-fill { transition: none; }
}
</style>
