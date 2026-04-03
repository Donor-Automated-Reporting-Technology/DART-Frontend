<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="staff-mgmt-page">

      <!-- ── Page Header ──────────────────────────────────────────────── -->
      <div class="page-header">
        <div class="header-text">
          <h1 class="page-title">Staff Management</h1>
          <p class="page-subtitle">Create staff accounts and manage CFS location assignments</p>
        </div>
        <button class="btn btn-primary" @click="showAddForm = !showAddForm">
          <AppIcon :name="showAddForm ? 'x' : 'user-plus'" :size="16" />
          {{ showAddForm ? 'Cancel' : 'Add Staff' }}
        </button>
      </div>

      <!-- ── Add Staff Form ───────────────────────────────────────────── -->
      <div v-if="showAddForm" class="add-staff-card">
        <h2 class="card-title">Create New Staff Member</h2>
        <p class="card-subtitle">They will be created with a temporary password that should be changed on first login.</p>

        <div v-if="createError" class="alert alert-error">{{ createError }}</div>
        <div v-if="createSuccess" class="alert alert-success">{{ createSuccess }}</div>

        <form @submit.prevent="handleCreateStaff" class="create-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="staff-name">Full Name <span class="req">*</span></label>
              <input
                id="staff-name"
                v-model="newStaff.full_name"
                type="text"
                class="form-input"
                :class="{ 'is-error': formErrors.full_name }"
                placeholder="e.g. Peter Deng"
              />
              <span v-if="formErrors.full_name" class="err-msg">{{ formErrors.full_name }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="staff-email">Email Address <span class="req">*</span></label>
              <input
                id="staff-email"
                v-model="newStaff.email"
                type="email"
                class="form-input"
                :class="{ 'is-error': formErrors.email }"
                placeholder="email@organisation.org"
              />
              <span v-if="formErrors.email" class="err-msg">{{ formErrors.email }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="staff-password">Temporary Password <span class="req">*</span></label>
              <input
                id="staff-password"
                v-model="newStaff.password"
                type="text"
                class="form-input"
                :class="{ 'is-error': formErrors.password }"
                placeholder="Min 8 chars, must include a number"
              />
              <span v-if="formErrors.password" class="err-msg">{{ formErrors.password }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="staff-role">Role <span class="req">*</span></label>
              <select
                id="staff-role"
                v-model="newStaff.role"
                class="form-input"
                :class="{ 'is-error': formErrors.role }"
              >
                <option value="" disabled>Select a role…</option>
                <option value="facilitator">Facilitator</option>
                <option value="case_worker">Case Worker</option>
              </select>
              <span v-if="formErrors.role" class="err-msg">{{ formErrors.role }}</span>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="isCreating">
              <span v-if="isCreating" class="spinner-sm"></span>
              {{ isCreating ? 'Creating…' : 'Create Staff Member' }}
            </button>
          </div>
        </form>
      </div>

      <!-- ── Staff Table ──────────────────────────────────────────────── -->
      <div class="staff-table-card">
        <div class="table-header">
          <h2 class="card-title">Current Staff</h2>
          <span class="badge">{{ staffList.length }} members</span>
        </div>

        <div v-if="isLoadingStaff" class="loading-state">
          <span class="spinner-sm"></span> Loading staff…
        </div>

        <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>

        <div v-else-if="staffList.length === 0" class="empty-state">
          <AppIcon name="users" :size="32" />
          <p>No staff members yet. Click "Add Staff" to create one.</p>
        </div>

        <div v-else class="staff-list">
          <div
            v-for="staff in staffList"
            :key="staff.user_id"
            class="staff-row"
          >
            <!-- Staff Info -->
            <div class="staff-info">
              <div class="staff-avatar">{{ getInitials(staff.full_name || '') }}</div>
              <div class="staff-details">
                <span class="staff-name">{{ staff.full_name || staff.user_id }}</span>
                <span class="staff-role-badge" :class="'role-' + staff.role">
                  {{ formatRole(staff.role || '') }}
                </span>
              </div>
            </div>

            <!-- Assignment Status -->
            <div class="assignment-status">
              <template v-if="staff.is_active">
                <div class="location-badge active">
                  <AppIcon name="map-pin" :size="13" />
                  <span>{{ staff.location_name }}</span>
                </div>
                <span class="start-date">Since {{ formatDate(staff.start_date || '') }}</span>
              </template>
              <template v-else>
                <span class="unassigned-label">Unassigned</span>
              </template>
            </div>

            <!-- Actions -->
            <div class="staff-actions">
              <template v-if="staff.is_active">
                <button
                  class="btn btn-outline btn-sm"
                  @click="handleUnassign(staff.user_id)"
                  :disabled="actionLoading === staff.user_id"
                >
                  <span v-if="actionLoading === staff.user_id" class="spinner-sm"></span>
                  {{ actionLoading === staff.user_id ? '' : 'Unassign' }}
                </button>
              </template>
              <template v-else>
                <select
                  v-model="assignState[staff.user_id]"
                  class="form-input form-input-sm"
                >
                  <option value="">Select location…</option>
                  <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                    {{ loc.name }}
                  </option>
                </select>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="!assignState[staff.user_id] || actionLoading === staff.user_id"
                  @click="handleAssign(staff.user_id)"
                >
                  <span v-if="actionLoading === staff.user_id" class="spinner-sm"></span>
                  {{ actionLoading === staff.user_id ? '' : 'Assign' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Action feedback ──────────────────────────────────────────── -->
      <div v-if="actionSuccess" class="toast toast-success">
        <AppIcon name="check-circle" :size="16" />
        {{ actionSuccess }}
      </div>
      <div v-if="actionError" class="toast toast-error">
        <AppIcon name="alert-circle" :size="16" />
        {{ actionError }}
      </div>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { cfsApi } from '../../services/cfsApi';
import { useAuthStore } from '../../stores/auth';
import AppIcon from '../../components/interfaces/AppIcon.vue';
import type { Breadcrumb } from '../../interfaces/dashboard';
import type { StaffAssignment, CfsLocation, StaffRole } from '../../interfaces/cfs';

definePageMeta({ middleware: ['auth', 'role-guard'], layout: false, allowedRoles: ['org_admin'] });
useHead({ title: 'Staff Management — CFS — DART' });

const authStore = useAuthStore();

const breadcrumbs: Breadcrumb[] = [
  { title: 'Home', href: '/' },
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Staff Management', href: '/cfs/staff-management', current: true },
];

// ── State ─────────────────────────────────────────────────────────────────────
const staffList = ref<StaffAssignment[]>([]);
const locations = ref<CfsLocation[]>([]);
const isLoadingStaff = ref(false);
const loadError = ref('');

// Add staff form
const showAddForm = ref(false);
const isCreating = ref(false);
const createError = ref('');
const createSuccess = ref('');
const formErrors = reactive<Record<string, string>>({});
const newStaff = reactive({
  full_name: '',
  email: '',
  password: '',
  role: '' as StaffRole | '',
});

// Assign/unassign
const assignState = ref<Record<string, string>>({});
const actionLoading = ref<string | null>(null);
const actionSuccess = ref('');
const actionError = ref('');

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function clearToasts() {
  setTimeout(() => { actionSuccess.value = ''; actionError.value = ''; }, 3000);
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function loadStaff() {
  isLoadingStaff.value = true;
  loadError.value = '';
  try {
    const headers: Record<string, string> = {};
    if (authStore.accessToken) headers.Authorization = `Bearer ${authStore.accessToken}`;

    const [staffRes, locRes] = await Promise.all([
      cfsApi.getStaffAssignments(authStore.accessToken || undefined),
      fetch('/api/v1/cfs/locations', { headers }).then(r => r.json()).then(d => d?.data || []),
    ]);

    staffList.value = staffRes.assignments || [];
    locations.value = locRes || [];

    // Init assign state for unassigned staff
    staffList.value.forEach(s => {
      if (!s.is_active && !assignState.value[s.user_id]) {
        assignState.value[s.user_id] = '';
      }
    });
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load staff data';
  } finally {
    isLoadingStaff.value = false;
  }
}

onMounted(loadStaff);

// ── Create Staff ──────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCreateForm(): boolean {
  Object.keys(formErrors).forEach(k => delete formErrors[k]);
  let ok = true;

  if (!newStaff.full_name.trim() || newStaff.full_name.trim().length < 2) {
    formErrors.full_name = 'Name must be at least 2 characters';
    ok = false;
  }
  if (!newStaff.email.trim()) {
    formErrors.email = 'Email is required';
    ok = false;
  } else if (!EMAIL_RE.test(newStaff.email.trim())) {
    formErrors.email = 'Enter a valid email address';
    ok = false;
  }
  if (!newStaff.password || newStaff.password.length < 8) {
    formErrors.password = 'Password must be at least 8 characters';
    ok = false;
  } else if (!/\d/.test(newStaff.password)) {
    formErrors.password = 'Password must contain at least one number';
    ok = false;
  }
  if (!newStaff.role) {
    formErrors.role = 'Please select a role';
    ok = false;
  }
  return ok;
}

async function handleCreateStaff() {
  createError.value = '';
  createSuccess.value = '';
  if (!validateCreateForm()) return;

  isCreating.value = true;
  try {
    await cfsApi.createStaff({
      full_name: newStaff.full_name.trim(),
      email: newStaff.email.trim().toLowerCase(),
      password: newStaff.password,
      role: newStaff.role as StaffRole,
    }, authStore.accessToken || undefined);

    createSuccess.value = `${newStaff.full_name.trim()} added as ${formatRole(newStaff.role)}`;
    // Reset form
    newStaff.full_name = '';
    newStaff.email = '';
    newStaff.password = '';
    newStaff.role = '';
    // Refresh list
    await loadStaff();
  } catch (e: any) {
    if (e?.data?.errors) {
      Object.assign(formErrors, e.data.errors);
    } else {
      createError.value = e?.message || 'Failed to create staff member';
    }
  } finally {
    isCreating.value = false;
  }
}

// ── Assign Staff ──────────────────────────────────────────────────────────────
async function handleAssign(userId: string) {
  const locationId = assignState.value[userId];
  if (!locationId) return;

  actionLoading.value = userId;
  actionError.value = '';
  try {
    await cfsApi.assignStaff({
      user_id: userId,
      cfs_location_id: locationId,
      start_date: new Date().toISOString().split('T')[0] ?? '',
    }, authStore.accessToken || undefined);

    actionSuccess.value = 'Staff assigned successfully';
    clearToasts();
    await loadStaff();
  } catch (e: any) {
    actionError.value = e?.message || 'Failed to assign staff';
    clearToasts();
  } finally {
    actionLoading.value = null;
  }
}

// ── Unassign Staff ────────────────────────────────────────────────────────────
async function handleUnassign(userId: string) {
  if (!confirm('Remove this staff member from their current location?')) return;

  actionLoading.value = userId;
  actionError.value = '';
  try {
    await cfsApi.unassignStaff({ user_id: userId }, authStore.accessToken || undefined);
    actionSuccess.value = 'Staff unassigned successfully';
    clearToasts();
    await loadStaff();
  } catch (e: any) {
    actionError.value = e?.message || 'Failed to unassign staff';
    clearToasts();
  } finally {
    actionLoading.value = null;
  }
}
</script>

<style scoped>
.staff-mgmt-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ────────────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Cards ─────────────────────────────────────────────────────────────── */
.add-staff-card,
.staff-table-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 4px 0 0 0;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}

.badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--primary-dim);
  color: var(--primary);
}

/* ── Form ──────────────────────────────────────────────────────────────── */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.req { color: #ef4444; }

.form-input {
  padding: 9px 12px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-input.is-error { border-color: #ef4444; }
.form-input-sm { padding: 6px 10px; font-size: 0.8rem; }

.err-msg {
  font-size: 0.72rem;
  color: #ef4444;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

/* ── Staff List ────────────────────────────────────────────────────────── */
.staff-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.staff-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.staff-row:last-child { border-bottom: none; }

.staff-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.staff-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(108, 177, 255, 0.2);
}

.staff-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.staff-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.staff-role-badge {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: capitalize;
}

.role-facilitator { color: #6cb1ff; }
.role-case_worker { color: #a78bfa; }

/* ── Assignment Status ─────────────────────────────────────────────────── */
.assignment-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 500;
}

.location-badge.active {
  color: #22c55e;
}

.start-date {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.unassigned-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

/* ── Actions ───────────────────────────────────────────────────────────── */
.staff-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Buttons ───────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.845rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-primary {
  background: var(--primary);
  color: #000;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-outline:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 0.78rem;
}

/* ── Alerts ────────────────────────────────────────────────────────────── */
.alert {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  margin-top: 12px;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  color: #22c55e;
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.25s ease;
}

.toast-success {
  background: #16a34a;
  color: #fff;
}

.toast-error {
  background: #dc2626;
  color: #fff;
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* ── Empty / Loading states ────────────────────────────────────────────── */
.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.empty-state p { margin: 0; }

/* ── Spinner ───────────────────────────────────────────────────────────── */
.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-left-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }

  .staff-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px 0;
  }

  .staff-actions {
    justify-content: flex-start;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
