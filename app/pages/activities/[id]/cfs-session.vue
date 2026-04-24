<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Projects', href: '/activities' },
      { title: 'Project', href: `/activities/${activityId}` },
      { title: 'CFS Session', href: `/activities/${activityId}/cfs-session`, current: true },
    ]"
  >
    <div class="session-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">CFS Session</h1>
          <p class="page-subtitle">Create a new Child-Friendly Space session and record attendance.</p>
        </div>
      </div>

      <!-- Session Info -->
      <div class="session-info-card">
        <div class="info-row">
          <div class="field">
            <label class="field-label">Session Date</label>
            <input v-model="date" type="date" class="field-input" :disabled="sessionSaved" />
          </div>
          <div class="day-badge">
            <span class="day-name">{{ dayName }}</span>
            <span class="day-full-date">{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Session Saved Banner -->
      <div v-if="sessionSaved" class="success-banner">
        <svg class="banner-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" fill="#34C759" />
          <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Session saved successfully!</span>
        <button class="btn-text" @click="resetSession">Start new session</button>
      </div>

      <!-- Attendance Saved Banner -->
      <div v-if="attendanceSaved && !sessionSaved" class="success-banner success-banner--attendance">
        <svg class="banner-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" fill="#34C759" />
          <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>Attendance recorded — {{ presentCount }} present, {{ absentCount }} absent.</span>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Take Attendance Section -->
      <div v-if="!sessionSaved" class="attendance-section">
        <div class="section-header" @click="attendanceCollapsed = !attendanceCollapsed">
          <div class="section-header-left">
            <h2 class="section-title">Take Attendance</h2>
            <p v-if="!attendanceCollapsed" class="section-desc">Select beneficiaries who are present in today's session.</p>
            <p v-else-if="attendanceSaved" class="section-desc section-desc--saved">{{ presentCount }} present &middot; {{ absentCount }} absent</p>
          </div>
          <button class="collapse-toggle" :class="{ 'collapse-toggle--open': !attendanceCollapsed }" aria-label="Toggle attendance">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading && !attendanceCollapsed" class="loading-state">
          <div class="loading-spinner" />
          <span>Loading beneficiaries...</span>
        </div>

        <!-- Card List -->
        <div v-else-if="rows.length > 0 && !attendanceCollapsed" class="attendance-list">
          <!-- Summary Chip Bar -->
          <div class="summary-chip-bar">
            <div class="summary-chip">
              <span class="chip-count">{{ presentCount }}</span>
              <span class="chip-label">Present</span>
              <span class="chip-divider">&middot;</span>
              <span class="chip-count chip-count--remaining">{{ remainingCount }}</span>
              <span class="chip-label">Remaining</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn-tool" :disabled="attendanceSaved" @click="selectAll">Mark All</button>
              <button class="btn-tool btn-tool--muted" :disabled="attendanceSaved" @click="deselectAll">Clear</button>
            </div>
          </div>

          <!-- Beneficiary Cards -->
          <div class="card-stack">
            <div
              v-for="row in rows"
              :key="row.id"
              class="beneficiary-card"
              :class="{ 'beneficiary-card--active': row.selected, 'beneficiary-card--disabled': attendanceSaved }"
              @click="!attendanceSaved && toggleBeneficiary(row.id)"
            >
              <div class="card-content">
                <div class="card-primary">
                  <span class="card-name">{{ row.full_name }}</span>
                  <div class="card-meta">
                    <span class="meta-tag meta-tag--id">{{ row.id.slice(0, 8).toUpperCase() }}</span>
                    <span v-if="row.age" class="meta-tag">Age {{ row.age }}</span>
                    <span v-if="row.sex" class="meta-tag meta-tag--gender">{{ row.sex }}</span>
                    <span v-if="row.disability_status && row.disability_status !== 'none'" class="meta-tag meta-tag--disability">{{ row.disability_status }}</span>
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

          <!-- Action Footer -->
          <div class="submit-footer">
            <div class="footer-stats">
              <span>Girls: <strong>{{ genderBreakdown.girls }}</strong></span>
              <span>Boys: <strong>{{ genderBreakdown.boys }}</strong></span>
              <span v-if="disabilityCount > 0">Disability: <strong>{{ disabilityCount }}</strong></span>
            </div>
            <div class="footer-actions">
              <button
                v-if="!attendanceSaved"
                class="btn-save-attendance"
                :disabled="submittingAttendance || presentCount === 0"
                @click="saveAttendance"
              >
                <span v-if="submittingAttendance" class="btn-spinner" />
                {{ submittingAttendance ? 'Saving...' : 'Save Attendance' }}
              </button>
              <button
                v-if="attendanceSaved"
                class="btn-save-session"
                :disabled="savingSession"
                @click="saveSession"
              >
                <span v-if="savingSession" class="btn-spinner" />
                {{ savingSession ? 'Saving...' : 'Save Session' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!loading && !attendanceCollapsed" class="empty-state">
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
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { activityApi } from '../../../services/activityApi'
import type { AttendanceBeneficiary } from '../../../services/activityApi'
import { getBeneficiariesOffline, saveSessionOffline, saveAttendanceRecordsOffline } from '../../../services/offlineDb'
import { useAuthStore } from '../../../stores/auth'
import { v4 as uuidv4 } from 'uuid'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const activityId = route.params.id as string

interface AttendanceRow extends AttendanceBeneficiary {
  selected: boolean
}

const authStore = useAuthStore()
const date = ref(new Date().toISOString().slice(0, 10))
const rows = ref<AttendanceRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Attendance state
const submittingAttendance = ref(false)
const attendanceSaved = ref(false)
const attendanceCollapsed = ref(false)
const sessionId = ref<string | null>(null)

// Session state
const savingSession = ref(false)
const sessionSaved = ref(false)

// Computed
const dayName = computed(() => {
  const d = new Date(date.value + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
})

const formattedDate = computed(() => {
  const d = new Date(date.value + 'T00:00:00')
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
})

const presentCount = computed(() => rows.value.filter(r => r.selected).length)
const absentCount = computed(() => rows.value.filter(r => !r.selected).length)
const totalCount = computed(() => rows.value.length)
const remainingCount = computed(() => totalCount.value - presentCount.value)

const genderBreakdown = computed(() => {
  const sel = rows.value.filter(r => r.selected)
  return {
    girls: sel.filter(r => r.sex === 'female').length,
    boys: sel.filter(r => r.sex === 'male').length,
  }
})

const disabilityCount = computed(() =>
  rows.value.filter(r => r.selected && r.disability_status !== 'none').length,
)

// Methods
async function fetchBeneficiaries() {
  loading.value = true
  error.value = null
  try {
    if (!navigator.onLine) {
      const offline = await getBeneficiariesOffline()
      rows.value = offline.map(b => ({
        id: b.serverId ?? b.id,
        full_name: [b.personalName, b.fatherName, b.grandfatherName, b.familyName]
          .filter(Boolean).join(' '),
        age: b.ageAtRegistration,
        sex: b.sex,
        disability_status: b.disabilityStatus,
        already_present: false,
        selected: false,
      }))
      return
    }
    const list = await activityApi.getAttendanceBeneficiaries()
    rows.value = (Array.isArray(list) ? list : []).map(b => ({
      ...b,
      selected: b.already_present,
    }))
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load beneficiaries'
  } finally {
    loading.value = false
  }
}

function toggleBeneficiary(id: string) {
  const row = rows.value.find(r => r.id === id)
  if (row) row.selected = !row.selected
}

function selectAll() { rows.value.forEach(r => { r.selected = true }) }
function deselectAll() { rows.value.forEach(r => { r.selected = false }) }

async function saveAttendance() {
  submittingAttendance.value = true
  error.value = null

  const cfsActivity = authStore.frameworkActivities.find(
    (fa: any) => fa.template?.code === 'CFS_ATTENDANCE',
  )
  const frameworkActivityId = cfsActivity?.id

  try {
    if (!navigator.onLine) {
      const offlineId = uuidv4()
      await saveSessionOffline({
        id: offlineId,
        sessionDate: date.value,
        sessionType: 'general_group_activity',
        frameworkActivityId,
        syncStatus: 'pending',
        clientTimestamp: new Date().toISOString(),
      })
      await saveAttendanceRecordsOffline(rows.value.map(r => ({
        id: uuidv4(),
        sessionId: offlineId,
        beneficiaryId: r.id,
        status: r.selected ? 'present' as const : 'absent' as const,
        syncStatus: 'pending' as const,
        clientTimestamp: new Date().toISOString(),
      })))
      sessionId.value = offlineId
      attendanceSaved.value = true
      return
    }

    const session = await activityApi.createSession({
      session_date: date.value,
      session_type: 'general_group_activity',
      framework_activity_id: frameworkActivityId,
    }) as { session: { id: string } }

    sessionId.value = session.session.id

    await activityApi.recordAttendance({
      session_id: session.session.id,
      records: rows.value.map(r => ({
        beneficiary_id: r.id,
        status: r.selected ? 'present' as const : 'absent' as const,
      })),
    })

    attendanceSaved.value = true
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to save attendance'
  } finally {
    submittingAttendance.value = false
  }
}

async function saveSession() {
  savingSession.value = true
  error.value = null
  try {
    sessionSaved.value = true
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to save session'
  } finally {
    savingSession.value = false
  }
}

function resetSession() {
  date.value = new Date().toISOString().slice(0, 10)
  rows.value = []
  attendanceSaved.value = false
  attendanceCollapsed.value = false
  sessionSaved.value = false
  sessionId.value = null
  error.value = null
  fetchBeneficiaries()
}

watch(date, () => {
  if (!attendanceSaved.value) {
    fetchBeneficiaries()
  }
})

onMounted(() => {
  fetchBeneficiaries()
})
</script>

<style scoped>
/* ── Page Layout ─────────────────────────────────────────────────────────── */
.session-page {
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

/* ── Session Info Card ───────────────────────────────────────────────────── */
.session-info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.day-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.day-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.01em;
}

.day-full-date {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ── Fields ──────────────────────────────────────────────────────────────── */
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

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.success-banner--attendance {
  background: color-mix(in srgb, var(--success) 6%, transparent);
}

.banner-icon {
  flex-shrink: 0;
}

.error-msg {
  font-size: 0.82rem;
  color: var(--error);
  margin: 0 0 12px;
}

/* ── Section Header ──────────────────────────────────────────────────────── */
.attendance-section {
  margin-top: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  cursor: pointer;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  transition: background 0.18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.section-header:hover {
  background: var(--hover-bg, color-mix(in srgb, var(--bg-card) 90%, var(--text-muted)));
}

.section-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.section-desc--saved {
  color: var(--success);
  font-weight: 500;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1), color 0.18s ease;
  flex-shrink: 0;
  transform: rotate(-90deg);
}

.collapse-toggle--open {
  transform: rotate(0deg);
}

.collapse-toggle:hover {
  color: var(--text-primary);
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

.btn-tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.beneficiary-card--disabled {
  pointer-events: none;
  opacity: 0.7;
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
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.012em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
}

.card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--text-muted) 8%, transparent);
  border-radius: 6px;
  white-space: nowrap;
  text-transform: capitalize;
}

.meta-tag--id {
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  text-transform: none;
}

.meta-tag--gender {
  text-transform: capitalize;
}

.meta-tag--disability {
  color: var(--warning);
  font-weight: 600;
  background: color-mix(in srgb, var(--warning) 10%, transparent);
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
  0% { transform: scale(0.5); }
  40% { transform: scale(1.2); }
  65% { transform: scale(0.92); }
  82% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

@keyframes check-fade {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
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
}

.footer-stats {
  display: flex;
  gap: 12px;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.footer-stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.footer-stats strong {
  color: var(--text-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn-save-attendance {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  letter-spacing: -0.005em;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent);
}

.btn-save-attendance:hover {
  filter: brightness(1.08);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent);
  transform: translateY(-0.5px);
}

.btn-save-attendance:active {
  transform: scale(0.97);
}

.btn-save-attendance:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-save-session {
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

.btn-save-session:hover {
  background: #2fb84e;
  box-shadow: 0 4px 14px rgba(52, 199, 89, 0.28);
  transform: translateY(-0.5px);
}

.btn-save-session:active {
  transform: scale(0.97);
  box-shadow: 0 1px 4px rgba(52, 199, 89, 0.2);
}

.btn-save-session:disabled {
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
  to { transform: rotate(360deg); }
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .day-badge {
    align-items: flex-start;
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
}
</style>
