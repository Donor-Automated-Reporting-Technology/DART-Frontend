<template>
  <form class="aggregate-form" @submit.prevent="$emit('submit')">
    <div class="form-row">
      <div class="field">
        <label class="field-label">Event Name</label>
        <input v-model="form.event_name" type="text" class="field-input" placeholder="e.g. Community Awareness Day" required />
      </div>
      <div class="field">
        <label class="field-label">Date</label>
        <input v-model="form.event_date" type="date" class="field-input" required />
      </div>
    </div>

    <div class="form-row">
      <div class="field">
        <label class="field-label">Location</label>
        <select v-model="form.cfs_location_id" class="field-input" required>
          <option value="" disabled>Select location</option>
          <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Community Leader Contact</label>
        <input v-model="form.community_leader_contact" type="text" class="field-input" placeholder="Name / phone" />
      </div>
    </div>

    <h4 class="section-title">Participant Counts</h4>
    <div class="counts-grid">
      <div class="count-field">
        <label class="field-label">Girls</label>
        <input v-model.number="form.girls" type="number" class="field-input" min="0" />
      </div>
      <div class="count-field">
        <label class="field-label">Boys</label>
        <input v-model.number="form.boys" type="number" class="field-input" min="0" />
      </div>
      <div class="count-field">
        <label class="field-label">Women</label>
        <input v-model.number="form.women" type="number" class="field-input" min="0" />
      </div>
      <div class="count-field">
        <label class="field-label">Men</label>
        <input v-model.number="form.men" type="number" class="field-input" min="0" />
      </div>
      <div class="count-field">
        <label class="field-label">Disability (M)</label>
        <input v-model.number="form.disability_male" type="number" class="field-input" min="0" />
      </div>
      <div class="count-field">
        <label class="field-label">Disability (F)</label>
        <input v-model.number="form.disability_female" type="number" class="field-input" min="0" />
      </div>
    </div>

    <div class="total-row">
      <span class="total-label">Total Participants</span>
      <span class="total-value">{{ totalParticipants }}</span>
    </div>

    <div class="field">
      <label class="field-label">Notes</label>
      <textarea v-model="form.notes" class="field-input field-textarea" rows="3" placeholder="Additional observations…" />
    </div>

    <div class="submit-bar">
      <button type="submit" class="btn-primary" :disabled="submitting || !form.event_name || !form.cfs_location_id">
        <span v-if="submitting" class="btn-spinner" />
        {{ submitting ? 'Submitting…' : 'Record Event' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { ServicePoint } from '../../interfaces/location'

defineProps<{
  form: {
    event_name: string
    event_date: string
    cfs_location_id: string
    community_leader_contact: string
    girls: number
    boys: number
    women: number
    men: number
    disability_male: number
    disability_female: number
    notes: string
  }
  totalParticipants: number
  submitting: boolean
  servicePoints: ServicePoint[]
}>()

defineEmits<{
  submit: []
}>()
</script>

<style scoped>
.aggregate-form { display: flex; flex-direction: column; gap: 16px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 4px; }
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

.section-title { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin: 0; }

.counts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.count-field { display: flex; flex-direction: column; gap: 4px; }

.total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}
.total-label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
.total-value { font-size: 1.1rem; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }

.submit-bar { display: flex; justify-content: flex-end; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .counts-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
