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
        <h1 class="title">Activity log</h1>
        <p class="subtitle">
          Who did what, when, and from where. On a shared tablet it shows the person who entered their PIN.
          Nothing here can be changed or deleted.
        </p>
      </header>

      <!-- Needs a look -->
      <section v-if="flags.length || reviewedOpen" class="flags" aria-labelledby="flags-title">
        <div class="section-head">
          <h2 id="flags-title" class="section-title">
            <AppIcon name="flag" :size="18" />
            {{ reviewedOpen ? 'Reviewed' : 'Needs a look' }}
            <span v-if="!reviewedOpen" class="count">{{ flags.length }}</span>
          </h2>
          <button type="button" class="ui-btn ui-btn--text" @click="toggleReviewed">
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
              <button v-if="f.user_id" type="button" class="ui-btn ui-btn--outline" @click="showFlagActivity(f)">See activity</button>
              <button v-if="!f.reviewed_at" type="button" class="ui-btn ui-btn--primary" @click="askReview(f)">Mark reviewed</button>
            </span>
          </li>
        </ul>
      </section>

      <!-- Filters -->
      <section class="filters" aria-label="Filter the activity log">
        <div class="chips" role="group" aria-label="What">
          <button
            v-for="g in groupOptions" :key="g.value" type="button" class="chip"
            :class="{ on: filters.group === g.value }" :aria-pressed="filters.group === g.value"
            @click="setGroup(g.value)"
          >{{ g.label }}</button>
        </div>
        <div class="filter-row">
          <div class="ui-field">
            <label class="ui-label" for="f-person">Person</label>
            <select id="f-person" v-model="filters.user_id" class="ui-select" @change="reload">
              <option value="">Everyone</option>
              <option v-for="p in people" :key="p.id" :value="p.id">{{ p.full_name }}</option>
            </select>
          </div>
          <div v-if="tablets.length" class="ui-field">
            <label class="ui-label" for="f-tablet">Tablet</label>
            <select id="f-tablet" v-model="filters.device_id" class="ui-select" @change="reload">
              <option value="">Any</option>
              <option v-for="t in tablets" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="f-from">From</label>
            <input id="f-from" v-model="filters.from" type="date" class="ui-input" @change="reload">
          </div>
          <div class="ui-field">
            <label class="ui-label" for="f-to">To</label>
            <input id="f-to" v-model="filters.to" type="date" class="ui-input" @change="reload">
          </div>
          <label class="check">
            <input v-model="filters.out_of_hours" type="checkbox" @change="reload">
            Outside working hours (before 7:00 or after 19:00)
          </label>
        </div>
        <button v-if="filtered" type="button" class="ui-btn ui-btn--text clear" @click="clearFilters">Clear filters</button>
      </section>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-if="loading && !entries.length" class="skeleton" aria-busy="true" aria-label="Loading the activity log" />

      <p v-else-if="!loadError && !entries.length" class="empty">Nothing matches these filters.</p>

      <template v-else-if="!loadError">
        <p class="total">{{ total.toLocaleString() }} {{ total === 1 ? 'entry' : 'entries' }}</p>
        <ol class="log" :aria-busy="loading">
          <li v-for="e in entries" :key="e.id" class="entry" :class="{ refused: refusedActions.has(e.action) }">
            <span class="when">
              <span class="day">{{ dayLabel(e.at) }}</span>
              <span class="hour">{{ timeOnly(e.at) }}</span>
            </span>
            <span class="what">
              <span class="label">
                <AppIcon v-if="refusedActions.has(e.action)" name="alert-triangle" :size="14" />
                {{ e.label }}
              </span>
              <span v-if="e.details" class="meta">{{ e.details }}</span>
              <span class="meta">
                <strong>{{ e.user_name ?? 'Deleted account' }}</strong>
                <template v-if="e.recorded_by_name"> · recorded for {{ e.recorded_by_name }} (PIN)</template>
              </span>
            </span>
            <span class="where">
              <span>{{ e.client === 'app' ? (e.device_name ?? 'App') : e.client === 'web' ? 'Website' : '—' }}</span>
              <span v-if="e.ip_address" class="ip">{{ e.ip_address }}</span>
            </span>
          </li>
        </ol>

        <nav v-if="pages > 1" class="pager" aria-label="Pages">
          <button type="button" class="ui-btn ui-btn--outline" :disabled="page <= 1 || loading" @click="go(page - 1)">Newer</button>
          <span>Page {{ page }} of {{ pages }}</span>
          <button type="button" class="ui-btn ui-btn--outline" :disabled="page >= pages || loading" @click="go(page + 1)">Older</button>
        </nav>
      </template>
    </div>

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
.activity-page { max-width: 1000px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 65ch; font-size: 0.9375rem; color: var(--text-quiet); }
.empty { margin: 0; padding: 24px; text-align: center; color: var(--text-quiet); background: var(--bg-panel); border: 1px dashed var(--border-color); border-radius: 12px; }
.skeleton { height: 240px; border-radius: 12px; background: var(--bg-panel); border: 1px solid var(--border-color); }
.meta { font-size: 0.875rem; color: var(--text-quiet); }

/* Needs a look */
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.section-title { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.0625rem; font-weight: 600; color: var(--text-primary); }
.count { font-size: 0.75rem; font-weight: 700; min-width: 22px; padding: 2px 7px; text-align: center; border-radius: 999px; background: var(--error, #dc2626); color: #fff; }
.flag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.flag { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; padding: 14px 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-left-width: 4px; border-radius: 12px; }
.flag.high { border-left-color: var(--error, #dc2626); }
.flag.medium { border-left-color: var(--warning, #b45309); }
.flag.low { border-left-color: var(--border-color); }
.sev { flex: none; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--hover-bg); color: var(--text-quiet); }
.sev.high { background: rgba(220, 38, 38, 0.12); color: var(--error, #dc2626); }
.sev.medium { background: var(--warning-bg, rgba(245, 158, 11, 0.12)); color: var(--warning, #b45309); }
.flag-body { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
.flag-title { font-weight: 600; color: var(--text-primary); }
.flag-text { color: var(--text-primary); font-size: 0.9375rem; }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Filters */
.filters { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); padding: 6px 12px; border-radius: 999px; font-size: 0.875rem; cursor: pointer; }
.chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
.filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; }
.filter-row .ui-field { margin: 0; }
.check { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-primary); grid-column: 1 / -1; }
.clear { align-self: flex-start; }

/* Log */
.total { margin: 0; font-size: 0.875rem; color: var(--text-quiet); }
.log { list-style: none; margin: 0; padding: 0; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.log[aria-busy='true'] { opacity: 0.6; }
.entry { display: grid; grid-template-columns: 96px 1fr minmax(120px, 200px); gap: 16px; padding: 12px 16px; border-top: 1px solid var(--border-color); }
.entry:first-child { border-top: 0; }
.when { display: flex; flex-direction: column; font-size: 0.8125rem; color: var(--text-quiet); }
.hour { font-variant-numeric: tabular-nums; color: var(--text-primary); font-weight: 500; }
.what { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.label { color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
.entry.refused .label { color: var(--error, #dc2626); }
.where { display: flex; flex-direction: column; font-size: 0.8125rem; color: var(--text-quiet); text-align: right; overflow-wrap: anywhere; }
.ip { font-variant-numeric: tabular-nums; }
.pager { display: flex; justify-content: center; align-items: center; gap: 16px; color: var(--text-quiet); font-size: 0.875rem; }

@media (max-width: 640px) {
  .entry { grid-template-columns: 1fr; gap: 4px; }
  .when { flex-direction: row; gap: 6px; }
  .where { text-align: left; flex-direction: row; gap: 8px; }
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
