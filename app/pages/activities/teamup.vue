<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'TeamUp', href: '/activities/teamup', current: true },
    ]"
  >
    <div class="teamup-page">
      <div class="page-header">
        <h1 class="page-title">TeamUp Sessions</h1>
        <p class="page-subtitle">Track 20-session psychosocial support groups for children.</p>
      </div>

      <!-- Group selector + create -->
      <div class="group-bar">
        <div class="field">
          <label class="field-label">Group</label>
          <select v-model="selectedGroupId" class="field-input" @change="onGroupChange">
            <option value="" disabled>Select a group</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <button class="btn-outline" @click="showCreate = true">+ New Group</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading…</div>

      <!-- No group selected -->
      <div v-else-if="!selectedGroup" class="empty-state">
        Select or create a TeamUp group to begin.
      </div>

      <!-- Group detail view -->
      <template v-else>
        <!-- Group info -->
        <div class="group-info">
          <div class="info-item">
            <span class="info-label">Enrolled</span>
            <span class="info-value">{{ totalEnrolled }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Dropped</span>
            <span class="info-value">{{ totalDropped }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Progress</span>
            <span class="info-value">{{ sessionProgress.completed }}/{{ sessionProgress.total }}</span>
          </div>
          <button class="btn-outline btn-sm" @click="showEnroll = true">+ Enroll</button>
        </div>

        <!-- Session controls -->
        <div class="session-controls">
          <div class="field">
            <label class="field-label">Module</label>
            <select v-model="currentModule" class="field-input">
              <option v-for="(m, i) in modules" :key="i" :value="i">{{ m.name }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Session #</label>
            <input v-model.number="currentSession" type="number" class="field-input field-narrow" min="1" :max="modules[currentModule]?.sessions || 4" />
          </div>
          <div class="field">
            <label class="field-label">Date</label>
            <input v-model="sessionDate" type="date" class="field-input" />
          </div>
        </div>

        <!-- Session grid -->
        <CohortSessionGrid
          :columns="gridColumns"
          :rows="gridRows"
          :active-column="activeColumn"
          @toggle="toggleAttendance"
        />

        <!-- Submit -->
        <div class="submit-bar">
          <button
            class="btn-primary"
            :disabled="submitting"
            @click="submitSessionAttendance"
          >
            <span v-if="submitting" class="btn-spinner" />
            {{ submitting ? 'Submitting…' : 'Submit Session' }}
          </button>
        </div>
      </template>

      <!-- Create Group Modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Create TeamUp Group</h3>
            <button class="modal-close" @click="showCreate = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label class="field-label">Group Name</label>
              <input v-model="newGroup.name" type="text" class="field-input" placeholder="e.g. TeamUp Group A" />
            </div>
            <div class="field">
              <label class="field-label">CFS Centre</label>
              <select v-model="newGroup.service_point_id" class="field-input">
                <option value="" disabled>Select</option>
                <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreate = false">Cancel</button>
            <button class="btn-primary" :disabled="!newGroup.name || !newGroup.service_point_id" @click="handleCreate">Create</button>
          </div>
        </div>
      </div>

      <!-- Enroll Modal -->
      <EnrollBeneficiariesModal
        :open="showEnroll"
        :beneficiaries="enrollCandidates"
        :enrolling="submitting"
        @close="showEnroll = false"
        @enroll="handleEnroll"
      />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useTeamUp, TEAMUP_MODULES } from '../../composables/useTeamUp'
import { useLocationStore } from '../../stores/location'
import { useAuthStore } from '../../stores/auth'
import CohortSessionGrid from '../../components/activities/CohortSessionGrid.vue'
import EnrollBeneficiariesModal from '../../components/activities/EnrollBeneficiariesModal.vue'
import type { GridColumn, GridRow } from '../../components/activities/CohortSessionGrid.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const authStore = useAuthStore()
const servicePoints = locationStore.allServicePoints

const {
  groups, selectedGroup, enrollments, loading, submitting, error,
  currentModule, currentSession, sessionDate, attendance,
  sessionProgress, totalEnrolled, totalDropped,
  fetchGroups, selectGroup, createGroup, enrollBeneficiaries,
  toggleAttendance, submitSessionAttendance,
} = useTeamUp()

const selectedGroupId = ref('')
const showCreate = ref(false)
const showEnroll = ref(false)
const modules = TEAMUP_MODULES

const newGroup = reactive({
  name: '',
  service_point_id: '',
})

function onGroupChange() {
  if (selectedGroupId.value) selectGroup(selectedGroupId.value)
}

async function handleCreate() {
  const activityId = authStore.frameworkActivities?.find(
    (a: any) => a.code === 'teamup' || a.template_code === 'teamup',
  )?.id || ''

  const g = await createGroup({
    framework_activity_id: activityId,
    service_point_id: newGroup.service_point_id,
    name: newGroup.name,
  })
  if (g) {
    selectedGroupId.value = g.id
    selectGroup(g.id)
  }
  showCreate.value = false
  newGroup.name = ''
  newGroup.service_point_id = ''
}

async function handleEnroll(ids: string[]) {
  await enrollBeneficiaries(ids)
  showEnroll.value = false
}

// Build grid columns from modules
const gridColumns = computed<GridColumn[]>(() => {
  const cols: GridColumn[] = []
  modules.forEach(m => {
    for (let s = 1; s <= m.sessions; s++) {
      cols.push({ label: `S${s}`, moduleName: m.name })
    }
  })
  return cols
})

// Track which column is the active (today's) session
const activeColumn = computed(() => {
  let idx = 0
  for (let mi = 0; mi < currentModule.value; mi++) {
    idx += modules[mi].sessions
  }
  idx += currentSession.value - 1
  return idx
})

// Build grid rows from enrollments
const gridRows = computed<GridRow[]>(() =>
  enrollments.value
    .filter(e => e.status === 'active')
    .map(e => ({
      beneficiaryId: e.beneficiary_id,
      name: e.beneficiary_name || e.beneficiary_id,
      attended: gridColumns.value.map(() => false), // TODO: fill from API attendance data
      todayPresent: attendance.value[e.beneficiary_id] ?? false,
      attendedCount: 0,
    })),
)

// Placeholder enroll candidates — in a real app, fetch from beneficiary API
const enrollCandidates = computed(() =>
  enrollments.value.map(e => ({
    id: e.beneficiary_id,
    full_name: e.beneficiary_name || e.beneficiary_id,
    age: 0,
    sex: '',
  })),
)

onMounted(() => {
  fetchGroups()
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
.teamup-page { max-width: 1000px; }

.page-header { margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.group-bar { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 18px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.field-narrow { width: 70px; }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center; background-repeat: no-repeat; background-size: 16px; padding-right: 32px;
}

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 48px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted); font-size: 0.85rem; }

.group-info {
  display: flex; align-items: center; gap: 20px; padding: 14px 18px;
  background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 14px;
}
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.info-value { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

.session-controls { display: flex; gap: 14px; margin-bottom: 14px; }

.submit-bar { display: flex; justify-content: flex-end; margin-top: 14px; }

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

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-box { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); width: 400px; max-width: 95vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.modal-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border-subtle); }

@media (max-width: 640px) {
  .group-bar { flex-direction: column; align-items: stretch; }
  .session-controls { flex-direction: column; }
  .group-info { flex-wrap: wrap; }
}
</style>
