<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Reports', href: '/reports', current: true }]">
    <div class="reports-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">View disaggregation data and export programme reports.</p>
        </div>
      </div>

      <!-- Period selector -->
      <div class="period-bar">
        <div class="field">
          <label class="field-label">From</label>
          <input v-model="periodStart" type="date" class="field-input" />
        </div>
        <div class="field">
          <label class="field-label">To</label>
          <input v-model="periodEnd" type="date" class="field-input" />
        </div>
        <button class="btn-outline" @click="fetchReport">Refresh</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading report data…</div>

      <!-- Disaggregation table -->
      <template v-else>
        <div class="section">
          <h3 class="section-title">Disaggregation Summary</h3>
          <DisaggregationTable :rows="disaggRows" />
        </div>

        <!-- Export buttons -->
        <div class="section">
          <h3 class="section-title">Data Exports</h3>
          <div class="export-grid">
            <button class="export-card" @click="exportExcel('beneficiaries')">
              <span class="export-icon">📊</span>
              <span class="export-label">Beneficiaries Excel</span>
            </button>
            <button class="export-card" @click="exportExcel('disaggregation')">
              <span class="export-icon">📋</span>
              <span class="export-label">Disaggregation Table</span>
            </button>
            <button class="export-card" @click="exportExcel('attendance')">
              <span class="export-icon">📝</span>
              <span class="export-label">Attendance Records</span>
            </button>
            <button class="export-card" @click="exportExcel('5w')">
              <span class="export-icon">🗂️</span>
              <span class="export-label">UNICEF 5W Format</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getActivePinia } from 'pinia'
import { ApiError } from '../services/api'
import DisaggregationTable from '../components/reports/DisaggregationTable.vue'
import type { DisaggregationRow } from '../components/reports/DisaggregationTable.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const BASE_URL = '/api/v1'

function resolveToken(): string | undefined {
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch { return undefined }
}

const now = new Date()
const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
const periodStart = ref(qStart.toISOString().slice(0, 10))
const periodEnd = ref(now.toISOString().slice(0, 10))

const loading = ref(false)
const error = ref<string | null>(null)
const disaggRows = ref<DisaggregationRow[]>([])

async function fetchReport() {
  loading.value = true
  error.value = null
  try {
    const token = resolveToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const qs = new URLSearchParams()
    qs.set('period_start', periodStart.value)
    qs.set('period_end', periodEnd.value)

    const res = await fetch(`${BASE_URL}/dashboard?${qs}`, { headers })
    const raw = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(res.status, raw?.message ?? 'Failed', raw)

    const body = raw?.data ?? raw

    // Map activity_summary to disaggregation rows
    // The dashboard response has activity_summary[]; we'll adapt it
    const activities = body?.activity_summary ?? []
    disaggRows.value = activities.map((a: any) => ({
      code: a.code,
      name: a.name,
      girls: a.girls ?? 0,
      boys: a.boys ?? 0,
      women: a.women ?? 0,
      men: a.men ?? 0,
      disability_male: a.disability_male ?? 0,
      disability_female: a.disability_female ?? 0,
    }))
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load report data'
  } finally {
    loading.value = false
  }
}

async function exportExcel(type: string) {
  try {
    const token = resolveToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const qs = new URLSearchParams()
    qs.set('period_start', periodStart.value)
    qs.set('period_end', periodEnd.value)
    qs.set('format', type)

    const res = await fetch(`${BASE_URL}/reports/export?${qs}`, { headers })
    if (!res.ok) {
      const raw = await res.json().catch(() => ({}))
      throw new Error(raw?.message ?? 'Export failed')
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dart-${type}-${periodStart.value}-${periodEnd.value}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    error.value = e?.message ?? 'Export failed'
  }
}

onMounted(fetchReport)
</script>

<style scoped>
.reports-page { max-width: 1000px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.period-bar { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 22px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

.btn-outline { padding: 9px 16px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-muted); cursor: pointer; }
.btn-outline:hover { border-color: var(--text-primary); color: var(--text-primary); }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }

.section { margin-bottom: 28px; }
.section-title { font-size: 0.88rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 12px; }

.export-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;
}

.export-card {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); cursor: pointer; transition: all 0.15s;
}

.export-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.export-icon { font-size: 1.5rem; }
.export-label { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); text-align: center; }

@media (max-width: 640px) {
  .period-bar { flex-direction: column; align-items: stretch; }
  .export-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
