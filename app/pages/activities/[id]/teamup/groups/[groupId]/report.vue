<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page" style="max-width: 1100px">
      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>

      <template v-else-if="report">
        <div class="tu-header">
          <div>
            <h1 class="tu-title">{{ report.group.name }} · group report</h1>
            <p class="tu-subtitle">
              {{ report.group.service_point_name }} · Age {{ report.group.age_band }} ·
              Facilitators: {{ report.facilitators.join(', ') || '—' }}
            </p>
          </div>
          <NuxtLink :to="groupUrl" class="tu-btn tu-btn--ghost tu-no-print">
            <AppIcon name="arrow-left" :size="14" />
            Group
          </NuxtLink>
        </div>

        <div v-if="justDone" class="tu-alert tu-alert--ok tu-no-print">
          <AppIcon name="check-circle" :size="14" />
          Session {{ justDone }} completed.
        </div>
        <div v-if="error" class="tu-alert tu-alert--error">{{ error }}</div>

        <div class="tu-kpis">
          <div class="tu-kpi"><strong>{{ report.sessions_completed }}/{{ report.total_sessions }}</strong>Sessions done</div>
          <div class="tu-kpi"><strong>{{ report.on_track }}</strong>On track for {{ report.min_dosage }}+</div>
          <div class="tu-kpi"><strong :class="{ 'tu-risk': report.at_risk > 0 }">{{ report.at_risk }}</strong>At risk{{ report.dropped ? ` · ${report.dropped} dropped` : '' }}</div>
        </div>

        <div class="tu-grid-wrap">
          <table class="tu-table">
            <thead>
              <tr>
                <th class="tu-sticky" scope="col">Child</th>
                <th v-for="n in report.total_sessions" :key="n" scope="col">{{ n }}</th>
                <th scope="col">Attended</th>
                <th scope="col">Missed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in report.rows" :key="r.enrollment_id">
                <th class="tu-sticky" scope="row">
                  {{ r.name }}
                  <span v-if="r.status === 'dropped'" class="tu-pill tu-pill--done" :title="r.drop_reason">Dropped</span>
                  <span v-else-if="r.at_risk" class="tu-pill tu-pill--warn">At risk</span>
                </th>
                <td v-for="c in r.cells" :key="c.sequence_no">
                  <span v-if="c.status === 'present'" class="tu-cell tu-cell--present">{{ shortDate(c.date) }}</span>
                  <span v-else-if="c.status === 'absent'" class="tu-cell tu-cell--absent">X</span>
                  <span v-else-if="c.status === 'excused'" class="tu-cell tu-cell--excused">E</span>
                </td>
                <td><strong>{{ r.attended }}</strong></td>
                <td :class="{ 'tu-risk': r.at_risk }">{{ r.missed }}</td>
              </tr>
              <tr v-if="report.rows.length === 0">
                <td :colspan="report.total_sessions + 3" class="tu-muted">No children enrolled yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <span class="tu-muted">Date = attended · X = absent · E = excused. The DRA sheet shows E as X (missed).</span>

        <div class="tu-card tu-no-print">
          <strong style="font-size: 0.88rem">The DRA TeamUP sheet includes</strong>
          <span class="tu-muted">
            Month · Name · Gender · Age · Language · Disability · Caregiver · Contact · Location · Group ·
            Sessions 1–20 (date or X) · Totals attended/missed · Baseline · Endline · Facilitators · Drop-out remark
          </span>
        </div>

        <div class="tu-actions tu-no-print">
          <button type="button" class="tu-btn" :disabled="downloading" @click="download">
            <AppIcon name="download" :size="16" />
            {{ downloading ? 'Preparing…' : 'Download DRA Excel' }}
          </button>
          <button type="button" class="tu-btn tu-btn--ghost" @click="printPage">
            <AppIcon name="printer" :size="16" />
            Print report
          </button>
        </div>
      </template>

      <div v-else-if="error" class="tu-alert tu-alert--error">{{ error }}</div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { teamupApi } from '../../../../../../services/teamupApi'
import type { TeamUpGroupReport } from '../../../../../../interfaces/teamup'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string
const groupId = route.params.groupId as string
const groupUrl = `/activities/${frameworkId}/teamup/groups/${groupId}`
const justDone = computed(() => (route.query.done as string) || '')

const report = ref<TeamUpGroupReport | null>(null)
const loading = ref(true)
const downloading = ref(false)
const error = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { title: 'TeamUp', href: `/activities/${frameworkId}/teamup` },
  { title: report.value?.group.name ?? 'Group', href: groupUrl },
  { title: 'Report', href: route.fullPath, current: true },
])

// "19/3/2026" → "19/3" to keep grid cells narrow.
function shortDate(d?: string) {
  return d ? d.split('/').slice(0, 2).join('/') : ''
}

function printPage() {
  window.print()
}

async function download() {
  downloading.value = true
  error.value = null
  try {
    await teamupApi.downloadDRA({ groupId })
  } catch (e: any) {
    error.value = e?.message ?? 'Download failed'
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    report.value = await teamupApi.getReport(groupId)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load report'
  } finally {
    loading.value = false
  }
})
</script>
