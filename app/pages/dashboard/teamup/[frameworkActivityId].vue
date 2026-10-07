<template>
  <div class="tud">
    <DashboardBreadcrumb :crumbs="breadcrumbs" />

    <div v-if="loading" class="tu-stack">
      <div class="tu-skeleton" style="height: 120px" />
      <div class="tud-bento"><div class="tu-skeleton tud-hero" style="height: 220px" /><div v-for="n in 3" :key="n" class="tu-skeleton" /></div>
      <div class="tu-skeleton" style="height: 220px" />
    </div>

    <div v-else-if="error" class="tu-alert tu-alert--error">
      <AppIcon name="alert-circle" :size="16" />
      {{ error }}
      <button type="button" class="tu-btn tu-btn--ghost" @click="load">Retry</button>
    </div>

    <template v-else-if="d">
      <!-- ═══ Header ═══ -->
      <section class="tud-head">
        <div>
          <h1 class="tud-title">{{ d.activity.name }}</h1>
          <p v-if="d.scope_location" class="tud-sub">{{ d.scope_location }}</p>
        </div>
        <div class="tud-actions">
          <NuxtLink :to="hubUrl" class="tu-btn">
            <AppIcon name="users" :size="16" />
            Open TeamUp hub
          </NuxtLink>
          <NuxtLink :to="`/activities/${d.activity.framework_id}/teamup/reports?fa=${d.activity.id}`" class="tu-btn tu-btn--ghost">
            <AppIcon name="file-text" :size="16" />
            Reports
          </NuxtLink>
        </div>
      </section>

      <!-- ═══ Reach + headline figures ═══ -->
      <section class="tud-bento" aria-label="Headline figures">
        <ReachHero
          class="tud-hero"
          :total="d.summary.children"
          :girls="d.summary.girls"
          :boys="d.summary.boys"
          :with-disability="d.summary.with_disability"
          :target="d.activity.target_count || undefined"
          badge="TeamUp"
        />
        <StatTile
          :value="`${d.summary.attendance_rate}%`"
          label="Attendance"
          :sub="`${d.summary.avg_sessions_per_child} sessions per child`"
          :tone="rateTone(d.summary.attendance_rate)"
        />
        <StatTile
          :value="d.summary.sessions_held"
          label="Sessions held"
          :sub="`${d.summary.active_groups} active · ${d.summary.completed_groups} completed groups`"
        />
        <StatTile
          :value="attention"
          label="Need attention"
          :sub="`${d.summary.at_risk} at risk · ${d.summary.dropped} dropped`"
          :alert="attention > 0"
        />
      </section>

      <!-- ═══ Dosage ═══ -->
      <section class="tud-card">
        <div class="tud-section-head">
          <h2 class="tud-section-title">Sessions attended per child</h2>
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
        <span class="tu-muted">Green: {{ d.min_dosage }} or more sessions — what children need for TeamUp to help.</span>
      </section>

      <!-- ═══ Wellbeing + baseline/endline ═══ -->
      <div v-if="d.wellbeing.sessions_counted || d.scores.children_with_both" class="tud-two">
        <section v-if="d.wellbeing.sessions_counted" class="tud-card">
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
        </section>
        <section v-if="d.scores.children_with_both" class="tud-card">
          <h2 class="tud-section-title">Baseline → Endline</h2>
          <template v-if="d.scores.children_with_both">
            <div class="tud-scores">
              <div><span class="tud-num">{{ d.scores.avg_baseline }}</span><span class="tu-muted">Avg baseline</span></div>
              <AppIcon name="chevron-right" :size="18" />
              <div><span class="tud-num">{{ d.scores.avg_endline }}</span><span class="tu-muted">Avg endline</span></div>
              <div><span class="tud-num" :class="d.scores.avg_change >= 0 ? 'tud-good' : 'tud-bad'">{{ d.scores.avg_change > 0 ? '+' : '' }}{{ d.scores.avg_change }}</span><span class="tu-muted">Change</span></div>
            </div>
            <span class="tu-muted">{{ d.scores.improved }} of {{ d.scores.children_with_both }} children improved.</span>
          </template>
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
import ReachHero from '../../../components/dashboard/module/ReachHero.vue'
import StatTile from '../../../components/dashboard/module/StatTile.vue'
import AppIcon from '../../../components/interfaces/AppIcon.vue'
import { teamupApi } from '../../../services/teamupApi'
import type { TeamUpDashboard } from '../../../interfaces/teamup'

const route = useRoute()
const router = useRouter()
const frameworkActivityId = route.params.frameworkActivityId as string

const d = ref<TeamUpDashboard | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const breadcrumbs = computed(() => {
  const crumbs = [{ title: d.value?.scope_location ? 'My location' : 'Organisation', href: '/dashboard' }]
  if (d.value && !d.value.scope_location) {
    crumbs.push({ title: 'Project', href: `/dashboard/projects/${d.value.activity.framework_id}` })
  }
  crumbs.push({ title: d.value?.activity.name || 'TeamUp', href: route.fullPath })
  return crumbs
})

const hubUrl = computed(() => d.value ? `/activities/${d.value.activity.framework_id}/teamup?fa=${d.value.activity.id}` : '#')
const attention = computed(() => (d.value ? d.value.summary.at_risk + d.value.summary.dropped : 0))
const maxBucket = computed(() => Math.max(1, ...(d.value?.dosage ?? []).map(b => b.count)))

const barWidth = (n: number) => Math.round((n / maxBucket.value) * 100)
const isOkBucket = (label: string) => label.startsWith('12') || label.startsWith('20')
const rateTone = (r: number) => (r >= 75 ? 'good' : r >= 50 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad'
const rateClass = (r: number) => (r >= 75 ? 'tud-good' : r >= 50 ? 'tud-warn' : 'tud-bad')
const formatDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function openGroup(id: string) {
  if (d.value) router.push(`/activities/${d.value.activity.framework_id}/teamup/groups/${id}`)
}
function openSession(id: string) {
  if (d.value) router.push(`/activities/${d.value.activity.framework_id}/teamup/sessions/${id}`)
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
.tud-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tud-title { font-size: 1.45rem; font-weight: 750; margin: 0; color: var(--text-primary); letter-spacing: -0.02em; }
.tud-sub { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); }
.tud-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tud-bento { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: repeat(3, auto); gap: 12px; }
.tud-hero { grid-row: span 3; }
@media (max-width: 760px) {
  .tud-bento { grid-template-columns: 1fr; }
  .tud-hero { grid-row: auto; }
}

.tud-num { font-size: 1.8rem; font-weight: 750; color: var(--text-primary); line-height: 1.1; }
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
