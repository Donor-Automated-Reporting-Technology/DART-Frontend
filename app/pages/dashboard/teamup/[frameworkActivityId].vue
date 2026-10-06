<template>
  <div class="tud">
    <DashboardBreadcrumb :crumbs="breadcrumbs" />

    <div v-if="loading" class="tu-stack">
      <div class="tu-skeleton" style="height: 120px" />
      <div class="tud-kpis"><div v-for="n in 4" :key="n" class="tu-skeleton" /></div>
      <div class="tu-skeleton" style="height: 220px" />
    </div>

    <div v-else-if="error" class="tu-alert tu-alert--error">
      <AppIcon name="alert-circle" :size="16" />
      {{ error }}
      <button type="button" class="tu-btn tu-btn--ghost" @click="load">Retry</button>
    </div>

    <template v-else-if="d">
      <!-- ═══ Header ═══ -->
      <section class="tud-card tud-head">
        <div class="tud-head-info">
          <h1 class="tud-title">{{ d.activity.name }}</h1>
          <div class="tud-chips">
            <span v-if="d.activity.code" class="tud-chip">{{ d.activity.code }}</span>
            <span class="tud-chip">TeamUp module</span>
            <span v-if="d.activity.target_count" class="tud-chip">Target: {{ d.activity.target_count }} {{ d.activity.target_unit }}</span>
            <span v-if="d.scope_location" class="tud-chip tud-chip--scope">Your CFS: {{ d.scope_location }}</span>
          </div>
          <div class="tu-actions tud-actions">
            <NuxtLink :to="hubUrl" class="tu-btn">
              <AppIcon name="users" :size="16" />
              Open TeamUp hub
            </NuxtLink>
            <NuxtLink :to="`/activities/${d.activity.framework_id}/teamup/reports?fa=${d.activity.id}`" class="tu-btn tu-btn--ghost">
              <AppIcon name="file-text" :size="16" />
              Reports
            </NuxtLink>
            <button v-if="canExport" type="button" class="tu-btn tu-btn--ghost" :disabled="downloading" @click="downloadExcel">
              <AppIcon name="download" :size="16" />
              {{ downloading ? 'Preparing…' : 'Excel' }}
            </button>
          </div>
        </div>
        <div v-if="d.activity.target_count" class="tud-ring" :title="`${d.summary.children} of ${d.activity.target_count} reached`">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path class="tud-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="tud-ring-fill" :stroke-dasharray="`${Math.min(d.summary.target_percentage, 100)}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="tud-ring-label">{{ d.summary.target_percentage }}%</span>
        </div>
      </section>

      <!-- ═══ Headline figures ═══ -->
      <section class="tud-kpis" aria-label="Headline figures">
        <div class="tud-card tud-kpi">
          <span class="tud-kpi-label">Children reached</span>
          <span class="tud-kpi-value">{{ d.summary.children }}</span>
          <span class="tud-kpi-foot">{{ d.summary.girls }} girls · {{ d.summary.boys }} boys · {{ d.summary.with_disability }} with disability</span>
        </div>
        <div class="tud-card tud-kpi tud-kpi--accent">
          <span class="tud-kpi-label">Reached {{ d.min_dosage }}+ sessions</span>
          <span class="tud-kpi-value">{{ d.summary.reached_min_dosage }}<small> / {{ d.summary.children }}</small></span>
          <div class="tu-bar"><span :style="{ width: `${dosagePct}%` }" /></div>
          <span class="tud-kpi-foot">{{ dosagePct }}% of children — the minimum for TeamUp to help</span>
        </div>
        <div class="tud-card tud-kpi">
          <span class="tud-kpi-label">Attendance</span>
          <span class="tud-kpi-value" :class="rateClass(d.summary.attendance_rate)">{{ d.summary.attendance_rate }}%</span>
          <span class="tud-kpi-foot">{{ d.summary.avg_sessions_per_child }} sessions per child · {{ d.summary.sessions_held }} sessions held</span>
        </div>
        <div class="tud-card tud-kpi" :class="{ 'tud-kpi--alert': attention > 0 }">
          <span class="tud-kpi-label">Need attention</span>
          <span class="tud-kpi-value">{{ attention }}</span>
          <span class="tud-kpi-foot">{{ d.summary.at_risk }} at risk · {{ d.summary.dropped }} dropped · {{ d.summary.flagged_children }} flagged</span>
        </div>
      </section>

      <!-- ═══ Dosage ═══ -->
      <section class="tud-card">
        <div class="tud-section-head">
          <h2 class="tud-section-title">Sessions attended per child</h2>
          <span class="tu-muted">{{ d.summary.active_groups }} active · {{ d.summary.completed_groups }} completed groups</span>
        </div>
        <div class="tud-bars">
          <div v-for="b in d.dosage" :key="b.label" class="tud-bar-row">
            <span class="tud-bar-label">{{ b.label }}</span>
            <div class="tud-bar-track">
              <div class="tud-bar-fill" :class="{ 'tud-bar-fill--ok': isOkBucket(b.label) }" :style="{ width: `${barWidth(b.count)}%` }" />
            </div>
            <span class="tud-bar-count">{{ b.count }}</span>
          </div>
        </div>
        <span class="tu-muted">Green = {{ d.min_dosage }} or more sessions. TeamUp research shows children need at least {{ d.min_dosage }} sessions to benefit.</span>
      </section>

      <!-- ═══ Wellbeing + baseline/endline ═══ -->
      <div class="tud-two">
        <section class="tud-card">
          <h2 class="tud-section-title">How children feel</h2>
          <template v-if="d.wellbeing.sessions_counted">
            <div class="tud-compare">
              <div><span class="tu-muted">Check-in · good</span><div class="tu-bar"><span :style="{ width: `${d.wellbeing.checkin_good_pct}%` }" /></div><strong>{{ d.wellbeing.checkin_good_pct }}%</strong></div>
              <div><span class="tu-muted">Check-out · good</span><div class="tu-bar"><span :style="{ width: `${d.wellbeing.checkout_good_pct}%` }" /></div><strong>{{ d.wellbeing.checkout_good_pct }}%</strong></div>
            </div>
            <span class="tu-muted">
              Thumbs counts from {{ d.wellbeing.sessions_counted }} sessions. "Not good": {{ d.wellbeing.checkin_bad_pct }}% at check-in → {{ d.wellbeing.checkout_bad_pct }}% at check-out.
            </span>
          </template>
          <span v-else class="tu-muted">No thumbs counts recorded yet.</span>
        </section>
        <section class="tud-card">
          <h2 class="tud-section-title">Baseline → Endline</h2>
          <template v-if="d.scores.children_with_both">
            <div class="tud-scores">
              <div><span class="tud-kpi-value">{{ d.scores.avg_baseline }}</span><span class="tu-muted">Avg baseline</span></div>
              <AppIcon name="chevron-right" :size="18" />
              <div><span class="tud-kpi-value">{{ d.scores.avg_endline }}</span><span class="tu-muted">Avg endline</span></div>
              <div><span class="tud-kpi-value" :class="d.scores.avg_change >= 0 ? 'tud-good' : 'tud-bad'">{{ d.scores.avg_change > 0 ? '+' : '' }}{{ d.scores.avg_change }}</span><span class="tu-muted">Change</span></div>
            </div>
            <span class="tu-muted">{{ d.scores.improved }} of {{ d.scores.children_with_both }} children improved.</span>
          </template>
          <span v-else class="tu-muted">No children have both a baseline and an endline score yet.</span>
        </section>
      </div>

      <!-- ═══ Groups ═══ -->
      <section class="tud-card">
        <div class="tud-section-head">
          <h2 class="tud-section-title">Groups</h2>
          <span class="tu-muted">{{ d.groups.length }}</span>
        </div>
        <div v-if="d.groups.length" class="tud-table-wrap">
          <table class="tud-table">
            <thead>
              <tr><th>Group</th><th v-if="!d.scope_location">Location</th><th>Children</th><th>Progress</th><th>Attendance</th><th>At risk</th><th>Dropped</th></tr>
            </thead>
            <tbody>
              <tr v-for="g in d.groups" :key="g.id" class="tud-click" tabindex="0" @click="openGroup(g.id)" @keydown.enter="openGroup(g.id)">
                <td><strong>{{ g.name }}</strong><span class="tu-muted"> · {{ g.age_band }}</span><span v-if="g.status !== 'active'" class="tu-pill tu-pill--done">Done</span></td>
                <td v-if="!d.scope_location">{{ g.location_name }}</td>
                <td>{{ g.enrolled }}</td>
                <td class="tud-progress"><div class="tu-bar"><span :style="{ width: `${(g.sessions_completed / g.total_sessions) * 100}%` }" /></div>{{ g.sessions_completed }}/{{ g.total_sessions }}</td>
                <td :class="rateClass(g.attendance_rate)">{{ g.attendance_rate }}%</td>
                <td :class="{ 'tud-bad': g.at_risk > 0 }">{{ g.at_risk }}</td>
                <td>{{ g.dropped }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <span v-else class="tu-muted">No TeamUp groups yet. Create one from the TeamUp hub.</span>
      </section>

      <!-- ═══ By location (admins) ═══ -->
      <section v-if="!d.scope_location && d.by_location.length" class="tud-card">
        <div class="tud-section-head">
          <h2 class="tud-section-title">By location</h2>
          <span class="tu-muted">{{ d.by_location.length }} locations</span>
        </div>
        <div class="tud-table-wrap">
          <table class="tud-table">
            <thead>
              <tr><th>Location</th><th>Groups</th><th>Children</th><th>Girls</th><th>Boys</th><th>Sessions</th><th>Attendance</th><th>{{ d.min_dosage }}+ sessions</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in d.by_location" :key="l.location_id">
                <td><strong>{{ l.location_name }}</strong></td>
                <td>{{ l.groups }}</td><td>{{ l.children }}</td><td>{{ l.girls }}</td><td>{{ l.boys }}</td>
                <td>{{ l.sessions_held }}</td>
                <td :class="rateClass(l.attendance_rate)">{{ l.attendance_rate }}%</td>
                <td>{{ l.reached_min_dosage }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ Recent sessions ═══ -->
      <section v-if="d.recent_sessions.length" class="tud-card">
        <div class="tud-section-head">
          <h2 class="tud-section-title">Recent sessions</h2>
        </div>
        <div class="tud-table-wrap">
          <table class="tud-table">
            <thead>
              <tr><th>Date</th><th>Group</th><th>Session</th><th>Facilitator</th><th>Present</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in d.recent_sessions" :key="s.id" class="tud-click" tabindex="0" @click="openSession(s.id)" @keydown.enter="openSession(s.id)">
                <td>{{ formatDate(s.date) }}</td>
                <td>{{ s.group_name }}<span v-if="!d.scope_location" class="tu-muted"> · {{ s.location_name }}</span></td>
                <td>{{ s.sequence_no }} · {{ s.module_name }}<span v-if="s.status !== 'completed'" class="tu-pill tu-pill--warn">In progress</span></td>
                <td>{{ s.facilitator_name ?? '—' }}</td>
                <td>{{ s.present }}/{{ s.marked }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardBreadcrumb from '../../../components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '../../../components/interfaces/AppIcon.vue'
import { useAuthStore } from '../../../stores/auth'
import { canDownloadData, teamupApi } from '../../../services/teamupApi'
import type { TeamUpDashboard } from '../../../interfaces/teamup'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const frameworkActivityId = route.params.frameworkActivityId as string

const d = ref<TeamUpDashboard | null>(null)
const loading = ref(true)
const downloading = ref(false)
const error = ref<string | null>(null)
const canExport = computed(() => canDownloadData(auth.userRole))

const breadcrumbs = computed(() => {
  const crumbs = [{ title: d.value?.scope_location ? 'My location' : 'Organisation', href: '/dashboard' }]
  if (d.value && !d.value.scope_location) {
    crumbs.push({ title: 'Project', href: `/dashboard/projects/${d.value.activity.framework_id}` })
  }
  crumbs.push({ title: d.value?.activity.name || 'TeamUp', href: route.fullPath })
  return crumbs
})

const hubUrl = computed(() => d.value ? `/activities/${d.value.activity.framework_id}/teamup?fa=${d.value.activity.id}` : '#')
const dosagePct = computed(() => d.value?.summary.children ? Math.round((d.value.summary.reached_min_dosage / d.value.summary.children) * 100) : 0)
const attention = computed(() => (d.value ? d.value.summary.at_risk + d.value.summary.dropped : 0))
const maxBucket = computed(() => Math.max(1, ...(d.value?.dosage ?? []).map(b => b.count)))

const barWidth = (n: number) => Math.round((n / maxBucket.value) * 100)
const isOkBucket = (label: string) => label.startsWith('12') || label.startsWith('20')
const rateClass = (r: number) => (r >= 75 ? 'tud-good' : r >= 50 ? 'tud-warn' : 'tud-bad')
const formatDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function openGroup(id: string) {
  if (d.value) router.push(`/activities/${d.value.activity.framework_id}/teamup/groups/${id}`)
}
function openSession(id: string) {
  if (d.value) router.push(`/activities/${d.value.activity.framework_id}/teamup/sessions/${id}`)
}

async function downloadExcel() {
  downloading.value = true
  try {
    await teamupApi.downloadExcel({ frameworkActivityId })
  } catch (e: any) {
    error.value = e?.message ?? 'Download failed'
  } finally {
    downloading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    d.value = await teamupApi.getDashboard(frameworkActivityId)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load the TeamUp dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.tud { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; padding-bottom: 48px; }
.tud-card { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.tud-head { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tud-head-info { display: flex; flex-direction: column; gap: 8px; flex: 1 1 320px; min-width: 0; }
.tud-title { font-size: 1.35rem; font-weight: 750; margin: 0; color: var(--text-primary); letter-spacing: -0.02em; }
.tud-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tud-chip { font-size: 0.72rem; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color); }
.tud-chip--scope { background: var(--primary-dim); color: var(--primary); border-color: transparent; }
.tud-actions { margin-top: 4px; }
.tud-actions > * { flex: 0 1 auto; }
.tud-ring { position: relative; width: 92px; height: 92px; flex: none; }
.tud-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.tud-ring path { fill: none; stroke-width: 3; }
.tud-ring-bg { stroke: var(--bg-input); }
.tud-ring-fill { stroke: var(--primary); stroke-linecap: round; }
.tud-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 750; font-size: 1.05rem; color: var(--text-primary); }

.tud-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.tud-kpi { gap: 6px; }
.tud-kpi-label { font-size: 0.72rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.tud-kpi-value { font-size: 1.8rem; font-weight: 750; color: var(--text-primary); line-height: 1.1; }
.tud-kpi-value small { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }
.tud-kpi-foot { font-size: 0.75rem; color: var(--text-muted); }
.tud-kpi--accent { border-color: var(--primary); }
.tud-kpi--alert { border-color: #f59e0b; }

.tud-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.tud-section-title { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary); }

.tud-bars { display: flex; flex-direction: column; gap: 8px; }
.tud-bar-row { display: grid; grid-template-columns: 56px 1fr 40px; align-items: center; gap: 10px; }
.tud-bar-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.tud-bar-track { height: 18px; border-radius: 6px; background: var(--bg-input); overflow: hidden; }
.tud-bar-fill { height: 100%; background: #f59e0b; border-radius: 6px; min-width: 2px; }
.tud-bar-fill--ok { background: var(--primary); }
.tud-bar-count { font-size: 0.85rem; font-weight: 700; text-align: right; color: var(--text-primary); }

.tud-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
.tud-compare { display: flex; flex-direction: column; gap: 10px; }
.tud-compare > div { display: grid; grid-template-columns: 120px 1fr 44px; align-items: center; gap: 10px; }
.tud-scores { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; color: var(--text-muted); }
.tud-scores > div { display: flex; flex-direction: column; }

.tud-table-wrap { overflow-x: auto; }
.tud-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.tud-table th { text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 650; padding: 8px 10px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.tud-table td { padding: 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); white-space: nowrap; }
.tud-table .tu-pill { margin-left: 6px; }
.tud-click { cursor: pointer; }
.tud-click:hover td { background: var(--primary-dim); }
.tud-click:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.tud-progress { min-width: 150px; }
.tud-progress .tu-bar { display: inline-block; width: 90px; vertical-align: middle; margin-right: 8px; }

.tud-good { color: var(--primary); }
.tud-warn { color: #b45309; }
.tud-bad { color: #b91c1c; }
</style>
