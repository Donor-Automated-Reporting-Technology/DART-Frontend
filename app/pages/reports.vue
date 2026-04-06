<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Reports', href: '/reports', current: true }]">
    <div class="reports-page">

      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Generate and download programme data exports.</p>
        </div>
      </div>

      <!-- Error banner -->
      <Transition name="rp-fade">
        <div v-if="error" class="rp-error">
          <AppIcon name="alert-circle" :size="16" />
          <span>{{ error }}</span>
          <button class="rp-error-dismiss" @click="error = null">
            <AppIcon name="x" :size="14" />
          </button>
        </div>
      </Transition>

      <!-- Data Exports section -->
      <div class="rp-section">
        <div class="rp-section-header">
          <h3 class="rp-section-title">Data Exports</h3>
          <span class="rp-section-badge">Excel</span>
        </div>
        <p class="rp-section-desc">Download structured spreadsheets for donor reporting, analysis, and record-keeping.</p>

        <div class="rp-card-grid">

          <!-- Beneficiaries export -->
          <button
            class="rp-card"
            :class="{ 'rp-card--loading': exporting }"
            :disabled="exporting"
            @click="exportBeneficiaries"
          >
            <div class="rp-card-icon rp-card-icon--primary">
              <AppIcon name="users" :size="20" />
            </div>
            <div class="rp-card-body">
              <span class="rp-card-title">Beneficiaries</span>
              <span class="rp-card-desc">Full beneficiary register with demographics, status, and enrolment details.</span>
            </div>
            <div class="rp-card-action">
              <span v-if="exporting" class="rp-spinner" />
              <AppIcon v-else name="download" :size="16" />
            </div>
          </button>

          <!-- Attendance export (placeholder) -->
          <button class="rp-card rp-card--disabled" disabled>
            <div class="rp-card-icon rp-card-icon--success">
              <AppIcon name="check-square" :size="20" />
            </div>
            <div class="rp-card-body">
              <span class="rp-card-title">Attendance Records</span>
              <span class="rp-card-desc">Session-level attendance logs across all activities and cohorts.</span>
            </div>
            <div class="rp-card-action">
              <span class="rp-card-soon">Soon</span>
            </div>
          </button>

          <!-- Activity Summary export (placeholder) -->
          <button class="rp-card rp-card--disabled" disabled>
            <div class="rp-card-icon rp-card-icon--accent">
              <AppIcon name="bar-chart" :size="20" />
            </div>
            <div class="rp-card-body">
              <span class="rp-card-title">Activity Summary</span>
              <span class="rp-card-desc">Aggregated actuals vs targets with disaggregation by gender and age.</span>
            </div>
            <div class="rp-card-action">
              <span class="rp-card-soon">Soon</span>
            </div>
          </button>

          <!-- Disaggregation export (placeholder) -->
          <button class="rp-card rp-card--disabled" disabled>
            <div class="rp-card-icon rp-card-icon--warning">
              <AppIcon name="target" :size="20" />
            </div>
            <div class="rp-card-body">
              <span class="rp-card-title">Disaggregation Report</span>
              <span class="rp-card-desc">Breakdown by girls, boys, women, men, and disability status per activity.</span>
            </div>
            <div class="rp-card-action">
              <span class="rp-card-soon">Soon</span>
            </div>
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
.reports-page {
  max-width: 860px;
}

/* ── Page header ─────────────────────────────────── */
.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Error banner ────────────────────────────────── */
.rp-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 20px;
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  color: var(--error);
}

.rp-error-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.rp-error-dismiss:hover {
  opacity: 1;
}

.rp-fade-enter-active,
.rp-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.rp-fade-enter-from,
.rp-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Section ─────────────────────────────────────── */
.rp-section {
  margin-bottom: 32px;
}

.rp-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.rp-section-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.rp-section-badge {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--primary-dim);
  color: var(--primary);
}

.rp-section-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 16px;
  line-height: 1.5;
}

/* ── Card grid ───────────────────────────────────── */
.rp-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

/* ── Report card ─────────────────────────────────── */
.rp-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  width: 100%;
}

.rp-card:hover:not(:disabled) {
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), var(--shadow-glow);
  transform: translateY(-1px);
}

.rp-card:active:not(:disabled) {
  transform: translateY(0);
}

.rp-card--disabled {
  opacity: 0.55;
  cursor: default;
}

.rp-card--loading {
  pointer-events: none;
  opacity: 0.8;
}

/* ── Card icon ───────────────────────────────────── */
.rp-card-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rp-card-icon--primary {
  background: var(--primary-dim);
  color: var(--primary);
}

.rp-card-icon--success {
  background: var(--success-bg);
  color: var(--success);
}

.rp-card-icon--accent {
  background: var(--accent-dim);
  color: var(--accent);
}

.rp-card-icon--warning {
  background: var(--warning-bg);
  color: var(--warning);
}

/* ── Card body ───────────────────────────────────── */
.rp-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rp-card-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
}

.rp-card-desc {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.45;
}

/* ── Card action area ────────────────────────────── */
.rp-card-action {
  flex-shrink: 0;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.rp-card:hover:not(:disabled) .rp-card-action {
  color: var(--primary);
}

.rp-card-soon {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-muted);
}

/* ── Spinner ─────────────────────────────────────── */
.rp-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: rp-spin 0.6s linear infinite;
}

@keyframes rp-spin {
  to { transform: rotate(360deg); }
}

/* ── Mobile ──────────────────────────────────────── */
@media (max-width: 640px) {
  .rp-card {
    padding: 14px;
    gap: 12px;
  }

  .rp-card-icon {
    width: 38px;
    height: 38px;
  }

  .rp-card-desc {
    display: none;
  }
}
</style>
