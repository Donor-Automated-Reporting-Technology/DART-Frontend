<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Staff', href: '/staff', current: true }]">
    <div class="staff-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Staff Management</h1>
          <p class="page-subtitle">Manage staff accounts and location assignments.</p>
        </div>
        <button class="btn-primary-action" @click="showCreate = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Staff
        </button>
      </div>

      <!-- Inline error -->
      <Transition name="sf-fade">
        <p v-if="error" class="sf-inline-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ error }}
        </p>
      </Transition>

      <!-- Loading -->
      <div v-if="loading" class="sf-loading">
        <div class="spinner" />
        <span>Loading staff...</span>
      </div>

      <!-- Staff table -->
      <div v-else-if="staffList.length > 0" class="sf-table-card">
        <table class="sf-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Locations</th>
              <th class="sf-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in staffList" :key="s.id">
              <td class="sf-cell-name">
                <div class="sf-avatar">{{ initials(s.full_name) }}</div>
                {{ s.full_name }}
              </td>
              <td class="sf-cell-email">{{ s.email }}</td>
              <td><span class="sf-role-tag">{{ formatRole(s.role) }}</span></td>
              <td class="sf-cell-locations">
                <template v-if="s.assigned_locations?.length">
                  <span v-for="locId in s.assigned_locations" :key="locId" class="sf-location-pill">{{ locationName(locId) }}</span>
                </template>
                <span v-else class="sf-unassigned-tag">Unassigned</span>
              </td>
              <td class="sf-col-actions">
                <button class="sf-btn-edit" @click="openEdit(s)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading" class="sf-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="sf-empty__icon"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        <p class="sf-empty__title">No staff members yet</p>
        <p class="sf-empty__text">Click "Add Staff" to register your first team member.</p>
      </div>

      <!-- ── Add staff (shared with Settings → People) ─────────────── -->
      <InviteStaffDialog v-if="showCreate" @close="showCreate = false" @created="onInvited" />

      <!-- ── Edit modal (Liquid Glass) ───────────────────────────── -->
      <Transition name="sf-overlay">
        <div v-if="showEdit" class="sf-overlay" @click.self="showEdit = false">
          <Transition name="sf-modal" appear>
            <div class="sf-modal" @click.stop>
              <div class="sf-modal__header">
                <div>
                  <h3 class="sf-modal__title">Edit Assignments</h3>
                  <p class="sf-modal__subtitle">{{ editTarget?.full_name }}</p>
                </div>
                <button class="sf-modal__close" @click="showEdit = false" aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="sf-modal__body">
                <div v-if="editLocations.length === 0" class="sf-unassigned-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  This staff member is not assigned to any location.
                </div>
                <StaffAssignmentForm
                  :service-points="servicePoints"
                  v-model="editLocations"
                />
              </div>
              <div class="sf-modal__footer">
                <button type="button" class="ui-btn ui-btn--outline" @click="showEdit = false">Cancel</button>
                <button
                  v-if="editOriginalLocations.length > 0"
                  class="sf-btn-danger"
                  :disabled="creating"
                  @click="handleUnassignAll"
                >
                  Unassign All
                </button>
                <div class="sf-modal__footer-spacer" />
                <button type="button" class="ui-btn ui-btn--primary" :disabled="creating || editLocations.length === 0" @click="handleEditSave">
                  <span v-if="creating" class="ui-spinner" aria-hidden="true" />
                  {{ creating ? 'Saving...' : 'Save Assignments' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Success toast -->
      <Transition name="sf-toast">
        <div v-if="toastMsg" class="sf-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {{ toastMsg }}
        </div>
      </Transition>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { staffApi } from '../services/staffApi'
import type { StaffMember } from '../services/staffApi'
import { useLocationStore } from '../stores/location'
import StaffAssignmentForm from '../components/staff/StaffAssignmentForm.vue'
import InviteStaffDialog from '../components/people/InviteStaffDialog.vue'
import type { InviteResult } from '../services/accessApi'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const servicePoints = locationStore.allServicePoints

const staffList = ref<StaffMember[]>([])
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const showCreate = ref(false)
const showEdit = ref(false)
const editTarget = ref<StaffMember | null>(null)
const editLocations = ref<string[]>([])
const editOriginalLocations = ref<string[]>([])
const toastMsg = ref('')

function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Organisation role names are shown as written; old system keys are tidied.
function formatRole(role: string): string {
  return role.includes('_') ? role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : role
}

async function fetchStaff() {
  loading.value = true
  error.value = null
  try {
    const res = await staffApi.list() as { assignments?: any[]; staff?: any[] }
    const rows = res.assignments ?? res.staff ?? []

    // The API returns one row per assignment — group by user to build a staff list
    const grouped = new Map<string, StaffMember>()
    for (const r of rows) {
      const uid = r.user_id ?? r.id
      if (!grouped.has(uid)) {
        grouped.set(uid, {
          id: uid,
          full_name: r.full_name ?? '',
          email: r.email ?? '',
          role: r.role ?? '',
          assigned_locations: [],
        })
      }
      const locId = r.cfs_location_id
      if (locId) {
        grouped.get(uid)!.assigned_locations.push(locId)
      }
    }
    staffList.value = Array.from(grouped.values())
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load staff'
  } finally {
    loading.value = false
  }
}

function onInvited(res: InviteResult) {
  showToast(res.email_sent ? `Invitation sent to ${res.user.email}` : `${res.user.full_name} added`)
  fetchStaff()
}

function locationName(id: string): string {
  return locationStore.servicePointById(id)?.name ?? id
}

function openEdit(s: StaffMember) {
  editTarget.value = s
  const locs = (s.assigned_locations ?? []).map(
    (loc: any) => typeof loc === 'string' ? loc : loc.id,
  )
  editLocations.value = [...locs]
  editOriginalLocations.value = [...locs]
  showEdit.value = true
}

async function handleEditSave() {
  if (!editTarget.value) return
  creating.value = true
  error.value = null
  try {
    // Only unassign first when the staff member currently has an assignment.
    // Unassigning a user with no active assignment 400s with NO_ASSIGNMENT,
    // which would abort the whole save before any assignment runs.
    if (editOriginalLocations.value.length > 0) {
      await staffApi.unassign({ user_id: editTarget.value.id })
    }
    for (const locId of editLocations.value) {
      await staffApi.assign({
        user_id: editTarget.value.id,
        cfs_location_id: locId,
        start_date: new Date().toISOString().slice(0, 10),
      })
    }
    showEdit.value = false
    showToast('Assignments updated')
    await fetchStaff()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to update assignments'
  } finally {
    creating.value = false
  }
}

async function handleUnassignAll() {
  if (!editTarget.value) return
  creating.value = true
  error.value = null
  try {
    await staffApi.unassign({ user_id: editTarget.value.id })
    editLocations.value = []
    editOriginalLocations.value = []
    showEdit.value = false
    showToast('Staff member unassigned from all locations')
    await fetchStaff()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to unassign staff'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchStaff()
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────────────────────── */
.staff-page {
  max-width: 920px;
  padding: 0 0 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1D1D1F;
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

:root:not([data-theme="light"]) .page-title {
  color: var(--text-primary);
}

.page-subtitle {
  font-size: 0.82rem;
  color: #86868B;
  margin: 0;
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s ease;
}

.btn-primary-action:hover {
  opacity: 0.88;
}

/* ── Inline error ────────────────────────────────────────────────────────── */
.sf-inline-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: var(--error);
  background: var(--error-bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--error-bg);
}

/* ── Loading ─────────────────────────────────────────────────────────────── */
.sf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: #86868B;
  font-size: 0.84rem;
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.sf-table-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.sf-table {
  width: 100%;
  border-collapse: collapse;
}

.sf-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #86868B;
  border-bottom: 1px solid var(--border-subtle);
}

.sf-table td {
  padding: 14px 16px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.sf-table tr:last-child td {
  border-bottom: none;
}

.sf-table tr:hover td {
  background: var(--hover-bg-subtle);
}

.sf-cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: var(--text-primary);
}

.sf-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--hover-bg);
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.sf-cell-email {
  color: #86868B;
}

.sf-role-tag {
  font-size: 0.72rem;
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
  font-weight: 500;
}

.sf-cell-locations {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sf-location-pill {
  display: inline-block;
  font-size: 0.72rem;
  padding: 2px 9px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.sf-unassigned-tag {
  font-size: 0.75rem;
  color: #AEAEB2;
  font-style: italic;
}

.sf-unassigned-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 0.8rem;
  color: #AEAEB2;
  background: var(--hover-bg);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-color);
}

.sf-btn-danger {
  padding: 9px 16px;
  background: transparent;
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  color: var(--error);
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sf-btn-danger:hover {
  background: var(--error);
  color: #FFFFFF;
}

.sf-btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sf-col-actions {
  width: 80px;
  text-align: right;
}

.sf-btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.sf-btn-edit:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.sf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 24px;
  text-align: center;
}

.sf-empty__icon {
  color: #86868B;
  margin-bottom: 4px;
}

.sf-empty__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sf-empty__text {
  font-size: 0.82rem;
  color: #86868B;
  margin: 0;
}

/* ── Modal (Liquid Glass) ────────────────────────────────────────────────── */
.sf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.sf-modal {
  background: #FFFFFF;
  border: 1px solid #E5E5EA;
  border-radius: 16px;
  width: 480px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

:root:not([data-theme="light"]) .sf-modal {
  background: var(--bg-panel);
  border-color: var(--border-color);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 0, 0, 0.3);
}

.sf-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 0;
}

.sf-modal__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1D1D1F;
  margin: 0;
  letter-spacing: -0.01em;
}

:root:not([data-theme="light"]) .sf-modal__title {
  color: var(--text-primary);
}

.sf-modal__subtitle {
  font-size: 0.75rem;
  color: #86868B;
  margin: 3px 0 0;
}

.sf-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: none;
  border: none;
  color: #86868B;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sf-modal__close:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #1D1D1F;
}

:root:not([data-theme="light"]) .sf-modal__close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

/* ── Progress ────────────────────────────────────────────────────────────── */
.sf-progress {
  padding: 16px 24px 0;
}

.sf-progress__track {
  width: 100%;
  height: 3px;
  background: #E5E5EA;
  border-radius: 2px;
  overflow: hidden;
}

:root:not([data-theme="light"]) .sf-progress__track {
  background: var(--border-color);
}

.sf-progress__fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.sf-progress__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.sf-progress__label {
  font-size: 0.68rem;
  font-weight: 500;
  color: #AEAEB2;
  transition: color 0.2s ease;
}

.sf-progress__label--active {
  color: #1D1D1F;
  font-weight: 600;
}

:root:not([data-theme="light"]) .sf-progress__label--active {
  color: var(--text-primary);
}

.sf-progress__label--done {
  color: #86868B;
}

/* ── Modal body ──────────────────────────────────────────────────────────── */
.sf-modal__body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
  min-height: 180px;
}

.sf-step-container {
  position: relative;
}

.sf-step {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Form fields ─────────────────────────────────────────────────────────── */
.sf-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}













.sf-field__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.sf-field__input-wrap .sf-field__input {
  padding-right: 52px;
}

.sf-field__toggle {
  position: absolute;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s ease;
}

.sf-field__toggle:hover {
  color: var(--text-primary);
}

/* ── Password hints ──────────────────────────────────────────────────────── */
.sf-password-hints {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.sf-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #AEAEB2;
  transition: color 0.2s ease;
}

.sf-hint--pass {
  color: var(--success);
}

/* ── Role cards ──────────────────────────────────────────────────────────── */
.sf-role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sf-role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.2s ease, background 0.15s ease, transform 0.15s ease;
}

.sf-role-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-color);
}

.sf-role-card--active {
  border: 2px solid #000000;
}

:root:not([data-theme="light"]) .sf-role-card--active {
  border-color: #FFFFFF;
}

.sf-role-card:active {
  transform: scale(0.97);
}

.sf-role-card__icon {
  color: #86868B;
  transition: color 0.15s ease;
}

.sf-role-card--active .sf-role-card__icon {
  color: var(--text-primary);
}

.sf-role-card__label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sf-role-card__desc {
  font-size: 0.72rem;
  color: #86868B;
  text-align: center;
  line-height: 1.3;
}

/* ── Modal footer ────────────────────────────────────────────────────────── */
.sf-modal__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
}

.sf-modal__footer-spacer {
  flex: 1;
}

/* ── Slide & Fade transitions (steps) ────────────────────────────────────── */
.sf-slide-forward-enter-active,
.sf-slide-forward-leave-active,
.sf-slide-back-enter-active,
.sf-slide-back-leave-active {
  transition: opacity 0.15s ease;
}

.sf-slide-forward-enter-from {
  opacity: 0;
}

.sf-slide-forward-leave-to {
  opacity: 0;
}

.sf-slide-back-enter-from {
  opacity: 0;
}

.sf-slide-back-leave-to {
  opacity: 0;
}

.sf-slide-forward-leave-active,
.sf-slide-back-leave-active {
  position: absolute;
  width: 100%;
}

/* ── Overlay transition ──────────────────────────────────────────────────── */
.sf-overlay-enter-active { transition: opacity 0.25s ease; }
.sf-overlay-leave-active { transition: opacity 0.2s ease; }
.sf-overlay-enter-from,
.sf-overlay-leave-to { opacity: 0; }

/* ── Modal transition ────────────────────────────────────────────────────── */
.sf-modal-enter-active { transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.sf-modal-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.sf-modal-enter-from { opacity: 0; transform: scale(0.96) translateY(8px); }
.sf-modal-leave-to { opacity: 0; transform: scale(0.97) translateY(4px); }

/* ── Fade transition ─────────────────────────────────────────────────────── */
.sf-fade-enter-active { transition: opacity 0.2s ease; }
.sf-fade-leave-active { transition: opacity 0.15s ease; }
.sf-fade-enter-from,
.sf-fade-leave-to { opacity: 0; }

/* ── Shake animation ─────────────────────────────────────────────────────── */
/* ── Success toast ───────────────────────────────────────────────────────── */
.sf-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #1D1D1F;
  color: #FFFFFF;
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 500;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  z-index: 1100;
}

.sf-toast svg {
  color: var(--success);
  flex-shrink: 0;
}

:root:not([data-theme="light"]) .sf-toast {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  color: var(--text-primary);
}

.sf-toast-enter-active { transition: opacity 0.15s ease; }
.sf-toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.sf-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(12px); }
.sf-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(4px); }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 560px) {
  .page-header {
    flex-direction: column;
    gap: 14px;
  }

  .sf-modal {
    width: 100%;
    max-width: 100vw;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }

  .sf-overlay {
    align-items: flex-end;
  }

  .sf-role-grid {
    grid-template-columns: 1fr;
  }

  .sf-table-card {
    overflow-x: auto;
  }
}
</style>
