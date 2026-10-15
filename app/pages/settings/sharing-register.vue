<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Sharing register', href: '/settings/sharing-register', current: true },
    ]"
  >
    <div class="register-page">
      <header>
        <h1 class="title">Sharing register</h1>
        <p class="subtitle">
          Every Excel file downloaded from WellReach. Lists with names are strictly confidential, so each one records why
          it was downloaded, who received it and under which agreement. Select an entry for the device and network it
          was downloaded from. Entries cannot be changed or deleted.
        </p>
      </header>

      <section class="toolbar" aria-label="Filter the sharing register">
        <div class="tabs" role="group" aria-label="Which files">
          <button type="button" class="tab" :class="{ on: !namedOnly }" :aria-pressed="!namedOnly" @click="setNamed(false)">All downloads</button>
          <button type="button" class="tab" :class="{ on: namedOnly }" :aria-pressed="namedOnly" @click="setNamed(true)">
            <AppIcon name="lock" :size="13" /> Lists with names
          </button>
        </div>
        <div class="dates">
          <label class="field">
            <span class="field-label">From</span>
            <input v-model="from" class="ui-input" type="date" :max="to || undefined" @change="load(1)">
          </label>
          <label class="field">
            <span class="field-label">To</span>
            <input v-model="to" class="ui-input" type="date" :min="from || undefined" @change="load(1)">
          </label>
          <button v-if="from || to" type="button" class="link-btn" @click="clearDates">Clear dates</button>
        </div>
      </section>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-else-if="loading && !entries.length" class="skeleton" aria-busy="true" aria-label="Loading the sharing register">
        <span v-for="n in 4" :key="n" class="skeleton-row" />
      </div>

      <div v-else-if="!entries.length" class="empty">
        <AppIcon name="file-spreadsheet" :size="20" />
        <p>No {{ namedOnly ? 'lists with names' : 'downloads' }} {{ from || to ? 'in these dates' : 'yet' }}.</p>
      </div>

      <template v-else>
        <p class="total" aria-live="polite">{{ total }} {{ total === 1 ? 'download' : 'downloads' }}<template v-if="pages > 1"> · page {{ page }} of {{ pages }}</template></p>

        <div class="days" :aria-busy="loading">
          <section v-for="day in days" :key="day.key" class="day" :aria-label="day.label">
            <h2 class="day-label">{{ day.label }}</h2>
            <ul class="list">
              <li v-for="e in day.entries" :key="e.id">
                <button type="button" class="row" :class="{ named: e.named }" @click="selected = e">
                  <span class="row-icon"><AppIcon :name="e.named ? 'lock' : 'file-spreadsheet'" :size="16" /></span>
                  <span class="row-main">
                    <span class="row-title">
                      {{ e.export }}
                      <span class="badge" :class="e.named ? 'badge--named' : 'badge--counts'">{{ e.named ? 'With names' : 'Counts only' }}</span>
                    </span>
                    <span class="row-meta">
                      <strong>{{ e.by }}</strong>
                      <template v-if="dataRows(e) > 0"> · {{ dataRows(e) }} {{ dataRows(e) === 1 ? 'row' : 'rows' }}</template>
                    </span>
                    <span v-if="e.named && (e.purpose || e.recipient)" class="row-reason">
                      {{ e.purpose || 'No reason given' }}<template v-if="e.recipient"> → {{ e.recipient }}</template>
                    </span>
                    <span v-if="e.device || e.location" class="row-source">
                      <span v-if="e.device" class="src"><AppIcon :name="deviceIcon(e.device)" :size="13" /> {{ e.device.summary }}</span>
                      <span v-if="e.location && placeShort(e.location)" class="src">
                        <span v-if="countryFlag(e.location.country_code)" aria-hidden="true">{{ countryFlag(e.location.country_code) }}</span>
                        {{ placeShort(e.location) }}
                      </span>
                    </span>
                  </span>
                  <span class="row-time">{{ timeOnly(e.at) }}</span>
                  <AppIcon name="chevron-right" :size="16" class="row-chev" />
                </button>
              </li>
            </ul>
          </section>
        </div>

        <nav v-if="pages > 1" class="pager" aria-label="Pages">
          <button type="button" class="ui-btn ui-btn--outline" :disabled="loading || page <= 1" @click="load(page - 1)">
            <AppIcon name="chevron-left" :size="16" /> Newer
          </button>
          <span>Page {{ page }} of {{ pages }}</span>
          <button type="button" class="ui-btn ui-btn--outline" :disabled="loading || page >= pages" @click="load(page + 1)">
            Older <AppIcon name="chevron-right" :size="16" />
          </button>
        </nav>
      </template>
    </div>

    <DetailDrawer :open="!!selected" :title="selected?.export ?? ''" :eyebrow="selected?.named ? 'List with names' : 'Counts only'" @close="selected = null">
      <template v-if="selected">
        <dl class="summary">
          <div><dt>Downloaded by</dt><dd>{{ selected.by }}</dd></div>
          <div><dt>When</dt><dd>{{ fullDate(selected.at) }}</dd></div>
          <div v-if="selected.file" class="wide"><dt>File</dt><dd class="mono">{{ selected.file }}</dd></div>
          <div v-if="dataRows(selected) > 0"><dt>Rows</dt><dd>{{ dataRows(selected) }}</dd></div>
          <div v-if="selected.named"><dt>Protected</dt><dd>Password, shown once to the person who downloaded it</dd></div>
        </dl>
        <section v-if="selected.named" class="reason" aria-labelledby="why-h">
          <h3 id="why-h" class="block-title">Why it was shared</h3>
          <dl class="summary summary--plain">
            <div class="wide"><dt>Purpose</dt><dd>{{ selected.purpose || '—' }}</dd></div>
            <div><dt>Given to</dt><dd>{{ selected.recipient || '—' }}</dd></div>
            <div><dt>Agreement</dt><dd>{{ selected.agreement || '—' }}</dd></div>
          </dl>
        </section>
        <RequestSource :ip="selected.ip_address" :device="selected.device" :location="selected.location" />
      </template>
    </DetailDrawer>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { accessApi, type SharingRegisterEntry } from '../../services/accessApi'
import { ApiError } from '../../services/api'
import DetailDrawer from '../../components/audit/DetailDrawer.vue'
import RequestSource from '../../components/audit/RequestSource.vue'
import { countryFlag, deviceIcon, placeShort } from '../../utils/requestSource'

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
const selected = ref<SharingRegisterEntry | null>(null)

const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

/** Rows without the header row. */
const dataRows = (e: SharingRegisterEntry) => Math.max(0, e.rows - 1)

const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
})
function dayHeading(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const days = computed(() => {
  const out: { key: string; label: string; entries: SharingRegisterEntry[] }[] = []
  for (const e of entries.value) {
    const key = new Date(e.at).toDateString()
    const last = out[out.length - 1]
    if (last?.key === key) last.entries.push(e)
    else out.push({ key, label: dayHeading(e.at), entries: [e] })
  }
  return out
})

function setNamed(v: boolean) {
  namedOnly.value = v
  void load(1)
}
function clearDates() {
  from.value = ''
  to.value = ''
  void load(1)
}

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
.register-page { max-width: 960px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 6px 0 0; max-width: 68ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; }
.link-btn { border: 0; background: none; padding: 4px 0; color: var(--link, var(--primary)); font-size: 0.875rem; cursor: pointer; align-self: flex-end; min-height: 40px; }
.link-btn:hover { text-decoration: underline; }

.toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.tabs { display: inline-flex; gap: 4px; padding: 3px; border-radius: 12px; background: var(--hover-bg); }
.tab {
  display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: var(--text-secondary);
  padding: 7px 14px; border-radius: 9px; font-size: 0.875rem; cursor: pointer; white-space: nowrap;
}
.tab.on { background: var(--bg-panel); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
.tab:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.dates { display: flex; gap: 12px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 4px; width: 160px; }
.field-label { font-size: 0.8125rem; color: var(--text-secondary); }

.empty {
  margin: 0; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  color: var(--text-secondary); background: var(--bg-panel); border: 1px dashed var(--border-color); border-radius: 16px;
}
.empty p { margin: 0; }
.skeleton { display: flex; flex-direction: column; gap: 1px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color); }
.skeleton-row { height: 76px; background: var(--bg-panel); opacity: 0.7; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.35; } }
.total { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }

.days { display: flex; flex-direction: column; gap: 20px; }
.days[aria-busy='true'] { opacity: 0.6; }
.day { display: flex; flex-direction: column; gap: 8px; }
.day-label { margin: 0; padding: 0 4px; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
.list { list-style: none; margin: 0; padding: 0; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
.list li + li .row { border-top: 1px solid var(--border-color); }
.row {
  width: 100%; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 16px; align-items: center; gap: 14px;
  padding: 14px 16px; border: 0; background: transparent; text-align: left; color: inherit; font: inherit; cursor: pointer;
  transition: background-color 0.15s ease;
}
.row:hover { background: var(--hover-bg); }
.row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.row-icon { width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: var(--hover-bg); color: var(--text-secondary); }
.row.named .row-icon { background: color-mix(in srgb, var(--error) 10%, transparent); color: var(--error-text); }
.row-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.row-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }
.badge { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.02em; padding: 2px 8px; border-radius: 999px; }
.badge--named { background: color-mix(in srgb, var(--error) 12%, transparent); color: var(--error-text); }
.badge--counts { background: var(--hover-bg); color: var(--text-secondary); }
.row-meta, .row-reason, .row-source { font-size: 0.8125rem; color: var(--text-secondary); overflow-wrap: anywhere; }
.row-meta strong { color: var(--text-primary); font-weight: 500; }
.row-reason { color: var(--text-primary); }
.row-source { display: flex; gap: 6px 14px; flex-wrap: wrap; }
.src { display: inline-flex; align-items: center; gap: 5px; }
.row-time { font-size: 0.8125rem; font-variant-numeric: tabular-nums; color: var(--text-secondary); align-self: start; padding-top: 2px; }
.row-chev { color: var(--text-secondary); opacity: 0.6; }
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; color: var(--text-secondary); font-size: 0.875rem; }
.pager .ui-btn { display: inline-flex; align-items: center; gap: 4px; }

.summary { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.summary--plain { padding-bottom: 0; border-bottom: 0; }
.summary .wide { grid-column: 1 / -1; }
.summary dt { font-size: 0.8125rem; color: var(--text-secondary); }
.summary dd { margin: 2px 0 0; font-size: 0.9375rem; color: var(--text-primary); overflow-wrap: anywhere; }
.reason { display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.block-title { margin: 0; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }

@media (max-width: 640px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .tabs { align-self: flex-start; }
  .field { width: calc(50% - 6px); }
  .row { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 12px; padding: 12px; }
  .row-icon { width: 32px; height: 32px; }
  .row-chev { display: none; }
  .summary { grid-template-columns: 1fr; }
}
</style>
