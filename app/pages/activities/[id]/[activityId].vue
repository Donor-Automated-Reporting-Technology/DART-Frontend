<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="activity-detail">

      <!-- Loading -->
      <div v-if="loading" class="ad-loading">
        <div class="spinner" />
        <span>Loading activity...</span>
      </div>

      <!-- Error -->
      <p v-else-if="error" class="ad-error">{{ error }}</p>

      <template v-else-if="activity">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="page-header">
          <NuxtLink :to="`/activities/${frameworkId}`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            {{ framework?.project_name ?? 'Project' }}
          </NuxtLink>
          <div class="header-body">
            <h1 class="page-title">{{ activity.template?.name ?? 'Activity' }}</h1>
            <p class="page-subtitle">{{ activity.template?.description ?? '' }}</p>
          </div>
        </div>

        <!-- ── Info row ────────────────────────────────────────────── -->
        <div class="info-row">
          <div class="info-item">
            <span class="info-label">Pattern</span>
            <span class="info-value">{{ formatPattern(activity.template?.pattern_type) }}</span>
          </div>
          <div class="info-item" v-if="activity.target_count">
            <span class="info-label">Target</span>
            <span class="info-value">{{ activity.target_count }} {{ activity.target_unit }}</span>
          </div>
          <div class="info-item" v-if="framework">
            <span class="info-label">Project</span>
            <span class="info-value">{{ framework.project_name }}</span>
          </div>
        </div>

        <!-- ── Quick Actions ───────────────────────────────────────── -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Quick Actions</h2>
          </div>

          <div class="cards-grid">
            <!-- Global links (all activities) -->
            <NuxtLink to="/beneficiaries" class="action-card">
              <div class="ac-icon ac-icon--global">
                <AppIcon name="users" :size="18" />
              </div>
              <div class="ac-body">
                <h3 class="ac-name">Beneficiaries</h3>
                <p class="ac-desc">View and manage all registered beneficiaries</p>
              </div>
              <span class="ac-arrow">
                <AppIcon name="chevron-right" :size="15" />
              </span>
            </NuxtLink>

            <NuxtLink to="/beneficiaries/register" class="action-card">
              <div class="ac-icon ac-icon--global">
                <AppIcon name="user-plus" :size="18" />
              </div>
              <div class="ac-body">
                <h3 class="ac-name">Register Beneficiary</h3>
                <p class="ac-desc">Register a new beneficiary into the system</p>
              </div>
              <span class="ac-arrow">
                <AppIcon name="chevron-right" :size="15" />
              </span>
            </NuxtLink>

            <!-- Dynamic activity-specific links -->
            <NuxtLink
              v-for="link in activityLinks"
              :key="link.to"
              :to="link.to"
              class="action-card action-card--activity"
            >
              <div class="ac-icon ac-icon--activity">
                <AppIcon :name="link.icon" :size="18" />
              </div>
              <div class="ac-body">
                <h3 class="ac-name">{{ link.label }}</h3>
                <p class="ac-desc">{{ link.desc }}</p>
              </div>
              <span class="ac-arrow">
                <AppIcon name="chevron-right" :size="15" />
              </span>
            </NuxtLink>
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

/**
 * Build activity-specific action links based on the activity template code.
 * Global links (Beneficiaries, Register) are always shown above.
 * These are the dynamic links unique to each activity type.
 */
const ALL_CONFIGS = { ...ACTIVITY_CONFIG, ...FUTURE_ACTIVITIES }

const ACTIVITY_LINKS: Record<string, Array<{ to: string; icon: string; label: string; desc: string }>> = {
  CFS_ATTENDANCE: [
    { to: '/activities/attendance', icon: 'check-square', label: 'Take Attendance', desc: 'Record daily attendance for beneficiaries' },
  ],
  TEAMUP: [
    { to: '/activities/teamup', icon: 'users', label: 'TeamUp Sessions', desc: 'Manage TeamUp group sessions' },
  ],
  CHILDREN_SESSIONS: [
    { to: '/activities/children-sessions', icon: 'book-open', label: 'Children Sessions', desc: 'Manage structured children sessions' },
  ],
  PARENTING: [
    { to: '/activities/parenting', icon: 'heart', label: 'Parenting Sessions', desc: 'Manage parenting programme sessions' },
  ],
  COMMUNITY_DIALOGUE: [
    { to: '/activities/community-dialogue', icon: 'message-circle', label: 'Community Dialogue', desc: 'Record community dialogue events' },
  ],
  MASS_AWARENESS: [
    { to: '/activities/mass-awareness', icon: 'megaphone', label: 'Mass Awareness', desc: 'Record mass awareness campaigns' },
  ],
  CASE_MANAGEMENT: [
    { to: '/activities/case-management', icon: 'shield', label: 'Case Management', desc: 'Manage individual protection cases' },
  ],
  CP_TRAINING: [
    { to: '/activities/cp-training', icon: 'award', label: 'CP Training', desc: 'Manage child protection training events' },
  ],
  IGA: [
    { to: '/activities/iga', icon: 'briefcase', label: 'IGA / Livelihoods', desc: 'Manage income-generating activities' },
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
    if (!framework.value) {
      error.value = 'Project not found'
      return
    }
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
    if (!activity.value) {
      error.value = 'Activity not found'
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load activity'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.activity-detail {
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
  line-height: 1.45;
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

/* ── Action Cards ────────────────────────────────────────────────────────── */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-card {
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

.action-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
  cursor: pointer;
}

.action-card:active {
  transform: scale(0.995);
}

/* ── Action Icon ─────────────────────────────────────────────────────────── */
.ac-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.action-card:hover .ac-icon {
  transform: scale(1.04);
}

.ac-icon--global {
  background: color-mix(in srgb, var(--text-muted) 8%, transparent);
  color: var(--text-secondary);
}

.ac-icon--activity {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

/* ── Action Body ─────────────────────────────────────────────────────────── */
.ac-body {
  flex: 1;
  min-width: 0;
}

.ac-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.ac-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* ── Action Arrow ────────────────────────────────────────────────────────── */
.ac-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.15s, transform 0.15s;
}

.action-card:hover .ac-arrow {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

/* ── Loading / Error ─────────────────────────────────────────────────────── */
.ad-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.ad-error {
  padding: 12px 16px;
  font-size: 0.8rem;
  color: var(--error);
  background: var(--error-bg);
  border-radius: var(--radius-sm);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .info-row {
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
  }

  .action-card {
    padding: 16px;
    gap: 12px;
  }

  .ac-icon {
    width: 36px;
    height: 36px;
  }
}
</style>
