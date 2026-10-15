<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Sharing register', href: '/settings/sharing-register', current: true },
    ]"
  >
    <div class="register-page">
      <header class="head">
        <h1 class="title">Sharing register</h1>
        <p class="subtitle">
          Every Excel file downloaded from WellReach. Lists with names are strictly confidential: each one records why it
          was downloaded, who received it and under which agreement. Entries cannot be changed or deleted.
        </p>
      </header>

      <form class="filters" @submit.prevent="load(1)">
        <div class="ui-field">
          <label class="ui-label" for="sr-from">From</label>
          <input id="sr-from" v-model="from" class="ui-input" type="date" :max="to || undefined">
        </div>
        <div class="ui-field">
          <label class="ui-label" for="sr-to">To</label>
          <input id="sr-to" v-model="to" class="ui-input" type="date" :min="from || undefined">
        </div>
        <label class="named-toggle">
          <input v-model="namedOnly" type="checkbox">
          <span>Lists with names only</span>
        </label>
        <button type="submit" class="ui-btn ui-btn--outline" :disabled="loading">Show</button>
      </form>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-else-if="loading && !entries.length" class="card skeleton" aria-busy="true" aria-label="Loading the sharing register" />

      <p v-else-if="!entries.length" class="empty">No downloads {{ from || to ? 'in these dates' : 'yet' }}.</p>

      <template v-else>
        <p class="count" aria-live="polite">{{ total }} {{ total === 1 ? 'download' : 'downloads' }}</p>
        <ul class="entries" :aria-busy="loading">
          <li v-for="e in entries" :key="e.id" class="entry">
            <div class="entry-head">
              <span class="kind" :class="e.named ? 'kind--named' : 'kind--counts'">{{ e.named ? 'With names' : 'Counts only' }}</span>
              <span class="export">{{ e.export }}</span>
              <span class="when">{{ formatWhen(e.at) }}</span>
            </div>
            <p class="by">
              Downloaded by <strong>{{ e.by }}</strong>
              <template v-if="e.file"> · {{ e.file }}</template>
              <template v-if="e.rows"> · {{ e.rows }} rows</template>
            </p>
            <dl v-if="e.named" class="reason">
              <div><dt>Why</dt><dd>{{ e.purpose || '—' }}</dd></div>
              <div><dt>Given to</dt><dd>{{ e.recipient || '—' }}</dd></div>
              <div><dt>Agreement</dt><dd>{{ e.agreement || '—' }}</dd></div>
            </dl>
          </li>
        </ul>

        <nav v-if="pages > 1" class="pager" aria-label="Pages">
          <button type="button" class="ui-btn ui-btn--outline" :disabled="loading || page <= 1" @click="load(page - 1)">Newer</button>
          <span>Page {{ page }} of {{ pages }}</span>
          <button type="button" class="ui-btn ui-btn--outline" :disabled="loading || page >= pages" @click="load(page + 1)">Older</button>
        </nav>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { accessApi, type SharingRegisterEntry } from '../../services/accessApi'
import { ApiError } from '../../services/api'

// The record of every release of data that the South Sudan Information
// Sharing Protocol asks for. Read-only: entries come from the activity log.
definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin', 'director'], permission: 'data.sharing_register' })
useHead({ title: 'Sharing register · WellReach' })

const entries = ref<SharingRegisterEntry[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const from = ref('')
const to = ref('')
const namedOnly = ref(false)
const loading = ref(true)
const loadError = ref('')

const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function load(p: number) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await accessApi.sharingRegister({ named: namedOnly.value, from: from.value, to: to.value, page: p })
    entries.value = res.entries
    total.value = res.total
    page.value = res.page
    pageSize.value = res.page_size
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 403
      ? 'Your role cannot see the sharing register.'
      : 'Could not load the sharing register. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.register-page { max-width: 900px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 68ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-quiet); }
.filters { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.filters .ui-field { width: 170px; }
.filters .ui-btn { min-height: 40px; padding: 0 16px; }
.named-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; font-size: 0.9375rem; color: var(--text-primary); }
.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.skeleton { height: 240px; opacity: 0.6; }
.empty, .count { margin: 0; color: var(--text-quiet); }

.entries { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.entries[aria-busy='true'] { opacity: 0.6; }
.entry { padding: 16px 20px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; gap: 6px; }
.entry-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.kind { padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border-color); }
.kind--named { color: var(--error-text); border-color: color-mix(in srgb, var(--error-text) 40%, transparent); }
.kind--counts { color: var(--text-secondary); }
.export { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }
.when { margin-left: auto; font-size: 0.8125rem; color: var(--text-secondary); }
.by { margin: 0; font-size: 0.875rem; color: var(--text-secondary); overflow-wrap: anywhere; }
.by strong { color: var(--text-primary); font-weight: 600; }
.reason { margin: 4px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.reason dt { font-size: 0.75rem; color: var(--text-quiet); text-transform: uppercase; letter-spacing: 0.04em; }
.reason dd { margin: 2px 0 0; font-size: 0.875rem; color: var(--text-primary); overflow-wrap: anywhere; }
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; color: var(--text-secondary); font-size: 0.875rem; }
.pager .ui-btn { min-height: 40px; padding: 0 16px; }

@media (max-width: 640px) {
  .filters .ui-field { width: calc(50% - 6px); }
  .when { margin-left: 0; flex-basis: 100%; }
  .reason { grid-template-columns: 1fr; gap: 8px; }
}
</style>
