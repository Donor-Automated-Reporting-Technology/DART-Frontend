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
          How long WellReach keeps a person's personal details after their last activity (registration, enrolment,
          attendance or a profile change). Every night, details older than this are removed.
        </p>
      </header>

      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading retention period" />

      <p v-else-if="loadError" class="ui-alert" role="alert">{{ loadError }}</p>

      <form v-else class="card" novalidate @submit.prevent="save">
        <div class="choices" role="radiogroup" aria-label="Retention">
          <label class="choice" :class="{ on: mode === 'off' }">
            <input v-model="mode" type="radio" value="off" class="sr-only">
            <span class="choice-icon"><AppIcon name="toggle-off" :size="18" /></span>
            <span class="choice-text">
              <strong>Off</strong>
              <span>Details stay until someone removes them from a profile. Use this only until SSWOCO has agreed a period.</span>
            </span>
          </label>
          <label class="choice" :class="{ on: mode === 'on' }">
            <input v-model="mode" type="radio" value="on" class="sr-only">
            <span class="choice-icon"><AppIcon name="clock" :size="18" /></span>
            <span class="choice-text">
              <strong>Remove automatically</strong>
              <span>After a number of months with no activity.</span>
            </span>
          </label>
        </div>

        <div v-if="mode === 'on'" class="months">
          <p class="months-label" id="rt-label">Months after the last activity</p>
          <div class="presets" role="group" aria-labelledby="rt-label">
            <button v-for="m in PRESETS" :key="m" type="button" class="preset" :class="{ on: months === m }" :aria-pressed="months === m" @click="months = m">
              {{ m }} months<span v-if="m % 12 === 0" class="years"> · {{ m / 12 }} {{ m === 12 ? 'year' : 'years' }}</span>
            </button>
          </div>
          <label class="custom">
            <span>Other</span>
            <input id="rt-months" v-model.number="months" class="ui-input" type="number" min="1" max="120" step="1" inputmode="numeric" aria-describedby="rt-help">
            <span>months</span>
          </label>
          <p v-if="monthsError" id="rt-help" class="help error" role="alert">{{ monthsError }}</p>
          <p v-else id="rt-help" class="help">Between 1 and 120. Use the period agreed in the pilot agreement.</p>
        </div>

        <p v-if="alert" class="ui-alert" role="alert">{{ alert }}</p>

        <footer class="actions">
          <p v-if="saved" class="saved" role="status"><AppIcon name="check-circle" :size="16" /> {{ saved }}</p>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving ? 'true' : undefined">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </footer>
      </form>

      <section class="facts" aria-label="What is removed and what stays">
        <div>
          <h2 class="facts-title"><AppIcon name="trash" :size="14" /> Removed</h2>
          <p>Names, guardian, phone, notes, Primero case ID and recorded concerns.</p>
        </div>
        <div>
          <h2 class="facts-title"><AppIcon name="check" :size="14" /> Kept</h2>
          <p>Age, sex, disability and CFS, so attendance totals in reports stay right.</p>
        </div>
        <div>
          <h2 class="facts-title"><AppIcon name="file-text" :size="14" /> Recorded</h2>
          <p>Each removal, with the date and reason, in the activity log.</p>
        </div>
      </section>
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
const PRESETS = [12, 24, 36, 60]
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
.subtitle { margin: 6px 0 0; max-width: 64ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.card { padding: 24px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; gap: 20px; }
.skeleton { height: 220px; opacity: 0.6; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.choice {
  display: flex; gap: 12px; align-items: flex-start; padding: 16px; cursor: pointer;
  border: 1px solid var(--border-color); border-radius: 12px; transition: border-color 0.15s ease, background-color 0.15s ease;
}
.choice:hover { background: var(--hover-bg); }
.choice.on { border-color: var(--primary); background: var(--primary-dim); }
.choice:has(input:focus-visible) { outline: 2px solid var(--primary); outline-offset: 2px; }
.choice-icon { flex: none; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: var(--hover-bg); color: var(--text-secondary); }
.choice.on .choice-icon { background: var(--primary); color: var(--on-primary, #fff); }
.choice-text { display: flex; flex-direction: column; gap: 2px; font-size: 0.875rem; line-height: 1.45; color: var(--text-secondary); }
.choice-text strong { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }

.months { display: flex; flex-direction: column; gap: 12px; }
.months-label { margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
.presets { display: flex; gap: 8px; flex-wrap: wrap; }
.preset {
  padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border-color); background: transparent;
  color: var(--text-primary); font-size: 0.875rem; cursor: pointer;
}
.preset:hover { background: var(--hover-bg); }
.preset.on { border-color: var(--primary); background: var(--primary-dim); color: var(--link, var(--primary)); font-weight: 600; }
.years { color: var(--text-secondary); font-weight: 400; }
.custom { display: inline-flex; align-items: center; gap: 10px; font-size: 0.875rem; color: var(--text-secondary); }
.custom .ui-input { width: 96px; }
.help { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.error { color: var(--error-text); }

.actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding-top: 20px; border-top: 1px solid var(--border-color); }
.saved { margin: 0 auto 0 0; display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--success, #22c55e); }

.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.facts > div { padding: 16px; border-radius: 12px; background: var(--hover-bg); }
.facts-title { margin: 0 0 6px; display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
.facts p { margin: 0; font-size: 0.8125rem; line-height: 1.45; color: var(--text-secondary); }

@media (max-width: 640px) {
  .card { padding: 16px; }
  .choices, .facts { grid-template-columns: 1fr; }
  .actions { flex-direction: column-reverse; align-items: stretch; }
  .actions .ui-btn { width: 100%; }
  .saved { margin: 0; }
}
</style>
