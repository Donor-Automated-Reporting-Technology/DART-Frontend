<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="project-detail">

      <!-- Loading -->
      <div v-if="loading" class="det-loading">
        <div class="spinner" />
        <span>Loading project...</span>
      </div>

      <!-- Error -->
      <p v-else-if="error" class="det-error">{{ error }}</p>

      <template v-else-if="framework">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="page-header">
          <NuxtLink to="/activities" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            Projects
          </NuxtLink>
          <div class="header-body">
            <h1 class="page-title">{{ framework.project_name }}</h1>
            <p class="page-subtitle">{{ framework.partner_name }}</p>
          </div>
        </div>

        <!-- ── Info row ────────────────────────────────────────────── -->
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">Type</span>
            <span class="info-value">{{ formatType(framework.framework_type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Reporting To</span>
            <span class="info-value">{{ framework.reporting_to || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Period</span>
            <span class="info-value">{{ formatDate(framework.period_start) }} — {{ formatDate(framework.period_end) }}</span>
          </div>
        </div>

        <!-- ── Activities ──────────────────────────────────────────── -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Activities</h2>
            <span class="section-count">{{ activities.length }} active</span>
          </div>

          <div v-if="activities.length" class="cards-grid">
            <NuxtLink
              v-for="a in activities"
              :key="a.id"
              :to="`/activities/${frameworkId}/${a.id}`"
              class="activity-card"
            >
              <div class="act-icon">
                <AppIcon :name="activityIcon(a)" :size="18" />
              </div>
              <div class="act-body">
                <h3 class="act-name">{{ a.template?.name ?? 'Activity' }}</h3>
                <p class="act-desc">{{ a.template?.description ?? '' }}</p>
              </div>
              <div class="act-meta" v-if="a.target_count">
                <span class="act-target">{{ a.target_count }} {{ a.target_unit }}</span>
              </div>
              <span class="act-arrow">
                <AppIcon name="chevron-right" :size="15" />
              </span>
            </NuxtLink>
          </div>

          <div v-else class="det-empty">
            <p class="det-empty__title">No active activities</p>
            <p class="det-empty__text">Enable activities in Settings → Framework.</p>
          </div>
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
const allActivities = ref<FrameworkActivity[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Only show active activities
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

function formatType(t: string) {
  return TYPE_LABELS[t] ?? t
}

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
    if (!framework.value) {
      error.value = 'Project not found'
      return
    }
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
.project-detail {
  max-width: 800px;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.page-header {
  margin-bottom: 24px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  margin-bottom: 12px;
  transition: color 0.15s;
}

.btn-back:hover {
  color: var(--primary);
}

.header-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Info Row ────────────────────────────────────────────────────────────── */
.info-row {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.info-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.info-value {
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-primary);
}

/* ── Section ─────────────────────────────────────────────────────────────── */
.section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--text-primary);
  margin: 0;
}

.section-count {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ── Activity Cards ──────────────────────────────────────────────────────── */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.activity-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
  cursor: pointer;
}

.activity-card:active {
  transform: scale(0.995);
}

/* ── Activity Icon ───────────────────────────────────────────────────────── */
.act-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  transition: transform 0.2s;
}

.activity-card:hover .act-icon {
  transform: scale(1.04);
}

/* ── Activity Body ───────────────────────────────────────────────────────── */
.act-body {
  flex: 1;
  min-width: 0;
}

.act-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.act-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Activity Meta ───────────────────────────────────────────────────────── */
.act-meta {
  flex-shrink: 0;
}

.act-target {
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.act-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.15s, transform 0.15s;
}

.activity-card:hover .act-arrow {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

/* ── Loading / Error / Empty ─────────────────────────────────────────────── */
.det-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.det-error {
  padding: 12px 16px;
  font-size: 0.8rem;
  color: var(--error);
  background: var(--error-bg);
  border-radius: var(--radius-sm);
}

.det-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 48px 24px;
  text-align: center;
}

.det-empty__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.det-empty__text {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .info-row {
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
  }

  .activity-card {
    padding: 16px;
    gap: 12px;
  }

  .act-icon {
    width: 36px;
    height: 36px;
  }

  .act-meta {
    display: none;
  }
}
</style>
