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
              <td class="sf-cell-locations">{{ s.assigned_locations?.length || 0 }} assigned</td>
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

      <!-- ── Create modal (Multi-step Liquid Glass) ──────────────── -->
      <Transition name="sf-overlay">
        <div v-if="showCreate" class="sf-overlay" @click.self="handleCreateClose">
          <Transition name="sf-modal" appear>
            <div class="sf-modal" @click.stop>
              <div class="sf-modal__header">
                <div>
                  <h3 class="sf-modal__title">Register Staff</h3>
                  <p class="sf-modal__subtitle">Step {{ step + 1 }} of {{ stepLabels.length }}</p>
                </div>
                <button class="sf-modal__close" @click="handleCreateClose" aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <!-- Progress bar -->
              <div class="sf-progress">
                <div class="sf-progress__track">
                  <div class="sf-progress__fill" :style="{ width: `${((step + 1) / stepLabels.length) * 100}%` }" />
                </div>
                <div class="sf-progress__labels">
                  <span
                    v-for="(label, i) in stepLabels"
                    :key="i"
                    class="sf-progress__label"
                    :class="{
                      'sf-progress__label--active': i === step,
                      'sf-progress__label--done': i < step,
                    }"
                  >{{ label }}</span>
                </div>
              </div>

              <div class="sf-modal__body">
                <!-- Step transitions -->
                <TransitionGroup
                  :name="slideDirection === 'forward' ? 'sf-slide-forward' : 'sf-slide-back'"
                  tag="div"
                  class="sf-step-container"
                >
                  <!-- Step 0: Identity -->
                  <div v-if="step === 0" key="identity" class="sf-step">
                    <div class="sf-field" :class="{ 'sf-field--error sf-shake': fieldErrors.full_name }">
                      <label class="sf-field__label">Full Name</label>
                      <input
                        v-model="form.full_name"
                        type="text"
                        class="sf-field__input"
                        placeholder="e.g. Amara Diallo"
                        @input="clearFieldError('full_name')"
                      />
                      <Transition name="sf-fade">
                        <span v-if="fieldErrors.full_name" class="sf-field__error">{{ fieldErrors.full_name }}</span>
                      </Transition>
                    </div>
                    <div class="sf-field" :class="{ 'sf-field--error sf-shake': fieldErrors.email }">
                      <label class="sf-field__label">Email Address</label>
                      <input
                        v-model="form.email"
                        type="email"
                        class="sf-field__input"
                        placeholder="amara@organisation.org"
                        @input="clearFieldError('email')"
                      />
                      <Transition name="sf-fade">
                        <span v-if="fieldErrors.email" class="sf-field__error">{{ fieldErrors.email }}</span>
                      </Transition>
                    </div>
                  </div>

                  <!-- Step 1: Role -->
                  <div v-if="step === 1" key="role" class="sf-step">
                    <div class="sf-field" :class="{ 'sf-field--error sf-shake': fieldErrors.role }">
                      <label class="sf-field__label">Role</label>
                      <div class="sf-role-grid">
                        <button
                          v-for="r in roleOptions"
                          :key="r.value"
                          type="button"
                          class="sf-role-card"
                          :class="{ 'sf-role-card--active': form.role === r.value }"
                          @click="form.role = r.value; clearFieldError('role')"
                        >
                          <div class="sf-role-card__icon" v-html="r.icon" />
                          <span class="sf-role-card__label">{{ r.label }}</span>
                          <span class="sf-role-card__desc">{{ r.desc }}</span>
                        </button>
                      </div>
                      <Transition name="sf-fade">
                        <span v-if="fieldErrors.role" class="sf-field__error">{{ fieldErrors.role }}</span>
                      </Transition>
                    </div>
                  </div>

                  <!-- Step 2: Credentials -->
                  <div v-if="step === 2" key="credentials" class="sf-step">
                    <div class="sf-field" :class="{ 'sf-field--error sf-shake': fieldErrors.password }">
                      <label class="sf-field__label">Temporary Password</label>
                      <div class="sf-field__input-wrap">
                        <input
                          v-model="form.password"
                          :type="showPassword ? 'text' : 'password'"
                          class="sf-field__input"
                          placeholder="Min 8 characters"
                          @input="clearFieldError('password')"
                        />
                        <button
                          type="button"
                          class="sf-field__toggle"
                          @click="showPassword = !showPassword"
                          :aria-label="showPassword ? 'Hide password' : 'Show password'"
                        >
                          <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        </button>
                      </div>
                      <Transition name="sf-fade">
                        <span v-if="fieldErrors.password" class="sf-field__error">{{ fieldErrors.password }}</span>
                      </Transition>
                    </div>
                    <div class="sf-password-hints">
                      <span class="sf-hint" :class="{ 'sf-hint--pass': form.password.length >= 8 }">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        8+ characters
                      </span>
                    </div>
                  </div>

                  <!-- Step 3: Location Assignment -->
                  <div v-if="step === 3" key="locations" class="sf-step">
                    <StaffAssignmentForm
                      :service-points="servicePoints"
                      v-model="form.locations"
                    />
                  </div>
                </TransitionGroup>
              </div>

              <div class="sf-modal__footer">
                <button
                  v-if="step > 0"
                  class="sf-btn-secondary"
                  @click="prevStep"
                >Back</button>
                <div class="sf-modal__footer-spacer" />
                <button
                  v-if="step < stepLabels.length - 1"
                  class="sf-btn-next"
                  @click="nextStep"
                >Continue</button>
                <button
                  v-else
                  class="sf-btn-save"
                  :disabled="creating"
                  @click="handleCreate"
                >
                  <span v-if="creating" class="spinner spinner--sm" />
                  {{ creating ? 'Creating...' : 'Create Staff' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

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
                <StaffAssignmentForm
                  :service-points="servicePoints"
                  v-model="editLocations"
                />
              </div>
              <div class="sf-modal__footer">
                <button class="sf-btn-secondary" @click="showEdit = false">Cancel</button>
                <div class="sf-modal__footer-spacer" />
                <button class="sf-btn-save" :disabled="creating" @click="handleEditSave">
                  <span v-if="creating" class="spinner spinner--sm" />
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
import { ref, reactive, onMounted } from 'vue'
import { staffApi } from '../services/staffApi'
import type { StaffMember } from '../services/staffApi'
import { useLocationStore } from '../stores/location'
import StaffAssignmentForm from '../components/staff/StaffAssignmentForm.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const servicePoints = locationStore.allServicePoints

const staffList = ref<StaffMember[]>([])
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const showCreate = ref(false)
const showEdit = ref(false)
const showPassword = ref(false)
const editTarget = ref<StaffMember | null>(null)
const editLocations = ref<string[]>([])
const toastMsg = ref('')

// Multi-step
const step = ref(0)
const slideDirection = ref<'forward' | 'back'>('forward')
const stepLabels = ['Identity', 'Role', 'Credentials', 'Locations']

const fieldErrors = reactive<Record<string, string>>({
  full_name: '',
  email: '',
  role: '',
  password: '',
})

const roleOptions = [
  {
    value: 'facilitator',
    label: 'Facilitator',
    desc: 'Leads sessions and activities',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  },
  {
    value: 'case_worker',
    label: 'Case Worker',
    desc: 'Manages individual cases',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  },
]

const form = reactive({
  full_name: '',
  email: '',
  role: '',
  password: '',
  locations: [] as string[],
})

function clearFieldError(field: string) {
  fieldErrors[field] = ''
  error.value = null
}

function validateStep(): boolean {
  let valid = true
  if (step.value === 0) {
    if (!form.full_name.trim()) {
      fieldErrors.full_name = 'Name is required'
      valid = false
    }
    if (!form.email.trim()) {
      fieldErrors.email = 'Email is required'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      fieldErrors.email = 'Enter a valid email address'
      valid = false
    }
  } else if (step.value === 1) {
    if (!form.role) {
      fieldErrors.role = 'Select a role'
      valid = false
    }
  } else if (step.value === 2) {
    if (form.password.length < 8) {
      fieldErrors.password = 'Password must be at least 8 characters'
      valid = false
    }
  }
  return valid
}

function nextStep() {
  if (!validateStep()) return
  slideDirection.value = 'forward'
  step.value++
}

function prevStep() {
  slideDirection.value = 'back'
  step.value--
}

function handleCreateClose() {
  showCreate.value = false
  step.value = 0
  Object.keys(fieldErrors).forEach(k => fieldErrors[k] = '')
}

function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

async function fetchStaff() {
  loading.value = true
  error.value = null
  try {
    const res = await staffApi.list() as { assignments?: StaffMember[]; staff?: StaffMember[] }
    staffList.value = res.staff ?? res.assignments ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load staff'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!validateStep()) return
  creating.value = true
  error.value = null
  try {
    const staff = await staffApi.create({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: form.role,
    }) as StaffMember

    for (const locId of form.locations) {
      await staffApi.assign({
        user_id: staff.id,
        cfs_location_id: locId,
        start_date: new Date().toISOString().slice(0, 10),
      })
    }

    handleCreateClose()
    form.full_name = ''; form.email = ''; form.role = ''; form.password = ''; form.locations = []
    showToast('Staff member created')
    await fetchStaff()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to create staff'
  } finally {
    creating.value = false
  }
}

function openEdit(s: StaffMember) {
  editTarget.value = s
  editLocations.value = [...(s.assigned_locations ?? [])]
  showEdit.value = true
}

async function handleEditSave() {
  if (!editTarget.value) return
  creating.value = true
  error.value = null
  try {
    await staffApi.unassign({ user_id: editTarget.value.id })
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
  gap: 6px;
}

.sf-field__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #86868B;
}

.sf-field__input {
  padding: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.84rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.sf-field__input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.sf-field--error .sf-field__input {
  border-color: var(--error);
}

.sf-field--error .sf-field__input:focus {
  box-shadow: 0 0 0 3px var(--error-bg);
}

.sf-field__error {
  font-size: 0.72rem;
  color: var(--error);
  padding-left: 2px;
}

.sf-field__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.sf-field__input-wrap .sf-field__input {
  padding-right: 40px;
}

.sf-field__toggle {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: none;
  border: none;
  color: #86868B;
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

.sf-btn-secondary {
  padding: 9px 18px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.sf-btn-secondary:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.sf-btn-next {
  padding: 9px 20px;
  background: #1D1D1F;
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

:root:not([data-theme="light"]) .sf-btn-next {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}

.sf-btn-next:hover {
  opacity: 0.85;
}

.sf-btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  background: var(--primary);
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.sf-btn-save:hover {
  opacity: 0.88;
}

.sf-btn-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.spinner--sm {
  width: 14px;
  height: 14px;
  border-width: 1.5px;
}

/* ── Slide & Fade transitions (steps) ────────────────────────────────────── */
.sf-slide-forward-enter-active,
.sf-slide-forward-leave-active,
.sf-slide-back-enter-active,
.sf-slide-back-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sf-slide-forward-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.sf-slide-forward-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.sf-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.sf-slide-back-leave-to {
  opacity: 0;
  transform: translateX(24px);
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
@keyframes sf-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}

.sf-shake {
  animation: sf-shake 0.4s ease;
}

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

.sf-toast-enter-active { transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
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
