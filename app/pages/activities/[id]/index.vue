<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="project-page">

      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state state--error">
        <AppIcon name="alert-circle" :size="18" />
        <span>{{ error }}</span>
      </div>

      <template v-else-if="framework">
        <!-- ── Breadcrumb ────────────────────────────────────────── -->
        <nav class="breadcrumb">
          <NuxtLink to="/activities" class="crumb-link">Projects</NuxtLink>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ framework.project_name }}</span>
        </nav>

        <!-- ── Project Hero ──────────────────────────────────────── -->
        <div class="project-hero">
          <div class="hero-icon-wrap" :class="`hero-icon--${framework.framework_type}`">
            <AppIcon :name="frameworkIcon(framework.framework_type)" :size="22" />
          </div>
          <div class="hero-body">
            <h1 class="hero-title">{{ framework.project_name }}</h1>
            <div class="hero-chips">
              <span class="chip">
                <AppIcon name="building" :size="12" />
                {{ fw.partner_name }}
              </span>
              <span class="chip">
                <AppIcon name="tag" :size="12" />
                {{ formatType(framework.framework_type) }}
              </span>
              <span class="chip">
                <AppIcon name="calendar" :size="12" />
                {{ formatDate(framework.period_start) }} — {{ formatDate(framework.period_end) }}
              </span>
            </div>
          </div>
        </div>

        <!-- ── Activities Section ────────────────────────────────── -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Activities</h2>
            <span v-if="activities.length" class="section-badge">{{ activities.length }}</span>
          </div>

          <div v-if="activities.length" class="activity-grid">
            <NuxtLink
              v-for="a in activities"
              :key="a.id"
              :to="`/activities/${frameworkId}/${a.id}`"
              class="activity-card"
            >
              <div class="act-icon-wrap">
                <AppIcon :name="activityIcon(a)" :size="18" />
              </div>
              <div class="act-body">
                <h3 class="act-name">{{ a.template?.name ?? 'Activity' }}</h3>
                <span v-if="a.target_count" class="act-target">
                  Target: {{ a.target_count }} {{ a.target_unit }}
                </span>
              </div>
              <div class="act-arrow">
                <AppIcon name="arrow-right" :size="16" />
              </div>
            </NuxtLink>
          </div>

          <div v-else class="state state--empty-section">
            <AppIcon name="puzzle" :size="20" />
            <p>No active activities. Enable them in Settings.</p>
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

const TYPE_ICONS: Record<string, string> = {
  child_protection: 'shield',
  education: 'book-open',
  health: 'heart',
  wash: 'droplet',
  livelihoods: 'briefcase',
}

function formatType(t: string) { return TYPE_LABELS[t] ?? t }
function frameworkIcon(t: string) { return TYPE_ICONS[t] ?? 'layers' }

function formatDate(d: string) {
  if (!d) return '\u2014'
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

/* ── Project Hero ────────────────────────────────────────────────────────── */
.project-hero {
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
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-icon--child_protection { background: rgba(96, 165, 250, 0.12); color: #60a5fa; }
.hero-icon--education { background: rgba(167, 139, 250, 0.12); color: #a78bfa; }
.hero-icon--health { background: rgba(251, 113, 133, 0.12); color: #fb7185; }
.hero-icon--wash { background: rgba(45, 212, 191, 0.12); color: #2dd4bf; }
.hero-icon--livelihoods { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }

.hero-body {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
}

/* ── Section ─────────────────────────────────────────────────────────────── */
.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 0;
}

.section-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-dim);
  padding: 2px 8px;
  border-radius: 100px;
}

/* ── Activity Grid ───────────────────────────────────────────────────────── */
.activity-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
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

.activity-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  transition: border-color 0.2s ease;
  pointer-events: none;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.activity-card:hover::after {
  border-color: var(--primary);
}

.activity-card:active {
  transform: translateY(0) scale(0.99);
}

.act-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-dim);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.activity-card:hover .act-icon-wrap {
  transform: scale(1.08);
}

.act-body {
  flex: 1;
  min-width: 0;
}

.act-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.act-target {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 2px;
  display: block;
}

.act-arrow {
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.activity-card:hover .act-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
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

.state--empty-section {
  flex-direction: column;
  gap: 10px;
  padding: 48px 24px;
  color: var(--text-muted);
  font-size: 0.84rem;
  background: var(--hover-bg-subtle);
  border-radius: var(--radius-md);
}

.state--empty-section p {
  margin: 0;
}

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .project-hero {
    flex-direction: column;
    gap: 14px;
    padding: 20px;
  }

  .hero-icon-wrap { width: 44px; height: 44px; }
  .hero-title { font-size: 1.15rem; }

  .hero-chips {
    gap: 6px;
  }

  .activity-card { padding: 14px 16px; gap: 12px; }
  .act-icon-wrap { width: 34px; height: 34px; border-radius: 8px; }
  .act-arrow { opacity: 0.5; transform: translateX(0); }
}
</style>
