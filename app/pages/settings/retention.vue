<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Retention period', href: '/settings/retention', current: true },
    ]"
  >
    <div class="retention-page">
      <header>
        <h1 class="title">Retention period</h1>
        <p class="subtitle">
          How long WellReach keeps a person's personal details after their last activity: registration, enrolment,
          attendance or a change to their profile. Every night, details older than this are removed: names, guardian,
          phone, notes, Primero case ID and recorded concerns. Age, sex, disability and CFS stay, so attendance totals
          in reports stay right. Each removal is recorded.
        </p>
      </header>

      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading retention period" />

      <p v-else-if="loadError" class="ui-alert" role="alert">{{ loadError }}</p>

      <form v-else class="card ui-form" novalidate @submit.prevent="save">
        <label class="choice">
          <input v-model="mode" type="radio" value="off">
          <span>
            <strong>Off</strong>
            <span class="hint">Details are kept until someone removes them from a profile. Use this only until SSWOCO has agreed a period.</span>
          </span>
        </label>
        <label class="choice">
          <input v-model="mode" type="radio" value="on">
          <span>
            <strong>Remove details automatically</strong>
            <span class="hint">After the number of months below without any activity.</span>
          </span>
        </label>

        <div v-if="mode === 'on'" class="ui-field months">
          <label class="ui-label" for="rt-months">Months after the last activity</label>
          <input id="rt-months" v-model.number="months" class="ui-input" type="number" min="1" max="120" step="1" inputmode="numeric">
          <p v-if="monthsError" class="ui-help error" role="alert">{{ monthsError }}</p>
          <p v-else class="ui-help">Between 1 and 120. Use the period in the pilot agreement.</p>
        </div>

        <p v-if="alert" class="ui-alert" role="alert">{{ alert }}</p>
        <p v-if="saved" class="ui-help" role="status">{{ saved }}</p>

        <div class="actions">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving ? 'true' : undefined">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { privacyApi } from '../../services/privacyApi'
import { ApiError } from '../../services/api'

definePageMeta({ layout: false, middleware: ['auth'] })
useHead({ title: 'Retention period · WellReach' })

const loading = ref(true)
const loadError = ref('')
const mode = ref<'off' | 'on'>('off')
const months = ref<number | ''>(24)
const monthsError = ref('')
const alert = ref('')
const saved = ref('')
const saving = ref(false)

async function save() {
  monthsError.value = ''
  alert.value = ''
  saved.value = ''
  let value: number | null = null
  if (mode.value === 'on') {
    const m = Number(months.value)
    if (!Number.isInteger(m) || m < 1 || m > 120) {
      monthsError.value = 'Enter a whole number of months between 1 and 120'
      return
    }
    value = m
  }
  saving.value = true
  try {
    const result = await privacyApi.setRetention(value)
    saved.value = result === null
      ? 'Saved. Details are not removed automatically.'
      : `Saved. Details are removed ${result} months after a person's last activity.`
  } catch (e) {
    alert.value = e instanceof ApiError
      ? (e.status === 403 ? 'Your role cannot change the retention period.' : e.message)
      : 'Connection failed — try again.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const current = await privacyApi.getRetention()
    if (current !== null) {
      mode.value = 'on'
      months.value = current
    }
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 403
      ? 'Your role cannot see the retention period. It needs “Remove personal details”.'
      : 'Could not load the retention period. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.retention-page { max-width: 720px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 68ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-quiet); }
.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; gap: 16px; }
.skeleton { height: 200px; opacity: 0.6; }
.choice { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; color: var(--text-primary); font-size: 0.9375rem; }
.choice input { margin-top: 4px; }
.choice strong { display: block; font-weight: 600; }
.hint { display: block; margin-top: 2px; font-size: 0.875rem; color: var(--text-secondary); }
.months { max-width: 260px; margin-left: 28px; }
.error { color: var(--error-text); }
.actions { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--border-color); }

@media (max-width: 640px) {
  .card { padding: 24px 16px; }
  .months { margin-left: 0; max-width: none; }
  .actions .ui-btn { width: 100%; }
}
</style>
