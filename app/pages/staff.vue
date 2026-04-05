<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Staff', href: '/staff', current: true }]">
    <div class="staff-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Staff Management</h1>
          <p class="page-subtitle">Manage staff accounts and location assignments.</p>
        </div>
        <button class="btn-primary" @click="showCreate = true">+ Add Staff</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading staff…</div>

      <!-- Staff table -->
      <div v-else-if="staffList.length > 0" class="staff-card">
        <table class="staff-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Locations</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in staffList" :key="s.id">
              <td class="cell-name">{{ s.full_name }}</td>
              <td>{{ s.email }}</td>
              <td><span class="role-badge">{{ s.role }}</span></td>
              <td>{{ s.assigned_locations?.length || 0 }} assigned</td>
              <td class="col-actions">
                <button class="btn-text-sm" @click="openEdit(s)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading" class="empty-state">
        No staff members yet. Click "Add Staff" to get started.
      </div>

      <!-- Create modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Add Staff Member</h3>
            <button class="modal-close" @click="showCreate = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label class="field-label">Full Name</label>
              <input v-model="form.full_name" type="text" class="field-input" placeholder="Full name" />
            </div>
            <div class="field">
              <label class="field-label">Email</label>
              <input v-model="form.email" type="email" class="field-input" placeholder="email@example.com" />
            </div>
            <div class="field">
              <label class="field-label">Role</label>
              <select v-model="form.role" class="field-input">
                <option value="" disabled>Select role</option>
                <option value="facilitator">Facilitator</option>
                <option value="case_worker">Case Worker</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">Password</label>
              <input v-model="form.password" type="password" class="field-input" placeholder="Temporary password" />
            </div>
            <StaffAssignmentForm
              :service-points="servicePoints"
              v-model="form.locations"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreate = false">Cancel</button>
            <button class="btn-primary" :disabled="creating" @click="handleCreate">
              {{ creating ? 'Creating…' : 'Create Staff' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Edit modal -->
      <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Edit Staff — {{ editTarget?.full_name }}</h3>
            <button class="modal-close" @click="showEdit = false">&times;</button>
          </div>
          <div class="modal-body">
            <StaffAssignmentForm
              :service-points="servicePoints"
              v-model="editLocations"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showEdit = false">Cancel</button>
            <button class="btn-primary" :disabled="creating" @click="handleEditSave">
              {{ creating ? 'Saving…' : 'Save Assignments' }}
            </button>
          </div>
        </div>
      </div>
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
const editTarget = ref<StaffMember | null>(null)
const editLocations = ref<string[]>([])

const form = reactive({
  full_name: '',
  email: '',
  role: '',
  password: '',
  locations: [] as string[],
})

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
  creating.value = true
  error.value = null
  try {
    const staff = await staffApi.create({
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: form.role,
    }) as StaffMember

    // assign locations
    for (const locId of form.locations) {
      await staffApi.assign({
        user_id: staff.id,
        cfs_location_id: locId,
        start_date: new Date().toISOString().slice(0, 10),
      })
    }

    showCreate.value = false
    form.full_name = ''; form.email = ''; form.role = ''; form.password = ''; form.locations = []
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
    // Simple approach: unassign then re-assign
    await staffApi.unassign({ user_id: editTarget.value.id })
    for (const locId of editLocations.value) {
      await staffApi.assign({
        user_id: editTarget.value.id,
        cfs_location_id: locId,
        start_date: new Date().toISOString().slice(0, 10),
      })
    }
    showEdit.value = false
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
.staff-page { max-width: 900px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 48px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted); font-size: 0.85rem; }

.staff-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }

.staff-table { width: 100%; border-collapse: collapse; }
.staff-table th { text-align: left; padding: 10px 14px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
.staff-table td { padding: 12px 14px; font-size: 0.82rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.staff-table tr:last-child td { border-bottom: none; }
.staff-table tr:hover td { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }

.cell-name { font-weight: 500; color: var(--text-primary); }
.col-actions { width: 60px; text-align: right; }

.role-badge { font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; background: var(--primary-dim); color: var(--primary); font-weight: 500; text-transform: capitalize; }

.btn-text-sm { background: none; border: none; color: var(--primary); font-size: 0.78rem; cursor: pointer; font-weight: 500; }
.btn-text-sm:hover { text-decoration: underline; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
  width: 100%; box-sizing: border-box;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center; background-repeat: no-repeat; background-size: 16px; padding-right: 32px;
}

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary { padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.82rem; cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); width: 440px; max-width: 95vw; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.modal-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border-subtle); }
</style>
