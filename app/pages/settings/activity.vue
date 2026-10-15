<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Activity log', href: '/settings/activity', current: true },
    ]"
  >
    <div class="activity-page">
      <header class="head">
        <div>
          <h1 class="title">Activity log</h1>
          <p class="subtitle">
            Who did what, when, on which device and from which network. Select an entry to see the device and a map of the
            internet provider. Entries cannot be changed or deleted.
          </p>
        </div>
      </header>

      <!-- Needs a look -->
      <section v-if="flags.length || reviewedOpen" class="flags" aria-labelledby="flags-title">
        <div class="section-head">
          <h2 id="flags-title" class="section-title">
            <AppIcon name="flag" :size="16" />
            {{ reviewedOpen ? 'Reviewed' : 'Needs a look' }}
            <span v-if="!reviewedOpen" class="count">{{ flags.length }}</span>
          </h2>
          <button type="button" class="link-btn" @click="toggleReviewed">
            {{ reviewedOpen ? 'Back to what needs a look' : 'Show reviewed' }}
          </button>
        </div>

        <p v-if="reviewedOpen && !flags.length" class="empty">Nothing reviewed yet.</p>
        <ul class="flag-list">
          <li v-for="f in flags" :key="f.id" class="flag" :class="f.severity">
            <span class="sev" :class="f.severity">{{ severityLabel[f.severity] }}</span>
            <span class="flag-body">
              <span class="flag-title">{{ f.rule_label || f.rule }}</span>
              <span class="flag-text">{{ f.summary }}</span>
              <span class="meta">
                <template v-if="f.user_name">{{ f.user_name }} · </template>
                <template v-if="f.device_name">{{ f.device_name }} · </template>
                {{ when(f.first_seen_at) }}<template v-if="f.last_seen_at !== f.first_seen_at"> – {{ timeOnly(f.last_seen_at) }}</template>
              </span>
              <span v-if="f.reviewed_at" class="meta">
                Reviewed by {{ f.reviewed_by_name ?? 'someone' }} {{ when(f.reviewed_at) }}<template v-if="f.review_note">: “{{ f.review_note }}”</template>
              </span>
            </span>
            <span class="controls">
              <button v-if="f.user_id" type="button" class="ui-btn ui-btn--outline sm" @click="showFlagActivity(f)">See activity</button>
              <button v-if="!f.reviewed_at" type="button" class="ui-btn ui-btn--primary sm" @click="askReview(f)">Mark reviewed</button>
            </span>
          </li>
        </ul>
      </section>

      <!-- Filters -->
      <section class="toolbar" aria-label="Filter the activity log">
        <div class="tabs" role="group" aria-label="What">
          <button
            v-for="g in groupOptions" :key="g.value" type="button" class="tab"
            :class="{ on: filters.group === g.value }" :aria-pressed="filters.group === g.value"
            @click="setGroup(g.value)"
          >{{ g.label }}</button>
        </div>
        <div class="filter-row">
          <label class="field">
            <span class="field-label">Person</span>
            <select v-model="filters.user_id" class="ui-select" @change="reload">
              <option value="">Everyone</option>
              <option v-for="p in people" :key="p.id" :value="p.id">{{ p.full_name }}</option>
            </select>
          </label>
          <label v-if="tablets.length" class="field">
            <span class="field-label">Tablet</span>
            <select v-model="filters.device_id" class="ui-select" @change="reload">
              <option value="">Any</option>
              <option v-for="t in tablets" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">From</span>
            <input v-model="filters.from" type="date" class="ui-input" :max="filters.to || undefined" @change="reload">
          </label>
          <label class="field">
            <span class="field-label">To</span>
            <input v-model="filters.to" type="date" class="ui-input" :min="filters.from || undefined" @change="reload">
          </label>
        </div>
        <div class="toolbar-foot">
          <label class="toggle">
            <input v-model="filters.out_of_hours" type="checkbox" @change="reload">
            <span>Only outside working hours (before 7:00 or after 19:00)</span>
          </label>
          <button v-if="filtered" type="button" class="link-btn" @click="clearFilters">Clear filters</button>
        </div>
      </section>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-if="loading && !entries.length" class="skeleton" aria-busy="true" aria-label="Loading the activity log">
        <span v-for="n in 6" :key="n" class="skeleton-row" />
      </div>

      <div v-else-if="!loadError && !entries.length" class="empty">
        <AppIcon name="search" :size="20" />
        <p>Nothing matches these filters.</p>
      </div>

      <template v-else-if="!loadError">
        <p class="total">{{ total.toLocaleString() }} {{ total === 1 ? 'entry' : 'entries' }}<template v-if="pages > 1"> · page {{ page }} of {{ pages }}</template></p>

        <div class="days" :aria-busy="loading">
          <section v-for="day in days" :key="day.key" class="day" :aria-label="day.label">
            <h2 class="day-label">{{ day.label }}</h2>
            <ul class="log">
              <li v-for="e in day.entries" :key="e.id">
                <button type="button" class="entry" :class="tone(e)" @click="selected = e">
                  <span class="entry-icon"><AppIcon :name="kindIcon(e)" :size="16" /></span>
                  <span class="entry-main">
                    <span class="entry-line">
                      <strong>{{ e.user_name ?? 'Deleted account' }}</strong>{{ ' ' }}<span class="entry-label">{{ lower(e.label) }}</span>
                    </span>
                    <span class="entry-meta">
                      <span v-if="e.recorded_by_name" class="pill">PIN: {{ e.recorded_by_name }}</span>
                      <span v-if="e.details" class="detail">{{ e.details }}</span>
                    </span>
                    <span class="entry-source">
                      <span class="src">
                        <AppIcon :name="deviceIcon(e.device)" :size="13" />
                        {{ e.device ? (e.device.kind === 'app' ? (e.device.tablet_name ?? 'WellReach app') : e.device.summary) : (e.client === 'app' ? (e.device_name ?? 'App') : 'Website') }}
                      </span>
                      <span v-if="e.location && placeShort(e.location)" class="src">
                        <span v-if="countryFlag(e.location.country_code)" aria-hidden="true">{{ countryFlag(e.location.country_code) }}</span>
                        <AppIcon v-else name="globe" :size="13" />
                        {{ placeShort(e.location) }}
                      </span>
                      <span v-else-if="e.ip_address" class="src mono">{{ e.ip_address }}</span>
                    </span>
                  </span>
                  <span class="entry-time">{{ timeOnly(e.at) }}</span>
                  <AppIcon name="chevron-right" :size="16" class="entry-chev" />
                </button>
              </li>
            </ul>
          </section>
        </div>

        <nav v-if="pages > 1" class="pager" aria-label="Pages">
          <button type="button" class="ui-btn ui-btn--outline" :disabled="page <= 1 || loading" @click="go(page - 1)">
            <AppIcon name="chevron-left" :size="16" /> Newer
          </button>
          <span>Page {{ page }} of {{ pages }}</span>
          <button type="button" class="ui-btn ui-btn--outline" :disabled="page >= pages || loading" @click="go(page + 1)">
            Older <AppIcon name="chevron-right" :size="16" />
          </button>
        </nav>
      </template>
    </div>

    <!-- One entry -->
    <DetailDrawer :open="!!selected" :title="selected ? selected.label : ''" eyebrow="Activity" @close="selected = null">
      <template v-if="selected">
        <dl class="summary">
          <div><dt>Who</dt><dd>{{ selected.user_name ?? 'Deleted account' }}</dd></div>
          <div v-if="selected.recorded_by_name"><dt>Recorded for (PIN)</dt><dd>{{ selected.recorded_by_name }}</dd></div>
          <div><dt>When</dt><dd>{{ fullDate(selected.at) }}</dd></div>
          <div v-if="selected.details" class="wide"><dt>Details</dt><dd>{{ selected.details }}</dd></div>
        </dl>
        <RequestSource :ip="selected.ip_address" :device="selected.device" :location="selected.location" />
        <button v-if="selected.user_id" type="button" class="ui-btn ui-btn--outline" @click="onlyThisPerson(selected)">
          See everything by {{ selected.user_name ?? 'this person' }}
        </button>
      </template>
    </DetailDrawer>

    <!-- Mark reviewed -->
    <div v-if="reviewing" class="overlay" @mousedown.self="reviewing = null">
      <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="rev-title" @keydown.esc="reviewing = null" @submit.prevent="review">
        <header class="dialog-head">
          <h2 id="rev-title">Mark as reviewed</h2>
        </header>
        <div class="body">
          <p><strong>{{ reviewing.rule_label }}</strong> — {{ reviewing.summary }}</p>
          <div class="ui-field">
            <label class="ui-label" for="rev-note">What did you find? (optional)</label>
            <textarea id="rev-note" v-model="note" class="ui-input" rows="3" maxlength="500" placeholder="e.g. Called Benson: he forgot his password. Nothing wrong." />
          </div>
          <p v-if="reviewError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ reviewError }}</span></p>
          <div class="actions">
            <button type="button" class="ui-btn ui-btn--outline" @click="reviewing = null">Cancel</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving">Mark reviewed</button>
          </div>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { activityLogApi, type ActivityEntry, type ActivityFlag, type ActivityGroup } from '../../services/activityLogApi'
import { accessApi } from '../../services/accessApi'
import { deviceApi } from '../../services/deviceApi'
import DetailDrawer from '../../components/audit/DetailDrawer.vue'
import RequestSource from '../../components/audit/RequestSource.vue'
import { countryFlag, deviceIcon, placeShort } from '../../utils/requestSource'

definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin'], permission: 'activity.view' })

const groupOptions: { value: ActivityGroup; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'sign_ins', label: 'Sign-ins' },
  { value: 'changes', label: 'Changes' },
  { value: 'views', label: "Children's records opened" },
  { value: 'downloads', label: 'Downloads' },
  { value: 'refused', label: 'Refused' },
  { value: 'admin', label: 'Staff, roles & tablets' },
]
const refusedActions = new Set(['access_denied', 'login_failed', 'login_blocked', 'device_enrol_failed'])
const severityLabel = { high: 'High', medium: 'Check', low: 'FYI' } as const
const PAGE_SIZE = 50

const entries = ref<ActivityEntry[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const loadError = ref('')
const filters = reactive({ group: '' as ActivityGroup, user_id: '', device_id: '', from: '', to: '', out_of_hours: false })
const filtered = computed(() => !!(filters.group || filters.user_id || filters.device_id || filters.from || filters.to || filters.out_of_hours))
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const people = ref<{ id: string; full_name: string }[]>([])
const tablets = ref<{ id: string; name: string }[]>([])

const flags = ref<ActivityFlag[]>([])
const reviewedOpen = ref(false)

// ── Entries ────────────────────────────────────────────────────────────────
const selected = ref<ActivityEntry | null>(null)

/** Entries of the page, one group per day, newest first. */
const days = computed(() => {
  const out: { key: string; label: string; entries: ActivityEntry[] }[] = []
  for (const e of entries.value) {
    const key = new Date(e.at).toDateString()
    const last = out[out.length - 1]
    if (last?.key === key) last.entries.push(e)
    else out.push({ key, label: dayHeading(e.at), entries: [e] })
  }
  return out
})

const adminActions = /role|staff|invite|user|device|permission|password|access/
function kindIcon(e: ActivityEntry): string {
  if (refusedActions.has(e.action)) return 'alert-triangle'
  if (e.action === 'login') return 'log-in'
  if (e.action === 'logout') return 'log-out'
  if (e.action.startsWith('viewed')) return 'eye'
  if (e.action === 'data_exported') return 'download'
  if (e.action === 'personal_details_removed' || e.action.includes('delete')) return 'trash'
  if (adminActions.test(e.action)) return 'shield'
  return 'pencil'
}
function tone(e: ActivityEntry): string {
  if (refusedActions.has(e.action)) return 'tone-refused'
  if (e.action === 'data_exported' || e.action === 'personal_details_removed') return 'tone-notice'
  return ''
}
/** "Downloaded an Excel file" → "downloaded an Excel file", after the name. */
const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1)

function onlyThisPerson(e: ActivityEntry) {
  selected.value = null
  if (e.user_id && !people.value.some(p => p.id === e.user_id)) {
    people.value = [...people.value, { id: e.user_id, full_name: e.user_name ?? 'Unknown' }]
  }
  Object.assign(filters, { group: '', user_id: e.user_id ?? '', device_id: '' })
  reload()
}

// ── Dates ──────────────────────────────────────────────────────────────────
const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
function dayHeading(iso: string) {
  const label = dayLabel(iso)
  if (label === 'Today' || label === 'Yesterday') return label
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
})
const when = (iso: string) => `${dayLabel(iso).toLowerCase() === 'today' ? 'today' : dayLabel(iso)} ${timeOnly(iso)}`
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await activityLogApi.list({ ...filters, page: page.value, limit: PAGE_SIZE })
    entries.value = res.data
    total.value = res.total
  } catch (e: any) {
    loadError.value = e?.status === 403
      ? "You don't have access to the activity log."
      : e?.status === 400 ? (e.message ?? 'Check the filters.') : 'Could not load the activity log. Please try again.'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void load()
}

function go(p: number) {
  page.value = p
  void load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function setGroup(g: ActivityGroup) {
  filters.group = g
  reload()
}

function clearFilters() {
  Object.assign(filters, { group: '', user_id: '', device_id: '', from: '', to: '', out_of_hours: false })
  reload()
}

async function loadFlags() {
  try {
    flags.value = (await activityLogApi.flags(reviewedOpen.value)).data
  } catch {
    flags.value = []
  }
}

function toggleReviewed() {
  reviewedOpen.value = !reviewedOpen.value
  void loadFlags()
}

/** Shows what the flagged person did on those days. */
function showFlagActivity(f: ActivityFlag) {
  Object.assign(filters, {
    group: '', user_id: f.user_id ?? '', device_id: '', out_of_hours: false,
    from: ymd(new Date(f.first_seen_at)), to: ymd(new Date(f.last_seen_at)),
  })
  if (f.user_id && !people.value.some(p => p.id === f.user_id)) {
    people.value = [...people.value, { id: f.user_id, full_name: f.user_name ?? 'Unknown' }]
  }
  reload()
}

// ── Review ─────────────────────────────────────────────────────────────────
const reviewing = ref<ActivityFlag | null>(null)
const note = ref('')
const saving = ref(false)
const reviewError = ref('')

function askReview(f: ActivityFlag) {
  reviewing.value = f
  note.value = ''
  reviewError.value = ''
}

async function review() {
  const f = reviewing.value
  if (!f) return
  saving.value = true
  reviewError.value = ''
  try {
    await activityLogApi.review(f.id, note.value.trim())
    reviewing.value = null
    await loadFlags()
  } catch (e: any) {
    if (e?.status === 404) {
      // Someone else reviewed it meanwhile.
      reviewing.value = null
      await loadFlags()
    } else {
      reviewError.value = 'Could not save. Please try again.'
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
  void loadFlags()
  // The pickers are a convenience: without people or tablet access they stay short.
  accessApi.users()
    .then(r => { people.value = r.users.map(u => ({ id: u.id, full_name: u.full_name })).sort((a, b) => a.full_name.localeCompare(b.full_name)) })
    .catch(() => {})
  deviceApi.list()
    .then(list => { tablets.value = list.filter(d => d.status !== 'pending').map(d => ({ id: d.id, name: d.name })) })
    .catch(() => {})
})
</script>

<style scoped>
.activity-page { max-width: 960px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 6px 0 0; max-width: 68ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.meta { font-size: 0.8125rem; color: var(--text-secondary); }
.link-btn { border: 0; background: none; padding: 4px 0; color: var(--link, var(--primary)); font-size: 0.875rem; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.ui-btn.sm { min-height: 34px; padding: 0 12px; font-size: 0.8125rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.empty {
  margin: 0; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  color: var(--text-secondary); background: var(--bg-panel); border: 1px dashed var(--border-color); border-radius: 16px;
}
.empty p { margin: 0; }

/* Needs a look */
.flags { display: flex; flex-direction: column; gap: 10px; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.section-title { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
.count { font-size: 0.75rem; font-weight: 700; min-width: 22px; padding: 2px 7px; text-align: center; border-radius: 999px; background: var(--error-text); color: #fff; }
.flag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.flag { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 14px; }
.flag.high { background: color-mix(in srgb, var(--error) 6%, var(--bg-panel)); border-color: color-mix(in srgb, var(--error) 30%, var(--border-color)); }
.flag.medium { background: color-mix(in srgb, var(--warning) 6%, var(--bg-panel)); border-color: color-mix(in srgb, var(--warning) 30%, var(--border-color)); }
.sev { flex: none; align-self: flex-start; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; background: var(--hover-bg); color: var(--text-secondary); }
.sev.high { background: color-mix(in srgb, var(--error) 14%, transparent); color: var(--error-text); }
.sev.medium { background: var(--warning-bg); color: color-mix(in srgb, var(--warning) 70%, var(--text-primary)); }
.flag-body { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
.flag-title { font-weight: 600; color: var(--text-primary); }
.flag-text { color: var(--text-primary); font-size: 0.9375rem; }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Filters */
.toolbar { display: flex; flex-direction: column; gap: 14px; padding: 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 3px; margin: -3px; }
.tabs::-webkit-scrollbar { display: none; }
.tab {
  flex: none; border: 1px solid transparent; background: transparent; color: var(--text-secondary);
  padding: 7px 12px; border-radius: 10px; font-size: 0.875rem; cursor: pointer; white-space: nowrap;
}
.tab:hover { background: var(--hover-bg); color: var(--text-primary); }
.tab.on { background: var(--primary-dim); color: var(--link, var(--primary)); border-color: color-mix(in srgb, var(--primary) 30%, transparent); font-weight: 600; }
.tab:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
.filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.field-label { font-size: 0.8125rem; color: var(--text-secondary); }
.toolbar-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-primary); cursor: pointer; }

/* Log */
.total { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.skeleton { display: flex; flex-direction: column; gap: 1px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color); }
.skeleton-row { height: 68px; background: var(--bg-panel); opacity: 0.7; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.35; } }
.days { display: flex; flex-direction: column; gap: 20px; }
.days[aria-busy='true'] { opacity: 0.6; }
.day { display: flex; flex-direction: column; gap: 8px; }
.day-label { margin: 0; padding: 0 4px; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
.log { list-style: none; margin: 0; padding: 0; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
.log li + li .entry { border-top: 1px solid var(--border-color); }
.entry {
  width: 100%; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 16px; align-items: center; gap: 14px;
  padding: 14px 16px; border: 0; background: transparent; text-align: left; color: inherit; font: inherit; cursor: pointer;
  transition: background-color 0.15s ease;
}
.entry:hover { background: var(--hover-bg); }
.entry:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.entry-icon {
  width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--hover-bg); color: var(--text-secondary);
}
.tone-refused .entry-icon { background: color-mix(in srgb, var(--error) 12%, transparent); color: var(--error-text); }
.tone-notice .entry-icon { background: var(--primary-dim); color: var(--link, var(--primary)); }
.entry-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.entry-line { font-size: 0.9375rem; color: var(--text-primary); line-height: 1.35; }
.entry-line strong { font-weight: 600; }
.tone-refused .entry-label { color: var(--error-text); }
.entry-meta:empty { display: none; }
.entry-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 0.8125rem; color: var(--text-secondary); }
.pill { padding: 1px 8px; border-radius: 999px; background: var(--hover-bg); font-size: 0.75rem; }
.detail { overflow-wrap: anywhere; }
.entry-source { display: flex; gap: 6px 14px; flex-wrap: wrap; font-size: 0.8125rem; color: var(--text-secondary); }
.src { display: inline-flex; align-items: center; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
.entry-time { font-size: 0.8125rem; font-variant-numeric: tabular-nums; color: var(--text-secondary); align-self: start; padding-top: 2px; }
.entry-chev { color: var(--text-secondary); opacity: 0.6; }
.pager { display: flex; justify-content: center; align-items: center; gap: 16px; color: var(--text-secondary); font-size: 0.875rem; }
.pager .ui-btn { display: inline-flex; align-items: center; gap: 4px; }

/* Drawer content */
.summary { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
.summary .wide { grid-column: 1 / -1; }
.summary dt { font-size: 0.8125rem; color: var(--text-secondary); }
.summary dd { margin: 2px 0 0; font-size: 0.9375rem; color: var(--text-primary); overflow-wrap: anywhere; }

@media (max-width: 640px) {
  .entry { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 12px; padding: 12px; }
  .entry-icon { width: 32px; height: 32px; }
  .entry-chev { display: none; }
  .flag { align-items: flex-start; }
  .controls { width: 100%; }
  .summary { grid-template-columns: 1fr; }
}

/* Dialog */
.overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 42, 0.45); }
.dialog { width: 100%; max-width: 480px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
.dialog-head { padding: 20px 20px 0; }
.dialog-head h2 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
.body { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
.body p { margin: 0; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
