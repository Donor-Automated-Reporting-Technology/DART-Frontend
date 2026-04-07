<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="activity-page">

      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state state--error">
        <AppIcon name="alert-circle" :size="18" />
        <span>{{ error }}</span>
      </div>

      <template v-else-if="activity">
        <!-- ── Breadcrumb ────────────────────────────────────────── -->
        <nav class="breadcrumb">
          <NuxtLink to="/activities" class="crumb-link">Projects</NuxtLink>
          <span class="crumb-sep">/</span>
          <NuxtLink :to="`/activities/${frameworkId}`" class="crumb-link">{{ framework?.project_name ?? 'Project' }}</NuxtLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ activity.template?.name ?? 'Activity' }}</span>
        </nav>

        <!-- ── Activity Hero ─────────────────────────────────────── -->
        <div class="activity-hero">
          <div class="hero-icon-wrap">
            <AppIcon :name="activityIcon" :size="24" />
          </div>
          <div class="hero-body">
            <h1 class="hero-title">{{ activity.template?.name ?? 'Activity' }}</h1>
            <p v-if="activity.template?.description" class="hero-desc">{{ activity.template.description }}</p>
            <div class="hero-tags">
              <span class="tag-pill">
                <AppIcon name="repeat" :size="11" />
                {{ formatPattern(activity.template?.pattern_type) }}
              </span>
              <span v-if="activity.target_count" class="tag-pill">
                <AppIcon name="target" :size="11" />
                {{ activity.target_count }} {{ activity.target_unit }}
              </span>
            </div>
          </div>
        </div>

        <!-- ── Quick Actions ─────────────────────────────────────── -->
        <div class="actions-section">
          <h2 class="section-label">Quick Actions</h2>
          <div class="actions-grid">
            <!-- Primary activity action -->
            <NuxtLink
              v-for="link in activityLinks"
              :key="link.to"
              :to="link.to"
              class="action-card action-card--primary"
            >
              <div class="action-icon">
                <AppIcon :name="link.icon" :size="20" />
              </div>
              <span class="action-label">{{ link.label }}</span>
              <AppIcon name="arrow-right" :size="14" class="action-arrow" />
            </NuxtLink>

            <!-- Global actions -->
            <NuxtLink to="/beneficiaries" class="action-card">
              <div class="action-icon action-icon--secondary">
                <AppIcon name="users" :size="20" />
              </div>
              <span class="action-label">Beneficiaries</span>
              <AppIcon name="arrow-right" :size="14" class="action-arrow" />
            </NuxtLink>

            <NuxtLink to="/beneficiaries/register" class="action-card">
              <div class="action-icon action-icon--secondary">
                <AppIcon name="user-plus" :size="20" />
              </div>
              <span class="action-label">Register</span>
              <AppIcon name="arrow-right" :size="14" class="action-arrow" />
            </NuxtLink>
          </div>
        </div>

        <!-- ── Details Panel ─────────────────────────────────────── -->
        <div class="details-panel">
          <h2 class="section-label">Details</h2>
          <div class="details-grid">
            <div class="detail-item">
              <AppIcon name="folder" :size="14" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-key">Project</span>
                <span class="detail-val">{{ framework?.project_name ?? '\u2014' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <AppIcon name="building" :size="14" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-key">Partner</span>
                <span class="detail-val">{{ framework?.partner_name ?? '\u2014' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <AppIcon name="send" :size="14" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-key">Reporting To</span>
                <span class="detail-val">{{ framework?.reporting_to || '\u2014' }}</span>
              </div>
            </div>
            <div v-if="activity.target_count" class="detail-item">
              <AppIcon name="target" :size="14" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-key">Target</span>
                <span class="detail-val">{{ activity.target_count }} {{ activity.target_unit }}</span>
              </div>
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
  if (!p) return '\u2014'
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
  max-width: 720px;
  padding-bottom: 48px;
}

/* ── Breadcrumb ──────────────────────────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.crumb-link {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s;
}

.crumb-link:hover {
  color: var(--primary);
}

.crumb-sep {
  font-size: 0.72rem;
  color: var(--text-muted);
  opacity: 0.4;
}

.crumb-current {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Activity Hero ───────────────────────────────────────────────────────── */
.activity-hero {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 36px;
  padding: 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.hero-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--primary-dim);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-body {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.hero-desc {
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.hero-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
}

/* ── Section Label ───────────────────────────────────────────────────────── */
.section-label {
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0 0 14px;
}

/* ── Quick Actions ───────────────────────────────────────────────────────── */
.actions-section {
  margin-bottom: 32px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.22s ease;
}

.action-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  transition: border-color 0.2s ease;
  pointer-events: none;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.action-card:hover::after {
  border-color: var(--primary);
}

.action-card:active {
  transform: translateY(0) scale(0.98);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-dim);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.action-card:hover .action-icon {
  transform: scale(1.08);
}

.action-card--primary .action-icon {
  background: var(--primary);
  color: #fff;
}

.action-icon--secondary {
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.action-label {
  flex: 1;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.action-arrow {
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
}

/* ── Details Panel ───────────────────────────────────────────────────────── */
.details-panel {
  padding: 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.detail-icon {
  color: var(--text-muted);
  margin-top: 2px;
  flex-shrink: 0;
}

.detail-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-key {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-val {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
}

/* ── States ──────────────────────────────────────────────────────────────── */
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
}

.state--loading {
  gap: 6px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.4;
  animation: pulse-bounce 1.4s ease-in-out infinite;
}

.pulse-dot:nth-child(2) { animation-delay: 0.16s; }
.pulse-dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes pulse-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.state--error {
  background: var(--error-bg);
  color: var(--error);
  font-size: 0.84rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  padding: 16px 20px;
  gap: 10px;
  justify-content: flex-start;
}

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .activity-hero {
    flex-direction: column;
    gap: 14px;
    padding: 20px;
  }

  .hero-icon-wrap { width: 48px; height: 48px; border-radius: 14px; }
  .hero-title { font-size: 1.15rem; }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .action-card { padding: 14px 16px; }
  .action-arrow { opacity: 0.5; transform: translateX(0); }

  .details-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .details-panel { padding: 20px; }
}
</style>
