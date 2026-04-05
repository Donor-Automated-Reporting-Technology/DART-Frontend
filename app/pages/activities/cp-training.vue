<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Activities', href: '/activities' },
      { title: 'CP Training', href: '/activities/cp-training', current: true },
    ]"
  >
    <div class="cpt-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">CP Training</h1>
          <p class="page-subtitle">Manage child protection training events and participant scores.</p>
        </div>
        <button class="btn-primary" @click="showCreate = true">+ New Training</button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Training detail view -->
      <div v-if="selectedEvent" class="detail-panel">
        <div class="detail-header">
          <div>
            <h3 class="detail-title">{{ selectedEvent.name }}</h3>
            <p class="detail-meta">{{ selectedEvent.date }} &middot; {{ selectedEvent.location_name }}</p>
          </div>
          <button class="btn-outline btn-sm" @click="closeDetail">Back to list</button>
        </div>

        <!-- Add participant -->
        <div class="add-participant-row">
          <input v-model="addBeneficiaryId" type="text" class="field-input" placeholder="Beneficiary ID" />
          <select v-model="addCategory" class="field-input">
            <option value="" disabled>Category</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <button class="btn-primary btn-sm" :disabled="!addBeneficiaryId || !addCategory || submitting" @click="handleAddParticipant">Add</button>
        </div>

        <!-- Participant table -->
        <div v-if="participants.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th class="num">Pre-test</th>
                <th class="num">Post-test</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in participants" :key="p.id">
                <td>{{ p.beneficiary_name }}</td>
                <td><span class="category-badge">{{ p.category }}</span></td>
                <td class="num">
                  <input
                    :value="p.pre_test_score"
                    type="number"
                    class="score-input"
                    min="0"
                    max="100"
                    @change="(e: Event) => handleScore(p.id, Number((e.target as HTMLInputElement).value), p.post_test_score)"
                  />
                </td>
                <td class="num">
                  <input
                    :value="p.post_test_score"
                    type="number"
                    class="score-input"
                    min="0"
                    max="100"
                    @change="(e: Event) => handleScore(p.id, p.pre_test_score, Number((e.target as HTMLInputElement).value))"
                  />
                </td>
                <td>
                  <span v-if="p.pre_test_score != null && p.post_test_score != null" :class="['change-badge', (p.post_test_score - p.pre_test_score) >= 0 ? 'positive' : 'negative']">
                    {{ (p.post_test_score - p.pre_test_score) >= 0 ? '+' : '' }}{{ p.post_test_score - p.pre_test_score }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">No participants yet. Add from above.</div>
      </div>

      <!-- Event list -->
      <template v-else>
        <div v-if="loading" class="loading-state">Loading…</div>
        <div v-else-if="events.length === 0" class="empty-state">No training events yet.</div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Training Name</th>
                <th>Date</th>
                <th>Location</th>
                <th class="num">Participants</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in events" :key="ev.id">
                <td>{{ ev.name }}</td>
                <td>{{ ev.date }}</td>
                <td>{{ ev.location_name }}</td>
                <td class="num">{{ ev.participant_count }}</td>
                <td><button class="link-btn" @click="selectEvent(ev.id)">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Create modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">New Training Event</h3>
            <button class="modal-close" @click="showCreate = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label class="field-label">Training Name</label>
              <input v-model="form.name" type="text" class="field-input" placeholder="e.g. CPC Training — March 2025" />
            </div>
            <div class="field">
              <label class="field-label">Date</label>
              <input v-model="form.date" type="date" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label">Location</label>
              <select v-model="form.cfs_location_id" class="field-input">
                <option value="" disabled>Select</option>
                <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreate = false">Cancel</button>
            <button class="btn-primary" :disabled="!form.name || !form.cfs_location_id || submitting" @click="handleCreateEvent">Create</button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCPTraining, PARTICIPANT_CATEGORIES } from '../../composables/useCPTraining'
import { useLocationStore } from '../../stores/location'
import { useAuthStore } from '../../stores/auth'

definePageMeta({ layout: false, middleware: ['auth'] })

const locationStore = useLocationStore()
const authStore = useAuthStore()
const servicePoints = locationStore.allServicePoints
const categories = PARTICIPANT_CATEGORIES

const {
  events, selectedEvent, participants, loading, submitting, error,
  form,
  fetchEvents, createEvent, selectEvent, addParticipant, updateScores, closeDetail,
} = useCPTraining()

const showCreate = ref(false)
const addBeneficiaryId = ref('')
const addCategory = ref('')

async function handleCreateEvent() {
  const activityId = authStore.frameworkActivities?.find(
    (a: any) => a.code === 'cp_training' || a.template_code === 'cp_training',
  )?.id || ''

  await createEvent(activityId)
  showCreate.value = false
}

async function handleAddParticipant() {
  if (!selectedEvent.value) return
  await addParticipant(selectedEvent.value.id, addBeneficiaryId.value, addCategory.value)
  addBeneficiaryId.value = ''
  addCategory.value = ''
}

async function handleScore(participantId: string, pre: number | null, post: number | null) {
  if (!selectedEvent.value) return
  await updateScores(selectedEvent.value.id, participantId, pre, post)
}

onMounted(() => {
  fetchEvents()
  if (!locationStore.locations.length) locationStore.fetchLocations()
})
</script>

<style scoped>
.cpt-page { max-width: 1000px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.error-msg { font-size: 0.82rem; color: var(--error); margin: 0 0 12px; }
.loading-state { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
.empty-state { text-align: center; padding: 32px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted); font-size: 0.85rem; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

.field-input {
  padding: 9px 12px; background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; font-family: inherit;
}
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center; background-repeat: no-repeat; background-size: 16px; padding-right: 32px;
}

/* Detail panel */
.detail-panel { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.detail-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
.detail-meta { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.add-participant-row { display: flex; gap: 10px; margin-bottom: 16px; }

/* Table */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
.data-table td { padding: 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
.data-table .num { text-align: right; }

.score-input { width: 56px; padding: 4px 6px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.82rem; text-align: right; font-variant-numeric: tabular-nums; }
.score-input:focus { outline: none; border-color: var(--primary); }

.category-badge { padding: 2px 8px; background: rgba(59,130,246,0.12); color: #60a5fa; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }

.change-badge { font-size: 0.75rem; font-weight: 700; }
.change-badge.positive { color: var(--success); }
.change-badge.negative { color: var(--error); }

.link-btn { background: none; border: none; color: var(--primary); font-size: 0.82rem; cursor: pointer; text-decoration: underline; }

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
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.modal-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border-subtle); }

@media (max-width: 640px) {
  .add-participant-row { flex-direction: column; }
}
</style>
