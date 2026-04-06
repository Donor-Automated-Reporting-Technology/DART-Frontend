<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Reports', href: '/reports', current: true }]">
    <div class="reports-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Export beneficiaries data as Excel.</p>
        </div>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Export section -->
      <div class="section">
        <h3 class="section-title">Data Exports</h3>
        <div class="export-grid">
          <button class="export-card" :disabled="exporting" @click="exportBeneficiaries">
            <span class="export-icon">📊</span>
            <span class="export-label">{{ exporting ? 'Downloading…' : 'Beneficiaries Excel' }}</span>
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getActivePinia } from 'pinia'

definePageMeta({ layout: false, middleware: ['auth'] })

const BASE_URL = '/api/v1'

function resolveToken(): string | undefined {
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch { return undefined }
}

const error = ref<string | null>(null)
const exporting = ref(false)

async function exportBeneficiaries() {
  exporting.value = true
  error.value = null
  try {
    const token = resolveToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE_URL}/cfs/beneficiaries/export`, { headers })
    if (!res.ok) {
      const raw = await res.json().catch(() => ({}))
      throw new Error(raw?.message ?? 'Export failed')
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const disposition = res.headers.get('Content-Disposition')
    const filenameMatch = disposition?.match(/filename=([^;]+)/)
    a.download = filenameMatch?.[1]?.trim() ?? 'beneficiaries_export.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    error.value = e?.message ?? 'Export failed'
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.reports-page { max-width: 1000px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }

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

.export-card:hover:not(:disabled) { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.export-card:disabled { opacity: 0.6; cursor: not-allowed; }

.export-icon { font-size: 1.5rem; }
.export-label { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); text-align: center; }

@media (max-width: 640px) {
  .export-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
