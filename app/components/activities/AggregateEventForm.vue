<template>
  <form class="aggregate-form" novalidate @focusout="iv.onBlur" @input="iv.onInput" @submit.prevent="iv.submit($event, () => $emit('submit'))">
    <div class="form-row">
      <div class="field">
        <label :for="`${fid}-1`" class="field-label">Event Name</label>
        <input :id="`${fid}-1`" v-model="form.event_name" type="text" class="field-input" placeholder="e.g. Community Awareness Day" required :name="`${fid}-1`" v-bind="iv.aria(`${fid}-1`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-1` + '-error'" :message="iv.messages[`${fid}-1`]" />
      </div>
      <div class="field">
        <label :for="`${fid}-2`" class="field-label">Date</label>
        <input :id="`${fid}-2`" v-model="form.event_date" type="date" class="field-input" required :name="`${fid}-2`" v-bind="iv.aria(`${fid}-2`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-2` + '-error'" :message="iv.messages[`${fid}-2`]" />
      </div>
    </div>

    <div class="form-row">
      <div class="field">
        <label :for="`${fid}-3`" class="field-label">Location</label>
        <select :id="`${fid}-3`" v-model="form.cfs_location_id" class="field-input" required :name="`${fid}-3`" v-bind="iv.aria(`${fid}-3`, 'iv')">
          <option value="" disabled>Select location</option>
          <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
        </select>
        <FieldError :id="'iv-' + `${fid}-3` + '-error'" :message="iv.messages[`${fid}-3`]" />
      </div>
      <div class="field">
        <label :for="`${fid}-4`" class="field-label">Community Leader Contact</label>
        <input :id="`${fid}-4`" v-model="form.community_leader_contact" type="text" class="field-input" placeholder="Name / phone" />
      </div>
    </div>

    <h4 class="section-title">Participant Counts</h4>
    <div class="counts-grid">
      <div class="count-field">
        <label :for="`${fid}-5`" class="field-label">Girls</label>
        <input :id="`${fid}-5`" v-model.number="form.girls" type="number" class="field-input" min="0" :name="`${fid}-5`" v-bind="iv.aria(`${fid}-5`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-5` + '-error'" :message="iv.messages[`${fid}-5`]" />
      </div>
      <div class="count-field">
        <label :for="`${fid}-6`" class="field-label">Boys</label>
        <input :id="`${fid}-6`" v-model.number="form.boys" type="number" class="field-input" min="0" :name="`${fid}-6`" v-bind="iv.aria(`${fid}-6`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-6` + '-error'" :message="iv.messages[`${fid}-6`]" />
      </div>
      <div class="count-field">
        <label :for="`${fid}-7`" class="field-label">Women</label>
        <input :id="`${fid}-7`" v-model.number="form.women" type="number" class="field-input" min="0" :name="`${fid}-7`" v-bind="iv.aria(`${fid}-7`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-7` + '-error'" :message="iv.messages[`${fid}-7`]" />
      </div>
      <div class="count-field">
        <label :for="`${fid}-8`" class="field-label">Men</label>
        <input :id="`${fid}-8`" v-model.number="form.men" type="number" class="field-input" min="0" :name="`${fid}-8`" v-bind="iv.aria(`${fid}-8`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-8` + '-error'" :message="iv.messages[`${fid}-8`]" />
      </div>
      <div class="count-field">
        <label :for="`${fid}-9`" class="field-label">Disability (M)</label>
        <input :id="`${fid}-9`" v-model.number="form.disability_male" type="number" class="field-input" min="0" :name="`${fid}-9`" v-bind="iv.aria(`${fid}-9`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-9` + '-error'" :message="iv.messages[`${fid}-9`]" />
      </div>
      <div class="count-field">
        <label :for="`${fid}-10`" class="field-label">Disability (F)</label>
        <input :id="`${fid}-10`" v-model.number="form.disability_female" type="number" class="field-input" min="0" :name="`${fid}-10`" v-bind="iv.aria(`${fid}-10`, 'iv')" />
        <FieldError :id="'iv-' + `${fid}-10` + '-error'" :message="iv.messages[`${fid}-10`]" />
      </div>
    </div>

    <div class="total-row">
      <span class="total-label">Total Participants</span>
      <span class="total-value">{{ totalParticipants }}</span>
    </div>

    <div class="field">
      <label :for="`${fid}-11`" class="field-label">Notes</label>
      <textarea :id="`${fid}-11`" v-model="form.notes" class="field-input field-textarea" rows="3" placeholder="Additional observations…" />
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
import FieldError from '../../components/interfaces/FieldError.vue'
import { useInlineValidation } from '../../composables/useInlineValidation'
import { useId } from 'vue'
import type { ServicePoint } from '../../interfaces/location'

// Built-in field rules (required, min/max…) shown inline instead of browser pop-ups.
const iv = useInlineValidation()

// Links each label to its field.
const fid = useId()

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

.field { display: flex; flex-direction: column; gap: 8px; }








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
