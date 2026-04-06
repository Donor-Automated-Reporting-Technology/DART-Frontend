<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Attendance', href: '/activities/attendance', current: true },
    ]"
  >
    <div class="attendance-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">Daily Attendance</h1>
          <p class="page-subtitle">Record beneficiary attendance for today's session.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="field">
          <label class="field-label">Date</label>
          <input v-model="date" type="date" class="field-input" />
        </div>
      </div>

      <!-- Submitted banner -->
      <div v-if="submitted" class="success-banner">
        <svg class="banner-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" fill="#34C759" />
          <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Attendance submitted successfully!</span>
        <button class="btn-text" @click="submitted = false; fetchBeneficiaries()">Record another</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner" />
        <span>Loading beneficiaries...</span>
      </div>

      <!-- Card List -->
      <div v-else-if="rows.length > 0 && !submitted" class="attendance-list">
        <!-- Summary Chip (fixed at top) -->
        <div class="summary-chip-bar">
          <div class="summary-chip">
            <span class="chip-count">{{ presentCount }}</span>
            <span class="chip-label">Present</span>
            <span class="chip-divider">&middot;</span>
            <span class="chip-count chip-count--remaining">{{ remainingCount }}</span>
            <span class="chip-label">Remaining</span>
          </div>
          <div class="toolbar-actions">
            <button class="btn-tool" @click="selectAll">Mark All</button>
            <button class="btn-tool btn-tool--muted" @click="deselectAll">Clear</button>
          </div>
        </div>

        <!-- Beneficiary Cards -->
        <div class="card-stack">
          <div
            v-for="row in rows"
            :key="row.id"
            class="beneficiary-card"
            :class="{ 'beneficiary-card--active': row.selected }"
            @click="toggleBeneficiary(row.id)"
          >
            <div class="card-content">
              <div class="card-primary">
                <span class="card-name">{{ row.full_name }}</span>
                <div class="card-meta">
                  <span class="meta-id">{{ row.id.slice(0, 8).toUpperCase() }}</span>
                  <span class="meta-sep">&middot;</span>
                  <span v-if="row.age">Age {{ row.age }}</span>
                  <span v-if="row.age && row.sex" class="meta-sep">&middot;</span>
                  <span v-if="row.sex" class="meta-gender">{{ row.sex }}</span>
                  <template v-if="row.disability_status && row.disability_status !== 'none'">
                    <span class="meta-sep">&middot;</span>
                    <span class="meta-disability">{{ row.disability_status }}</span>
                  </template>
                </div>
              </div>
              <div class="card-check">
                <div class="check-circle" :class="{ 'check-circle--checked': row.selected }">
                  <svg
                    v-if="row.selected"
                    class="check-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M3 7.5L5.5 10L11 4"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Footer -->
        <div class="submit-footer">
          <div class="footer-stats">
            <span>Girls: <strong>{{ genderBreakdown.girls }}</strong></span>
            <span>Boys: <strong>{{ genderBreakdown.boys }}</strong></span>
            <span v-if="disabilityCount > 0">Disability: <strong>{{ disabilityCount }}</strong></span>
          </div>
          <button
            class="btn-submit"
            :disabled="submitting || presentCount === 0"
            @click="submitAttendance"
          >
            <span v-if="submitting" class="btn-spinner" />
            {{ submitting ? 'Submitting...' : 'Submit Attendance' }}
          </button>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && !submitted" class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5" />
            <path d="M4 12H28" stroke="currentColor" stroke-width="1.5" />
            <circle cx="11" cy="18" r="1.5" fill="currentColor" />
            <circle cx="16" cy="18" r="1.5" fill="currentColor" />
            <circle cx="21" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <p>No beneficiaries registered at your assigned location.</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAttendance } from '../../composables/useAttendance'

definePageMeta({ layout: false, middleware: ['auth'] })

const {
  date, rows, loading, submitting, submitted, error,
  presentCount, absentCount, totalCount, genderBreakdown, disabilityCount,
  fetchBeneficiaries, toggleBeneficiary, selectAll, deselectAll, submitAttendance,
} = useAttendance()

const remainingCount = computed(() => totalCount.value - presentCount.value)

onMounted(() => {
  fetchBeneficiaries()
})
</script>

<style scoped>
/* ── Page Layout ─────────────────────────────────────────────────────────── */
.attendance-page {
  max-width: 680px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Filters ─────────────────────────────────────────────────────────────── */
.filters {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.field-input {
  padding: 9px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
}

.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

/* ── Success Banner ──────────────────────────────────────────────────────── */
.success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--success) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 16%, transparent);
  border-radius: var(--radius-md);
  color: var(--success);
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.banner-icon {
  flex-shrink: 0;
}

.error-msg {
  font-size: 0.82rem;
  color: var(--error);
  margin: 0 0 12px;
}

/* ── Loading ─────────────────────────────────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Summary Chip Bar ────────────────────────────────────────────────────── */
.summary-chip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 -16px 16px;
  padding: 10px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg-dark) 82%, transparent);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-bottom: 0.5px solid color-mix(in srgb, var(--border-color) 60%, transparent);
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 0 0 0.5px rgba(0, 0, 0, 0.02);
}

.chip-count {
  color: #34C759;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 1.2em;
  text-align: center;
}

.chip-count--remaining {
  color: var(--text-secondary);
}

.chip-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.chip-divider {
  color: var(--text-muted);
  font-weight: 400;
  opacity: 0.5;
  margin: 0 2px;
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.btn-tool {
  padding: 6px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.18s ease;
  letter-spacing: -0.005em;
}

.btn-tool:hover {
  background: var(--primary-dim);
  border-color: var(--primary);
}

.btn-tool:active {
  transform: scale(0.96);
}

.btn-tool--muted {
  color: var(--text-muted);
  font-weight: 500;
}

.btn-tool--muted:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
  border-color: var(--text-muted);
}

/* ── Card Stack ──────────────────────────────────────────────────────────── */
.card-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Beneficiary Card ────────────────────────────────────────────────────── */
.beneficiary-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    transform 0.15s cubic-bezier(0.2, 0, 0, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  will-change: transform;
}

.beneficiary-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.beneficiary-card:active {
  transform: scale(0.985);
  transition: transform 0.08s ease;
}

.beneficiary-card--active {
  border-color: rgba(52, 199, 89, 0.28);
  background: color-mix(in srgb, #34C759 2.5%, var(--bg-card));
  box-shadow:
    0 0 0 0.5px rgba(52, 199, 89, 0.1),
    0 1px 6px rgba(52, 199, 89, 0.06);
}

.beneficiary-card--active:hover {
  border-color: rgba(52, 199, 89, 0.38);
  box-shadow:
    0 0 0 0.5px rgba(52, 199, 89, 0.14),
    0 2px 10px rgba(52, 199, 89, 0.08);
}

.card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
}

.card-primary {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.card-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.012em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.meta-id {
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}

.meta-sep {
  color: var(--text-muted);
  opacity: 0.5;
  font-size: 0.68rem;
}

.meta-gender {
  text-transform: capitalize;
}

.meta-disability {
  text-transform: capitalize;
  color: var(--warning);
  font-weight: 500;
}

/* ── Checkmark Circle ────────────────────────────────────────────────────── */
.card-check {
  flex-shrink: 0;
}

.check-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--border-color) 100%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  background: transparent;
  flex-shrink: 0;
}

.beneficiary-card:hover .check-circle:not(.check-circle--checked) {
  border-color: color-mix(in srgb, var(--text-muted) 50%, transparent);
}

.check-circle--checked {
  background: #34C759;
  border-color: #34C759;
  animation: check-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.25);
}

.check-icon {
  animation: check-fade 0.25s ease 0.06s both;
}

@keyframes check-spring {
  0% {
    transform: scale(0.5);
  }
  40% {
    transform: scale(1.2);
  }
  65% {
    transform: scale(0.92);
  }
  82% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes check-fade {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── Submit Footer ───────────────────────────────────────────────────────── */
.submit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px -16px 0;
  padding: 16px 20px;
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg-dark) 82%, transparent);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-top: 0.5px solid color-mix(in srgb, var(--border-color) 60%, transparent);
  border-radius: 0;
}

.footer-stats {
  display: flex;
  gap: 16px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.footer-stats strong {
  color: var(--text-primary);
  font-weight: 600;
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: #34C759;
  color: #fff;
  border: none;
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  letter-spacing: -0.005em;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.2);
}

.btn-submit:hover {
  background: #2fb84e;
  box-shadow: 0 4px 14px rgba(52, 199, 89, 0.28);
  transform: translateY(-0.5px);
}

.btn-submit:active {
  transform: scale(0.97);
  box-shadow: 0 1px 4px rgba(52, 199, 89, 0.2);
}

.btn-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn-text {
  background: none;
  border: none;
  color: var(--success);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}

/* ── Empty State ─────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 56px 24px;
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 14px;
}

.empty-state p {
  margin: 0;
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.5;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .filters {
    flex-direction: column;
  }

  .summary-chip-bar {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    margin: 0 -12px 14px;
    padding: 10px 12px;
  }

  .submit-footer {
    flex-direction: column;
    gap: 12px;
    margin: 20px -12px 0;
    padding: 14px 12px;
  }

  .footer-stats {
    flex-wrap: wrap;
    gap: 10px;
  }

  .card-content {
    padding: 12px 14px;
  }

  .card-name {
    font-size: 0.86rem;
  }

  .card-meta {
    font-size: 0.72rem;
  }
}
</style>
