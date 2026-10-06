<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div class="tu-header">
        <div>
          <h1 class="tu-title">TeamUp reports</h1>
          <p class="tu-subtitle">Word reports for your supervisor — one day, or a whole week.</p>
        </div>
        <NuxtLink :to="hubUrl" class="tu-btn tu-btn--ghost">
          <AppIcon name="arrow-left" :size="14" />
          Hub
        </NuxtLink>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>
      <div v-if="notice" class="tu-alert tu-alert--warn">{{ notice }}</div>

      <label v-if="isManager" class="tu-card tu-row" style="cursor: pointer">
        <span>
          <strong style="font-size: 0.88rem">Only sessions I facilitated</strong>
          <span class="tu-muted" style="display: block">Turn off to include every facilitator's sessions.</span>
        </span>
        <input v-model="mine" type="checkbox" style="width: 22px; height: 22px">
      </label>

      <!-- Daily -->
      <section class="tu-card">
        <strong>Daily report</strong>
        <span class="tu-muted">Every TeamUp session held on one day, with attendance, activities, thumbs, observations and follow-up.</span>
        <div class="tu-field">
          <label for="tu-day">Day</label>
          <input id="tu-day" v-model="day" type="date" class="tu-input" :max="today">
        </div>
        <button type="button" class="tu-btn" :disabled="busy === 'daily' || !day" @click="downloadDaily">
          <AppIcon name="file-text" :size="16" />
          {{ busy === 'daily' ? 'Preparing…' : 'Download daily report (Word)' }}
        </button>
      </section>

      <!-- Weekly -->
      <section class="tu-card">
        <strong>Weekly report</strong>
        <span class="tu-muted">The week at a glance: sessions held, group progress, children to follow up and key observations.</span>
        <div class="tu-field">
          <label for="tu-week">Any day in the week</label>
          <input id="tu-week" v-model="weekDay" type="date" class="tu-input" :max="today">
          <span class="tu-muted">Week of {{ formatShort(week.from) }} – {{ formatShort(week.to) }} (Monday to Sunday)</span>
        </div>
        <button type="button" class="tu-btn" :disabled="busy === 'weekly' || !weekDay" @click="downloadWeekly">
          <AppIcon name="file-text" :size="16" />
          {{ busy === 'weekly' ? 'Preparing…' : 'Download weekly report (Word)' }}
        </button>
      </section>

      <!-- Data download: managers and M&E only -->
      <section v-if="isManager" class="tu-card">
        <strong>Attendance data (Excel)</strong>
        <span class="tu-muted">Every child in this activity's groups with sessions 1–20. For admins, programme managers and M&amp;E.</span>
        <button type="button" class="tu-btn tu-btn--ghost" :disabled="busy === 'excel'" @click="downloadExcel">
          <AppIcon name="download" :size="16" />
          {{ busy === 'excel' ? 'Preparing…' : 'Download Excel' }}
        </button>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppIcon from '../../../../components/interfaces/AppIcon.vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../../../stores/auth'
import { canDownloadData, teamupApi, todayISO } from '../../../../services/teamupApi'
import { loadReportHeader } from '../../../../composables/useTeamUpHelpers'
import { buildDailyReport, buildWeeklyReport, downloadDoc } from '../../../../utils/teamupWordReport'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const auth = useAuthStore()
const frameworkId = route.params.id as string
const frameworkActivityId = (route.query.fa as string) || ''
const hubUrl = `/activities/${frameworkId}/teamup${frameworkActivityId ? `?fa=${frameworkActivityId}` : ''}`

const breadcrumbs = computed(() => [
  { title: 'TeamUp', href: hubUrl },
  { title: 'Reports', href: route.fullPath, current: true },
])

const isManager = computed(() => canDownloadData(auth.userRole))
const today = todayISO()
const day = ref(today)
const weekDay = ref(today)
// Facilitators report on their own sessions; managers can include everyone.
const mine = ref(!isManager.value)
const busy = ref<'' | 'daily' | 'weekly' | 'excel'>('')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const week = computed(() => {
  const d = new Date(`${weekDay.value || today}T12:00:00`)
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: iso(monday), to: iso(sunday) }
})
const formatShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

async function run(kind: 'daily' | 'weekly', from: string, to: string) {
  busy.value = kind
  error.value = null
  notice.value = null
  try {
    const [details, header] = await Promise.all([
      teamupApi.listSessions({ from, to, mine: mine.value, frameworkActivityId: frameworkActivityId || undefined }),
      loadReportHeader(frameworkId, frameworkActivityId || undefined),
    ])
    if (details.length === 0) {
      notice.value = kind === 'daily'
        ? 'No TeamUp sessions were recorded on that day.'
        : 'No TeamUp sessions were recorded in that week.'
      return
    }
    const opts = { preparedBy: auth.userName ?? 'Facilitator', mine: mine.value }
    const slug = (auth.userName ?? 'teamup').replace(/\s+/g, '-').toLowerCase()
    if (kind === 'daily') {
      downloadDoc(buildDailyReport(details, from, header, opts), `teamup-daily-report-${from}-${slug}.doc`)
    } else {
      downloadDoc(buildWeeklyReport(details, from, to, header, opts), `teamup-weekly-report-${from}-${slug}.doc`)
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Could not prepare the report'
  } finally {
    busy.value = ''
  }
}

const downloadDaily = () => run('daily', day.value, day.value)
const downloadWeekly = () => run('weekly', week.value.from, week.value.to)

async function downloadExcel() {
  busy.value = 'excel'
  error.value = null
  try {
    await teamupApi.downloadExcel({ frameworkActivityId: frameworkActivityId || undefined })
  } catch (e: any) {
    error.value = e?.message ?? 'Download failed'
  } finally {
    busy.value = ''
  }
}
</script>
