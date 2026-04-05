<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'IGA', href: '/activities/iga', current: true },
    ]"
  >
    <div class="iga-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Income Generating Activities</h1>
          <p class="page-subtitle">Track livelihood participant enrolment, training and grant disbursement.</p>
        </div>
        <button class="btn-primary" @click="showEnroll = true">+ Enroll Participant</button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <select v-model="statusFilter" class="field-input" @change="fetchParticipants">
          <option value="">All Statuses</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </select>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <div v-if="loading" class="loading-state">Loading…</div>

      <div v-else-if="participants.length === 0" class="empty-state">
        No IGA participants yet. Click "+ Enroll Participant" to start.
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Training Type</th>
              <th>Livelihood Type</th>
              <th class="num">Grant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in participants" :key="p.id">
              <td>{{ p.beneficiary_name }}</td>
              <td><span :class="['status-badge', `status-${p.status}`]">{{ statusLabel(p.status) }}</span></td>
              <td>{{ p.training_type }}</td>
              <td>{{ p.livelihood_type }}</td>
              <td class="num">${{ p.grant_amount }}</td>
              <td>
                <button
                  v-if="nextStatus(p.status)"
                  class="link-btn"
                  :disabled="submitting"
                  @click="handleAdvance(p.id, p.status)"
                >
                  &rarr; {{ statusLabel(nextStatus(p.status)!) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Enroll modal -->
      <div v-if="showEnroll" class="modal-overlay" @click.self="showEnroll = false">
        <div class="modal-box modal-wide">
          <div class="modal-header">
            <h3 class="modal-title">Enroll IGA Participant</h3>
            <button class="modal-close" @click="showEnroll = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label class="field-label">Beneficiary ID</label>
              <input v-model="form.beneficiary_id" type="text" class="field-input" placeholder="Beneficiary ID" />
            </div>
            <div class="form-row">
              <div class="field">
                <label class="field-label">Training Type</label>
                <select v-model="form.training_type" class="field-input">
                  <option value="" disabled>Select</option>
                  <option v-for="t in trainingTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Livelihood Type</label>
                <select v-model="form.livelihood_type" class="field-input">
                  <option value="" disabled>Select</option>
                  <option v-for="l in livelihoodTypes" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Grant Amount ($)</label>
              <input v-model.number="form.grant_amount" type="number" class="field-input" min="0" />
            </div>
            <div class="field">
              <label class="field-label">Notes</label>
              <textarea v-model="form.notes" class="field-input field-textarea" rows="3" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showEnroll = false">Cancel</button>
            <button class="btn-primary" :disabled="!form.beneficiary_id || submitting" @click="handleEnroll">Enroll</button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useIGA,
  IGA_STATUSES,
  IGA_TRAINING_TYPES,
  IGA_LIVELIHOOD_TYPES,
} from '../../composables/useIGA'
import type { IGAStatus } from '../../composables/useIGA'
import { useAuthStore } from '../../stores/auth'

definePageMeta({ layout: false, middleware: ['auth'] })

const authStore = useAuthStore()
const statuses = IGA_STATUSES
const trainingTypes = IGA_TRAINING_TYPES
const livelihoodTypes = IGA_LIVELIHOOD_TYPES

const {
  participants, loading, submitting, error,
  statusFilter, form,
  fetchParticipants, enrollParticipant, updateStatus, resetForm,
} = useIGA()

const showEnroll = ref(false)

function statusLabel(s: string) {
  const map: Record<string, string> = { enrolled: 'Enrolled', training: 'Training', grant_received: 'Grant Received', graduated: 'Graduated' }
  return map[s] ?? s
}

function nextStatus(current: IGAStatus): IGAStatus | null {
  const idx = statuses.indexOf(current)
  return idx >= 0 && idx < statuses.length - 1 ? statuses[idx + 1] : null
}

async function handleEnroll() {
  const activityId = authStore.frameworkActivities?.find(
    (a: any) => a.code === 'iga' || a.template_code === 'iga',
  )?.id || ''

  await enrollParticipant(activityId)
  showEnroll.value = false
}

async function handleAdvance(participantId: string, currentStatus: IGAStatus) {
  const next = nextStatus(currentStatus)
  if (!next) return
  await updateStatus(participantId, next, `Advanced to ${statusLabel(next)}`)
}

onMounted(fetchParticipants)
</script>

<style scoped>
.iga-page { max-width: 1000px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.filter-bar { display: flex; gap: 12px; margin-bottom: 18px; }

.field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.field-textarea { resize: vertical; min-height: 60px; }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center; background-repeat: no-repeat; background-size: 16px; padding-right: 32px;
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 48px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted); font-size: 0.85rem; }

/* Table */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
.data-table td { padding: 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
.data-table .num { text-align: right; font-variant-numeric: tabular-nums; }

.link-btn { background: none; border: none; color: var(--primary); font-size: 0.82rem; cursor: pointer; text-decoration: underline; }
.link-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Status badges */
.status-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
.status-enrolled { background: rgba(59,130,246,0.15); color: #60a5fa; }
.status-training { background: rgba(245,158,11,0.15); color: #fbbf24; }
.status-grant_received { background: var(--success-bg); color: var(--success); }
.status-graduated { background: rgba(139,92,246,0.15); color: #a78bfa; }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-secondary { padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.82rem; cursor: pointer; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); width: 400px; max-width: 95vw; }
.modal-wide { width: 500px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.modal-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border-subtle); }

@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
