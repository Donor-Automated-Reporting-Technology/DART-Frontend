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
          <AppIcon :name="activityIcon" :size="26" class="hero-icon" />
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
              <AppIcon :name="link.icon" :size="20" class="action-ico" />
              <span class="action-label">{{ link.label }}</span>
              <AppIcon name="arrow-right" :size="14" class="action-arrow" />
            </NuxtLink>

            <!-- Global actions -->
            <button class="action-card" @click="openEnrollModal">
              <AppIcon name="user-plus" :size="20" class="action-ico action-ico--muted" />
              <span class="action-label">Enroll into CFS</span>
              <AppIcon name="arrow-right" :size="14" class="action-arrow" />
            </button>
          </div>
        </div>

        <!-- ── Enroll Modal ──────────────────────────────────────── -->
        <ActivitiesEnrollBeneficiariesModal
          :open="enrollModalOpen"
          :beneficiaries="unenrolledBeneficiaries"
          :enrolling="enrolling"
          :loading="enrollListLoading"
          @close="enrollModalOpen = false"
          @enroll="handleEnroll"
        />

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

        <!-- ── Enrolled Children ─────────────────────────────────── -->
        <div class="enrolled-section">
          <div class="enrolled-header">
            <h2 class="section-label">Enrolled Children</h2>
            <span class="enrolled-count">{{ enrolledTotal }} enrolled</span>
          </div>

          <div class="enrolled-search-row">
            <div class="enrolled-search-wrap">
              <AppIcon name="search" :size="14" class="search-ico" />
              <input
                v-model="enrolledSearch"
                type="text"
                class="enrolled-search"
                placeholder="Search enrolled children…"
                @input="debouncedFetchEnrolled"
              />
            </div>
          </div>

          <div v-if="enrolledError" class="api-err">
            <AppIcon name="alert-circle" :size="14" />
            {{ enrolledError }}
          </div>

          <BeneficiarySkeleton v-if="enrolledLoading" :rows="4" />

          <BeneficiaryTable
            v-else
            :beneficiaries="enrolledBeneficiaries"
          />

          <!-- Pagination -->
          <div v-if="enrolledTotalPages > 1" class="pagination">
            <button
              class="page-btn"
              :disabled="enrolledPage <= 1"
              @click="goEnrolledPage(enrolledPage - 1)"
              aria-label="Previous page"
            >
              <AppIcon name="chevron-left" :size="14" />
            </button>

            <template v-for="p in enrolledPaginationRange" :key="p">
              <button
                v-if="p !== '...'"
                class="page-btn page-num"
                :class="{ 'page-num--active': p === enrolledPage }"
                @click="goEnrolledPage(p as number)"
              >
                {{ p }}
              </button>
              <span v-else class="page-ellipsis">…</span>
            </template>

            <button
              class="page-btn"
              :disabled="enrolledPage >= enrolledTotalPages"
              @click="goEnrolledPage(enrolledPage + 1)"
              aria-label="Next page"
            >
              <AppIcon name="chevron-right" :size="14" />
            </button>

            <span class="page-summary">{{ enrolledTotal }} total</span>
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
import { beneficiaryApi } from '../../../services/beneficiaryApi'
import { cfsApi } from '../../../services/cfsApi'
import { ACTIVITY_CONFIG, ACTIVITY_CODES, FUTURE_ACTIVITIES } from '../../../utils/activityConfig'
import type { Framework, FrameworkActivity } from '../../../interfaces/framework'
import type { Beneficiary } from '../../../interfaces/beneficiary'
import BeneficiaryTable from '../../../components/beneficiaries/BeneficiaryTable.vue'
import BeneficiarySkeleton from '../../../components/beneficiaries/BeneficiarySkeleton.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string
const activityId = route.params.activityId as string

const framework = ref<Framework | null>(null)
const activity = ref<FrameworkActivity | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
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
  daily_attendance: 'Structured PSS',
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
  // Backend code is CFS_ATTENDANCE (see migration 000034); 'PSS' kept as alias
  // for any legacy data still floating around.
  [ACTIVITY_CODES.STRUCTURED_PSS]: [
    { to: `/activities/${frameworkId}/pss`, icon: 'puzzle', label: 'Open PSS Schedule' },
    { to: `/activities/${frameworkId}/cfs-session`, icon: 'check-square', label: 'Take Session Attendance' },
  ],
  PSS: [
    { to: `/activities/${frameworkId}/pss`, icon: 'puzzle', label: 'Open PSS Schedule' },
    { to: `/activities/${frameworkId}/cfs-session`, icon: 'check-square', label: 'Take Session Attendance' },
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

/* ── Enroll into CFS ──────────────────────────────────────────────────── */
const enrollModalOpen = ref(false)
const enrolling = ref(false)
const enrollListLoading = ref(false)
const unenrolledBeneficiaries = ref<Array<{
  id: string; full_name: string; age: number; sex: string; disability_status: string
}>>([])

async function openEnrollModal() {
  enrollModalOpen.value = true
  enrollListLoading.value = true
  unenrolledBeneficiaries.value = []

  try {
    const res = await beneficiaryApi.getUnenrolled()
    const list = res.beneficiaries ?? (Array.isArray(res) ? res as any[] : [])

    unenrolledBeneficiaries.value = list.map((b: any) => ({
      id: b.id,
      full_name: [b.personal_name, b.father_name, b.grandfather_name, b.family_name]
        .filter(Boolean)
        .join(' '),
      age: b.age_at_registration,
      sex: b.sex,
      disability_status: b.disability_status ?? '',
    }))
  } catch (e: any) {
    console.error('Failed to load unenrolled beneficiaries:', e)
  } finally {
    enrollListLoading.value = false
  }
}

async function handleEnroll(ids: string[]) {
  enrolling.value = true
  try {
    await cfsApi.batchEnrollBeneficiaries(ids)
    enrollModalOpen.value = false
    fetchEnrolled()
  } catch (e: any) {
    console.error('Enroll failed:', e)
  } finally {
    enrolling.value = false
  }
}

/* ── Enrolled Children ────────────────────────────────────────────────── */
const allEnrolledBeneficiaries = ref<Beneficiary[]>([])
const enrolledTotal = ref(0)
const enrolledPage = ref(1)
const enrolledPageSize = ref(5)
const enrolledSearch = ref('')
const enrolledLoading = ref(false)
const enrolledError = ref<string | null>(null)

const enrolledTotalPages = computed(() => Math.max(1, Math.ceil(enrolledTotal.value / enrolledPageSize.value)))

const enrolledBeneficiaries = computed(() => allEnrolledBeneficiaries.value)

const enrolledPaginationRange = computed(() => {
  const total = enrolledTotalPages.value
  const current = enrolledPage.value
  const pages: (number | string)[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFetchEnrolled() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    enrolledPage.value = 1
    fetchEnrolled()
  }, 300)
}

async function fetchEnrolled() {
  enrolledLoading.value = true
  enrolledError.value = null
  try {
    const params: Record<string, any> = {
      page: enrolledPage.value,
      page_size: enrolledPageSize.value,
    }
    if (enrolledSearch.value.trim()) params.search = enrolledSearch.value.trim()
    const res = await beneficiaryApi.list(params)
    const raw = res as any
    const list = raw.beneficiaries ?? (Array.isArray(raw) ? raw : [])
    allEnrolledBeneficiaries.value = list
    enrolledTotal.value = raw.pagination?.total_items ?? raw.total_items ?? list.length
  } catch (e: any) {
    enrolledError.value = e?.message ?? 'Failed to load enrolled children'
  } finally {
    enrolledLoading.value = false
  }
}

function goEnrolledPage(p: number) {
  enrolledPage.value = Math.max(1, Math.min(p, enrolledTotalPages.value))
  fetchEnrolled()
}

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

onMounted(() => {
  fetchData()
  fetchEnrolled()
})
</script>

<style scoped>
.activity-page {
  max-width: 860px;
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

.hero-icon {
  color: var(--primary);
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
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  font-family: inherit;
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

.action-ico {
  color: var(--primary);
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.action-ico--muted {
  color: var(--text-secondary);
}

.action-card:hover .action-ico--muted {
  color: var(--primary);
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
  margin-bottom: 32px;
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

/* ── Enrolled Children Section ───────────────────────────────────────── */
.enrolled-section {
  margin-bottom: 32px;
}

.enrolled-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.enrolled-header .section-label {
  margin: 0;
}

.enrolled-count {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
}

.enrolled-search-row {
  margin-bottom: 14px;
}

.enrolled-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-ico {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.enrolled-search {
  width: 100%;
  padding: 10px 14px 10px 36px;
  font-size: 0.84rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.enrolled-search::placeholder {
  color: var(--text-muted);
}

.enrolled-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.api-err {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--error-bg);
  color: var(--error);
  font-size: 0.84rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  margin-bottom: 12px;
}

/* ── Pagination ──────────────────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary);
  color: var(--primary);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.page-num--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.page-num--active:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.page-ellipsis {
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 0 4px;
}

.page-summary {
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-left: 8px;
}
</style>
