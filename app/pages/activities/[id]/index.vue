<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="project-page">

      <!-- Loading -->
      <div v-if="loading" class="state-loading">
        <div class="spinner" />
        <span>Loading project...</span>
      </div>

      <!-- Error -->
      <p v-else-if="error" class="state-error">{{ error }}</p>

      <template v-else-if="framework">
        <!-- ── Nav trail ─────────────────────────────────────────── -->
        <div class="nav-trail">
          <NuxtLink to="/activities" class="trail-link">Projects</NuxtLink>
          <AppIcon name="chevron-right" :size="12" class="trail-sep" />
          <span class="trail-current">{{ framework.project_name }}</span>
        </div>

        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="page-header">
          <h1 class="page-title">{{ framework.project_name }}</h1>
          <div class="header-meta">
            <span class="meta-item">{{ fw.partner_name }}</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">{{ formatType(framework.framework_type) }}</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">{{ formatDate(framework.period_start) }} — {{ formatDate(framework.period_end) }}</span>
          </div>
        </div>

        <!-- ── Activities ──────────────────────────────────────────── -->
        <div class="section">
          <h2 class="section-label">Activities <span class="section-count">{{ activities.length }}</span></h2>

          <div v-if="activities.length" class="activity-list">
            <NuxtLink
              v-for="a in activities"
              :key="a.id"
              :to="`/activities/${frameworkId}/${a.id}`"
              class="activity-row"
            >
              <AppIcon :name="activityIcon(a)" :size="16" class="row-icon" />
              <span class="row-name">{{ a.template?.name ?? 'Activity' }}</span>
              <span v-if="a.target_count" class="row-target">{{ a.target_count }} {{ a.target_unit }}</span>
              <AppIcon name="chevron-right" :size="14" class="row-chevron" />
            </NuxtLink>
          </div>

          <p v-else class="state-empty">No active activities. Enable them in Settings → Framework.</p>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../services/frameworkApi'
import { ACTIVITY_CONFIG, FUTURE_ACTIVITIES } from '../../../utils/activityConfig'
import type { Framework, FrameworkActivity } from '../../../interfaces/framework'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string

const framework = ref<Framework | null>(null)
const fw = computed(() => framework.value ?? { partner_name: '' })
const allActivities = ref<FrameworkActivity[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const activities = computed(() => allActivities.value.filter(a => a.is_active))

const breadcrumbs = computed(() => [
  { title: 'Activities', href: '/activities' },
  { title: framework.value?.project_name ?? 'Project', href: `/activities/${frameworkId}`, current: true },
])

const TYPE_LABELS: Record<string, string> = {
  child_protection: 'Child Protection',
  education: 'Education',
  health: 'Health',
  wash: 'WASH',
  livelihoods: 'Livelihoods',
}

function formatType(t: string) { return TYPE_LABELS[t] ?? t }

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ALL_CONFIGS = { ...ACTIVITY_CONFIG, ...FUTURE_ACTIVITIES }

function activityIcon(a: FrameworkActivity): string {
  const code = a.template?.code
  if (!code) return 'circle'
  return ALL_CONFIGS[code]?.icon ?? 'circle'
}

async function fetchProject() {
  loading.value = true
  error.value = null
  try {
    const [fwRes, actRes] = await Promise.all([
      frameworkApi.listFrameworks(),
      frameworkApi.getActivities(frameworkId),
    ])
    framework.value = (fwRes.frameworks ?? []).find(f => f.id === frameworkId) ?? null
    if (!framework.value) { error.value = 'Project not found'; return }
    const raw = (actRes as any).activities ?? []
    allActivities.value = raw.map((item: any) => ({
      id: item.id,
      framework_id: frameworkId,
      activity_template_id: item.activity_template_id ?? '',
      is_active: item.is_active ?? false,
      target_count: item.target_count ?? 0,
      target_unit: item.target_unit ?? 'children',
      custom_config: item.custom_config ?? item.default_config ?? null,
      created_at: item.created_at ?? '',
      updated_at: item.updated_at ?? '',
      template: item.template ?? {
        id: item.activity_template_id ?? '',
        framework_type: framework.value!.framework_type,
        name: item.activity_name ?? item.name ?? 'Activity',
        code: item.activity_code ?? item.code ?? '',
        description: item.description ?? '',
        pattern_type: item.pattern_type ?? 'daily_attendance',
        default_config: item.default_config ?? null,
        created_at: item.created_at ?? '',
      },
    }))
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load project'
  } finally {
    loading.value = false
  }
}

onMounted(fetchProject)
</script>

<style scoped>
.project-page {
  max-width: 680px;
}

/* ── Nav trail ───────────────────────────────────────────────────────────── */
.nav-trail {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}

.trail-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s;
}

.trail-link:hover {
  color: var(--primary);
}

.trail-sep {
  color: var(--text-muted);
  opacity: 0.4;
}

.trail-current {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.meta-dot {
  font-size: 0.78rem;
  color: var(--text-muted);
  opacity: 0.5;
}

/* ── Section ─────────────────────────────────────────────────────────────── */
.section {
  margin-bottom: 24px;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 10px;
}

.section-count {
  color: var(--text-muted);
  opacity: 0.6;
}

/* ── Activity list ───────────────────────────────────────────────────────── */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.12s;
}

.activity-row:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
}

.row-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.row-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 0;
}

.row-target {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
  flex-shrink: 0;
  white-space: nowrap;
}

.row-chevron {
  color: var(--text-muted);
  opacity: 0.3;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.15s;
}

.activity-row:hover .row-chevron {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

/* ── States ──────────────────────────────────────────────────────────────── */
.state-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.state-error {
  padding: 12px 16px;
  font-size: 0.8rem;
  color: var(--error);
  background: var(--error-bg);
  border-radius: var(--radius-sm);
}

.state-empty {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
  padding: 40px 16px;
  margin: 0;
}

@media (max-width: 640px) {
  .header-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .meta-dot {
    display: none;
  }

  .activity-row {
    padding: 10px 14px;
  }

  .row-target {
    display: none;
  }
}
</style>
