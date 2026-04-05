<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'Case Management', href: '/activities/case-management', current: true },
    ]"
  >
    <div class="cm-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Case Management</h1>
          <p class="page-subtitle">Track child protection cases through referral and follow-up.</p>
        </div>
        <button class="btn-primary" @click="showCreate = true">+ New Case</button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <input v-model="searchQuery" type="text" class="field-input" placeholder="Search by name or case #…" @input="fetchCases" />
        <select v-model="statusFilter" class="field-input" @change="fetchCases">
          <option value="">All Statuses</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </select>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <div v-if="loading && !selectedCase" class="loading-state">Loading…</div>

      <!-- Case detail overlay -->
      <div v-if="selectedCase" class="detail-panel">
        <div class="detail-header">
          <div>
            <h3 class="detail-title">{{ selectedCase.case_number }}</h3>
            <p class="detail-name">{{ selectedCase.beneficiary_name }}</p>
          </div>
          <button class="btn-outline btn-sm" @click="closeDetail">Back to list</button>
        </div>

        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-badge', `status-${selectedCase.status}`]">{{ statusLabel(selectedCase.status) }}</span></div>
          <div class="detail-item"><span class="detail-label">Vulnerability</span><span>{{ selectedCase.vulnerability_category }}</span></div>
          <div class="detail-item"><span class="detail-label">Handling</span><span>{{ selectedCase.case_handling }}</span></div>
          <div class="detail-item"><span class="detail-label">Support</span><span>{{ selectedCase.support_type || '—' }}</span></div>
          <div class="detail-item"><span class="detail-label">Referred To</span><span>{{ selectedCase.referred_agency || '—' }}</span></div>
          <div class="detail-item"><span class="detail-label">Last Monitored</span><span>{{ selectedCase.last_monitored || '—' }}</span></div>
        </div>

        <!-- Status update -->
        <div class="status-update">
          <h4 class="section-title">Update Status</h4>
          <div class="status-row">
            <select v-model="newStatus" class="field-input">
              <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <input v-model="statusNote" type="text" class="field-input" placeholder="Note…" />
            <button class="btn-primary btn-sm" :disabled="submitting" @click="handleStatusUpdate">Update</button>
          </div>
        </div>

        <!-- Timeline -->
        <div v-if="timeline.length" class="timeline">
          <h4 class="section-title">Timeline</h4>
          <div v-for="(entry, i) in timeline" :key="i" class="timeline-entry">
            <span :class="['status-badge', `status-${entry.status}`]">{{ statusLabel(entry.status) }}</span>
            <span class="timeline-date">{{ entry.date }}</span>
            <span class="timeline-note">{{ entry.note }}</span>
          </div>
        </div>
      </div>

      <!-- Case list -->
      <div v-else-if="cases.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Case #</th>
              <th>Child Name</th>
              <th>Status</th>
              <th>Vulnerability</th>
              <th>Last Monitored</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cases" :key="c.id">
              <td class="mono">{{ c.case_number }}</td>
              <td>{{ c.beneficiary_name }}</td>
              <td><span :class="['status-badge', `status-${c.status}`]">{{ statusLabel(c.status) }}</span></td>
              <td>{{ c.vulnerability_category }}</td>
              <td>{{ c.last_monitored || '—' }}</td>
              <td><button class="link-btn" @click="selectCase(c.id)">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="!loading" class="empty-state">
        No cases found. Click "+ New Case" to start.
      </div>

      <!-- Create modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-box modal-wide">
          <div class="modal-header">
            <h3 class="modal-title">New Case</h3>
            <button class="modal-close" @click="showCreate = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="field">
                <label class="field-label">Case Number</label>
                <input v-model="form.case_number" type="text" class="field-input" placeholder="Auto or manual" />
              </div>
              <div class="field">
                <label class="field-label">Beneficiary ID</label>
                <input v-model="form.beneficiary_id" type="text" class="field-input" placeholder="Beneficiary ID" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label class="field-label">Vulnerability Category</label>
                <select v-model="form.vulnerability_category" class="field-input">
                  <option value="" disabled>Select</option>
                  <option v-for="v in vulnerabilities" :key="v" :value="v">{{ v }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Case Handling</label>
                <select v-model="form.case_handling" class="field-input">
                  <option value="" disabled>Select</option>
                  <option v-for="h in handlingOptions" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label class="field-label">Support Type</label>
                <input v-model="form.support_type" type="text" class="field-input" placeholder="e.g. Counselling" />
              </div>
              <div class="field">
                <label class="field-label">Referred Agency</label>
                <input v-model="form.referred_agency" type="text" class="field-input" placeholder="If referred" />
              </div>
            </div>
            <div class="field">
              <label class="field-label">Notes</label>
              <textarea v-model="form.notes" class="field-input field-textarea" rows="3" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreate = false">Cancel</button>
            <button class="btn-primary" :disabled="!form.beneficiary_id || !form.vulnerability_category || submitting" @click="handleCreate">Create</button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  useCaseManagement,
  CASE_STATUSES,
  VULNERABILITY_CATEGORIES,
  CASE_HANDLING,
} from '../../composables/useCaseManagement'
import type { CaseStatus } from '../../composables/useCaseManagement'
import { useAuthStore } from '../../stores/auth'

definePageMeta({ layout: false, middleware: ['auth'] })

const authStore = useAuthStore()
const statuses = CASE_STATUSES
const vulnerabilities = VULNERABILITY_CATEGORIES
const handlingOptions = CASE_HANDLING

const {
  cases, selectedCase, timeline, loading, submitting, error,
  statusFilter, searchQuery, form,
  fetchCases, createCase, selectCase, updateStatus, closeDetail, resetForm,
} = useCaseManagement()

const showCreate = ref(false)
const newStatus = ref<CaseStatus>('active')
const statusNote = ref('')

function statusLabel(s: string) {
  const map: Record<string, string> = { open: 'Open', active: 'Active', follow_up: 'Follow-up', closed: 'Closed' }
  return map[s] ?? s
}

async function handleCreate() {
  const activityId = authStore.frameworkActivities?.find(
    (a: any) => a.code === 'case_management' || a.template_code === 'case_management',
  )?.id || ''

  await createCase(activityId)
  showCreate.value = false
}

async function handleStatusUpdate() {
  if (!selectedCase.value) return
  await updateStatus(selectedCase.value.id, newStatus.value, statusNote.value)
  statusNote.value = ''
}

onMounted(fetchCases)
</script>

<style scoped>
.cm-page { max-width: 1000px; }

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
.mono { font-family: 'SF Mono', Consolas, monospace; font-size: 0.78rem; }

.link-btn { background: none; border: none; color: var(--primary); font-size: 0.82rem; cursor: pointer; text-decoration: underline; }

/* Status badges */
.status-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
.status-open { background: rgba(59,130,246,0.15); color: #60a5fa; }
.status-active { background: var(--success-bg); color: var(--success); }
.status-follow_up { background: rgba(245,158,11,0.15); color: #fbbf24; }
.status-closed { background: rgba(107,114,128,0.2); color: var(--text-muted); }

/* Detail panel */
.detail-panel { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.detail-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; font-family: 'SF Mono', Consolas, monospace; }
.detail-name { font-size: 0.88rem; color: var(--text-muted); margin: 0; }

.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }

.section-title { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 10px; }

.status-update { margin-bottom: 20px; }
.status-row { display: flex; gap: 10px; }

.timeline { }
.timeline-entry { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
.timeline-date { font-size: 0.78rem; color: var(--text-muted); min-width: 80px; }
.timeline-note { font-size: 0.82rem; color: var(--text-primary); }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-secondary { padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.82rem; cursor: pointer; }
.btn-outline { padding: 8px 14px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-muted); cursor: pointer; }
.btn-outline:hover { border-color: var(--text-primary); color: var(--text-primary); }
.btn-sm { font-size: 0.72rem; padding: 6px 12px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); width: 400px; max-width: 95vw; }
.modal-wide { width: 560px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.modal-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border-subtle); }

@media (max-width: 640px) {
  .filter-bar { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr 1fr; }
  .status-row { flex-direction: column; }
}
</style>
