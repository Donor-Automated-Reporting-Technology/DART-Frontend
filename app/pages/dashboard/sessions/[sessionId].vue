<template>
  <div class="session-detail">
    <DashboardBreadcrumb :crumbs="breadcrumbs" />

    <div v-if="isLoading" class="loading-skeleton">
      <div class="skeleton-header"></div>
      <div class="skeleton-grid">
        <div v-for="n in 3" :key="n" class="skeleton-card"></div>
      </div>
    </div>

    <div v-else-if="error" class="dash-error">
      <AppIcon name="alert-circle" :size="20" />
      <span>{{ error }}</span>
      <button class="btn-retry" @click="fetch">Retry</button>
    </div>

    <template v-else-if="session">
      <header class="session-header">
        <div>
          <h1 class="session-title">Session — {{ formatDate(session.session_date) }}</h1>
          <div class="session-chips">
            <span class="chip" :class="`session-status--${session.status}`">
              {{ session.status === 'completed' ? 'Completed' : 'In progress' }}
            </span>
            <span class="chip">{{ capitalize(session.time_period) }}</span>
            <span class="chip">Age {{ session.age_group }}</span>
          </div>
        </div>
      </header>

      <section class="meta-grid">
        <div class="meta-card">
          <span class="meta-label">Conducted by</span>
          <span class="meta-value">{{ session.facilitator_name ?? session.facilitator_id }}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Started</span>
          <span class="meta-value">{{ formatDateTime(session.started_at) }}</span>
        </div>
        <div class="meta-card" v-if="session.completed_at">
          <span class="meta-label">Completed</span>
          <span class="meta-value">{{ formatDateTime(session.completed_at) }}</span>
        </div>
      </section>

      <section v-if="session.objectives && session.objectives.length" class="report-section">
        <h2 class="report-title">Objectives</h2>
        <ul class="report-list">
          <li v-for="(o, i) in session.objectives" :key="i">{{ o }}</li>
        </ul>
      </section>

      <section v-if="hasReportFields" class="report-section">
        <h2 class="report-title">Facilitator report</h2>
        <dl class="report-dl">
          <template v-if="session.key_observations">
            <dt>Key observations</dt><dd>{{ session.key_observations }}</dd>
          </template>
          <template v-if="session.protection_notes">
            <dt>Protection notes</dt><dd>{{ session.protection_notes }}</dd>
          </template>
          <template v-if="session.challenges">
            <dt>Challenges</dt><dd>{{ session.challenges }}</dd>
          </template>
          <template v-if="session.follow_up_actions && session.follow_up_actions.length">
            <dt>Follow-up actions</dt>
            <dd>
              <ul class="report-list report-list--inline">
                <li v-for="(a, i) in session.follow_up_actions" :key="i">{{ a }}</li>
              </ul>
            </dd>
          </template>
          <template v-if="session.reflection">
            <dt>Reflection</dt><dd>{{ session.reflection }}</dd>
          </template>
          <template v-if="session.remarks">
            <dt>Remarks</dt><dd>{{ session.remarks }}</dd>
          </template>
        </dl>
      </section>

      <section v-if="session.activities && session.activities.length" class="report-section">
        <h2 class="report-title">Activities ({{ session.activities.length }})</h2>
        <ol class="activity-list">
          <li v-for="a in session.activities" :key="a.id" class="activity-card">
            <div class="activity-card-head">
              <span class="activity-name">{{ a.activity_name }}</span>
              <span class="chip" :class="`session-status--${a.status === 'completed' ? 'completed' : 'in_progress'}`">
                {{ a.status === 'completed' ? 'Completed' : 'Pending' }}
              </span>
            </div>
            <p v-if="a.activity_aim" class="activity-aim">{{ a.activity_aim }}</p>
            <p v-if="a.notes" class="activity-notes"><strong>Notes:</strong> {{ a.notes }}</p>
          </li>
        </ol>
      </section>

      <section v-if="flags.length" class="report-section">
        <h2 class="report-title">Flagged children ({{ flags.length }})</h2>
        <ul class="report-list">
          <li v-for="f in flags" :key="f.id">{{ f.concern }}</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePssSessionsApi, type PssSessionDto } from '../../../services/pss/sessionsApi'
import DashboardBreadcrumb from '../../../components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '../../../components/interfaces/AppIcon.vue'

const route = useRoute()
const sessionId = route.params.sessionId as string
const sessionsApi = usePssSessionsApi()

const session = ref<PssSessionDto | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const flags = computed(() =>
  Array.isArray(session.value?.flags) ? (session.value!.flags as Array<{ id: string; concern: string }>) : [],
)

const hasReportFields = computed(() => {
  const s = session.value
  if (!s) return false
  return Boolean(
    s.key_observations || s.protection_notes || s.challenges || s.reflection || s.remarks ||
    (s.follow_up_actions && s.follow_up_actions.length),
  )
})

const breadcrumbs = computed(() => [
  { title: 'Organisation', href: '/dashboard' },
  { title: session.value ? `Session ${formatDate(session.value.session_date)}` : 'Session', href: route.fullPath, current: true },
])

async function fetch() {
  isLoading.value = true
  error.value = null
  try {
    session.value = await sessionsApi.get(sessionId)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load session'
  } finally {
    isLoading.value = false
  }
}

function formatDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}
function formatDateTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
function capitalize(s?: string | null) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

onMounted(fetch)
</script>

<style scoped>
.session-detail {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.session-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.session-title { margin: 0 0 8px; font-size: 22px; font-weight: 600; }
.session-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-2, rgba(0, 0, 0, 0.04));
  font-size: 12px;
  font-weight: 500;
}
.session-status--in_progress { background: rgba(255, 149, 0, 0.12); color: var(--progress-mid, #FF9500); }
.session-status--completed { background: rgba(52, 199, 89, 0.12); color: var(--progress-high, #34C759); }

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.meta-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
}
.meta-label { font-size: 12px; color: var(--text-muted, #6b7280); }
.meta-value { font-size: 15px; font-weight: 500; }

.report-section {
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 10px;
  padding: 16px;
}
.report-title { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.report-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.report-list--inline { padding-left: 16px; }
.report-dl { display: grid; grid-template-columns: max-content 1fr; column-gap: 16px; row-gap: 8px; margin: 0; }
.report-dl dt { font-weight: 500; color: var(--text-muted, #6b7280); }
.report-dl dd { margin: 0; }

.activity-list { list-style: decimal; padding-left: 20px; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.activity-card { padding: 10px 12px; border-radius: 8px; background: var(--surface-2, rgba(0,0,0,0.02)); }
.activity-card-head { display: flex; align-items: center; gap: 8px; }
.activity-name { font-weight: 500; }
.activity-aim { margin: 6px 0 0; font-size: 13px; color: var(--text-muted, #6b7280); }
.activity-notes { margin: 6px 0 0; font-size: 13px; }

.dash-error { display: flex; align-items: center; gap: 8px; padding: 16px; }
.btn-retry { margin-left: auto; }
.loading-skeleton { display: flex; flex-direction: column; gap: 12px; }
.skeleton-header { height: 60px; border-radius: 10px; background: var(--surface-2, rgba(0,0,0,0.04)); animation: pulse 1.4s infinite; }
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.skeleton-card { height: 80px; border-radius: 10px; background: var(--surface-2, rgba(0,0,0,0.04)); animation: pulse 1.4s infinite; }
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
</style>
