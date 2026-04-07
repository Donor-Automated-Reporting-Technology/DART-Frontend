<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="activity-page">

      <!-- Loading -->
      <div v-if="loading" class="state-loading">
        <div class="spinner" />
        <span>Loading activity...</span>
      </div>

      <!-- Error -->
      <p v-else-if="error" class="state-error">{{ error }}</p>

      <template v-else-if="activity">
        <!-- ── Nav trail ─────────────────────────────────────────── -->
        <div class="nav-trail">
          <NuxtLink to="/activities" class="trail-link">Projects</NuxtLink>
          <AppIcon name="chevron-right" :size="12" class="trail-sep" />
          <NuxtLink :to="`/activities/${frameworkId}`" class="trail-link">{{ framework?.project_name ?? 'Project' }}</NuxtLink>
          <AppIcon name="chevron-right" :size="12" class="trail-sep" />
          <span class="trail-current">{{ activity.template?.name ?? 'Activity' }}</span>
        </div>

        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="page-header">
          <div class="header-top">
            <AppIcon :name="activityIcon" :size="18" class="header-icon" />
            <h1 class="page-title">{{ activity.template?.name ?? 'Activity' }}</h1>
          </div>
          <p v-if="activity.template?.description" class="page-desc">{{ activity.template.description }}</p>
          <div class="header-tags">
            <span class="tag">{{ formatPattern(activity.template?.pattern_type) }}</span>
            <span v-if="activity.target_count" class="tag">{{ activity.target_count }} {{ activity.target_unit }}</span>
          </div>
        </div>

        <!-- ── Action buttons ──────────────────────────────────────── -->
        <div class="actions">
          <!-- Activity-specific primary action -->
          <NuxtLink
            v-for="link in activityLinks"
            :key="link.to"
            :to="link.to"
            class="action-btn action-btn--primary"
          >
            <AppIcon :name="link.icon" :size="16" />
            {{ link.label }}
          </NuxtLink>

          <!-- Global actions -->
          <NuxtLink to="/beneficiaries" class="action-btn">
            <AppIcon name="users" :size="16" />
            Beneficiaries
          </NuxtLink>
          <NuxtLink to="/beneficiaries/register" class="action-btn">
            <AppIcon name="user-plus" :size="16" />
            Register
          </NuxtLink>
        </div>

        <!-- ── Info panel ──────────────────────────────────────────── -->
        <div class="info-panel">
          <h3 class="panel-label">Details</h3>
          <div class="info-grid">
            <div class="info-cell">
              <span class="info-key">Project</span>
              <span class="info-val">{{ framework?.project_name ?? '—' }}</span>
            </div>
            <div class="info-cell">
              <span class="info-key">Partner</span>
              <span class="info-val">{{ framework?.partner_name ?? '—' }}</span>
            </div>
            <div class="info-cell">
              <span class="info-key">Reporting To</span>
              <span class="info-val">{{ framework?.reporting_to || '—' }}</span>
            </div>
            <div class="info-cell" v-if="activity.target_count">
              <span class="info-key">Target</span>
              <span class="info-val">{{ activity.target_count }} {{ activity.target_unit }}</span>
            </div>
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
const activityId = route.params.activityId as string

const framework = ref<Framework | null>(null)
const activity = ref<FrameworkActivity | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { title: 'Activities', href: '/activities' },
  { title: framework.value?.project_name ?? 'Project', href: `/activities/${frameworkId}` },
  { title: activity.value?.template?.name ?? 'Activity', href: `/activities/${frameworkId}/${activityId}`, current: true },
])

const ALL_CONFIGS = { ...ACTIVITY_CONFIG, ...FUTURE_ACTIVITIES }

const activityIcon = computed(() => {
  const code = activity.value?.template?.code
  if (!code) return 'circle'
  return ALL_CONFIGS[code]?.icon ?? 'circle'
})

const PATTERN_LABELS: Record<string, string> = {
  daily_attendance: 'Daily Attendance',
  cohort_sequential: 'Cohort Sequential',
  topic_attendance: 'Topic Attendance',
  aggregate_event: 'Aggregate Event',
  case_workflow: 'Case Workflow',
  training_event: 'Training Event',
}

function formatPattern(p?: string) {
  if (!p) return '—'
  return PATTERN_LABELS[p] ?? p
}

const ACTIVITY_LINKS: Record<string, Array<{ to: string; icon: string; label: string }>> = {
  CFS_ATTENDANCE: [
    { to: '/activities/attendance', icon: 'check-square', label: 'Take Attendance' },
  ],
  TEAMUP: [
    { to: '/activities/teamup', icon: 'users', label: 'TeamUp Sessions' },
  ],
  CHILDREN_SESSIONS: [
    { to: '/activities/children-sessions', icon: 'book-open', label: 'Children Sessions' },
  ],
  PARENTING: [
    { to: '/activities/parenting', icon: 'heart', label: 'Parenting Sessions' },
  ],
  COMMUNITY_DIALOGUE: [
    { to: '/activities/community-dialogue', icon: 'message-circle', label: 'Community Dialogue' },
  ],
  MASS_AWARENESS: [
    { to: '/activities/mass-awareness', icon: 'megaphone', label: 'Mass Awareness' },
  ],
  CASE_MANAGEMENT: [
    { to: '/activities/case-management', icon: 'shield', label: 'Case Management' },
  ],
  CP_TRAINING: [
    { to: '/activities/cp-training', icon: 'award', label: 'CP Training' },
  ],
  IGA: [
    { to: '/activities/iga', icon: 'briefcase', label: 'IGA / Livelihoods' },
  ],
}

const activityLinks = computed(() => {
  const code = activity.value?.template?.code
  if (!code) return []
  return ACTIVITY_LINKS[code] ?? []
})

async function fetchData() {
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
    const all: FrameworkActivity[] = raw.map((item: any) => ({
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
    activity.value = all.find(a => a.id === activityId) ?? null
    if (!activity.value) { error.value = 'Activity not found' }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load activity'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.activity-page {
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
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.header-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.page-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 8px;
  line-height: 1.45;
}

.header-tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
}

/* ── Action buttons ──────────────────────────────────────────────────────── */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.action-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.action-btn--primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.action-btn--primary:hover {
  opacity: 0.9;
  border-color: var(--primary);
  color: #fff;
}

/* ── Info panel ──────────────────────────────────────────────────────────── */
.info-panel {
  padding: 16px 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.panel-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.info-key {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.info-val {
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-primary);
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

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
