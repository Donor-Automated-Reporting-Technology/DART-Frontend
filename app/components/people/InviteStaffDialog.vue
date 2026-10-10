<template>
  <!-- Add a staff member: details → role → CFS (by the role's data scope).
       The server generates a temporary password and emails it. -->
  <div class="overlay" @mousedown.self="close">
    <div ref="dialogEl" class="dialog" role="dialog" aria-modal="true" aria-labelledby="inv-title" @keydown.esc="close">
      <header class="dialog-head">
        <div>
          <h2 id="inv-title" tabindex="-1">{{ result ? 'Staff member added' : 'Add staff member' }}</h2>
          <p v-if="!result" class="step-label" aria-live="polite">Step {{ step }} of {{ totalSteps }} · {{ stepTitle }}</p>
        </div>
        <button type="button" class="close" aria-label="Close" @click="close">
          <AppIcon name="x" :size="18" />
        </button>
      </header>
      <div v-if="!result" class="track" aria-hidden="true">
        <span v-for="n in totalSteps" :key="n" class="seg" :class="{ on: n <= step }" />
      </div>

      <!-- ── Result ──────────────────────────────────────────────── -->
      <div v-if="result" class="body">
        <div class="done-icon" aria-hidden="true"><AppIcon name="check" :size="22" /></div>
        <p class="done-title">{{ result.user.full_name }} is now {{ article(result.user.role_name ?? 'a team member') }}.</p>
        <template v-if="result.email_sent">
          <p class="done-text">
            We've emailed <strong>{{ result.user.email }}</strong> their sign-in details and a temporary password.
            They'll choose their own password the first time they sign in.
          </p>
        </template>
        <template v-else>
          <p class="ui-alert warn" role="status">
            <AppIcon name="alert-circle" :size="16" />
            <span>The invitation email couldn't be sent. Share this temporary password with them directly — it's shown only once.</span>
          </p>
          <div class="temp">
            <span class="temp-label">Temporary password</span>
            <code class="temp-value">{{ result.temporary_password }}</code>
            <button type="button" class="ui-btn ui-btn--outline" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
          </div>
          <p class="done-text">They sign in with <strong>{{ result.user.email }}</strong> and will be asked to choose their own password.</p>
        </template>
      </div>

      <!-- ── Form ─────────────────────────────────────────────────── -->
      <form v-else class="body ui-form" novalidate @submit.prevent="next">
        <!-- Step 1: details -->
        <template v-if="step === 1">
          <div class="ui-field">
            <label class="ui-label" for="inv-name">Full name</label>
            <input id="inv-name" v-model="form.full_name" class="ui-input" name="full_name" autocomplete="off" placeholder="e.g. Akol Deng" maxlength="255"
              :aria-invalid="errs.full_name ? 'true' : undefined" :aria-describedby="errs.full_name ? 'inv-name-error' : undefined">
            <FieldError id="inv-name-error" :message="errs.full_name" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="inv-email">Work email</label>
            <input id="inv-email" v-model="form.email" class="ui-input" type="email" name="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false"
              placeholder="name@organisation.org" :aria-invalid="errs.email ? 'true' : undefined" aria-describedby="inv-email-help inv-email-error">
            <p id="inv-email-help" class="ui-help">We'll send their sign-in details and a temporary password here.</p>
            <FieldError id="inv-email-error" :message="errs.email" />
          </div>
        </template>

        <!-- Step 2: role -->
        <fieldset v-else-if="step === 2" class="roles" :aria-describedby="errs.role_id ? 'inv-role-error' : undefined">
          <legend class="ui-label">Role</legend>
          <p v-if="loadingRoles" class="ui-help">Loading roles…</p>
          <label v-for="r in assignableRoles" :key="r.id" class="role-option" :class="{ on: form.role_id === r.id }">
            <input v-model="form.role_id" type="radio" name="role" :value="r.id">
            <span class="role-text">
              <span class="role-name">{{ r.name }}</span>
              <span class="ui-help">{{ r.description || '' }}{{ r.description ? ' · ' : '' }}{{ scopeShort(r.scope) }}</span>
            </span>
          </label>
          <p v-if="!loadingRoles && !assignableRoles.length" class="ui-help">There are no roles below yours yet. An admin can add them in Settings → Roles & permissions.</p>
          <FieldError id="inv-role-error" :message="errs.role_id" />
        </fieldset>

        <!-- Step 3: CFS -->
        <fieldset v-else class="locs" :aria-describedby="'inv-loc-help' + (errs.cfs_location_ids ? ' inv-loc-error' : '')">
          <legend class="ui-label">{{ locLegend }}</legend>
          <p id="inv-loc-help" class="ui-help">{{ locHelp }}</p>
          <p v-if="loadingLocs" class="ui-help">Loading CFS…</p>
          <p v-else-if="!locations.length" class="ui-help">{{ ownCfsOnly ? 'You are not assigned to a CFS yet. Ask an admin to assign you.' : 'No CFS yet. Add them in Settings → Locations.' }}</p>
          <div v-if="locations.length > 6" class="ui-field">
            <label class="visually-hidden" for="inv-loc-search">Find a CFS</label>
            <input id="inv-loc-search" v-model="locQuery" class="ui-input" type="search" placeholder="Find a CFS" autocomplete="off">
          </div>
          <div class="loc-list">
            <label v-for="l in shownLocations" :key="l.id" class="loc-option">
              <input v-if="multiLoc" v-model="form.cfs_location_ids" type="checkbox" :value="l.id">
              <input v-else type="radio" name="cfs" :value="l.id" :checked="form.cfs_location_ids[0] === l.id" @change="form.cfs_location_ids = [l.id]">
              <span>{{ l.name }}<span v-if="l.geographic_area" class="ui-help"> · {{ l.geographic_area }}</span></span>
            </label>
          </div>
          <p v-if="multiLoc && form.cfs_location_ids.length" class="ui-help">{{ form.cfs_location_ids.length }} selected</p>
          <p v-if="scope === 'supervised_locations' && form.cfs_location_ids.length > 1" class="ui-help">
            We advise one CFS per supervisor, so each CFS has someone who is there every day. More than one still works.
          </p>
          <FieldError id="inv-loc-error" :message="errs.cfs_location_ids" />
        </fieldset>

        <p v-if="alert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ alert }}</span></p>

        <div class="actions">
          <button v-if="step > 1" type="button" class="ui-btn ui-btn--outline" :disabled="saving" @click="back">Back</button>
          <span class="spacer" />
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || (step === 2 && loadingRoles)" :aria-busy="saving ? 'true' : undefined">
            <template v-if="saving"><span class="ui-spinner" aria-hidden="true" />Adding…</template>
            <template v-else>{{ step < totalSteps ? 'Continue' : 'Add and send invitation' }}</template>
          </button>
        </div>
      </form>

      <footer v-if="result" class="actions result-actions">
        <button type="button" class="ui-btn ui-btn--outline" @click="reset">Add another</button>
        <span class="spacer" />
        <button type="button" class="ui-btn ui-btn--primary" @click="close">Done</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { accessApi, type InviteResult, type OrgRole, type Scope } from '../../services/accessApi'
import { beneficiaryApi, type OrgLocation } from '../../services/beneficiaryApi'
import { meApi } from '../../services/meApi'
import { ApiError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import FieldError from '../interfaces/FieldError.vue'

const emit = defineEmits<{ close: []; created: [result: InviteResult] }>()

const auth = useAuthStore()
const dialogEl = ref<HTMLElement | null>(null)
const step = ref(1)
const form = reactive({ full_name: '', email: '', role_id: '', cfs_location_ids: [] as string[] })
const errs = reactive<Record<string, string>>({})
const alert = ref('')
const saving = ref(false)
const result = ref<InviteResult | null>(null)
const copied = ref(false)

const roles = ref<OrgRole[]>([])
const loadingRoles = ref(true)
const locations = ref<OrgLocation[]>([])
const loadingLocs = ref(true)
const locQuery = ref('')

const myLevel = computed(() => auth.orgRole?.level ?? 100)
// Supervisors (and any role that is not organisation-wide) can only add
// people to the CFS they work with, so only those CFS are offered.
const ownCfsOnly = computed(() => !!auth.orgRole && auth.orgRole.scope !== 'organisation')
const assignableRoles = computed(() => roles.value.filter(r => r.level < myLevel.value))
const role = computed(() => roles.value.find(r => r.id === form.role_id))
const scope = computed<Scope | undefined>(() => role.value?.scope)
const multiLoc = computed(() => scope.value !== 'own_location')
// Organisation-wide roles see every CFS, so no CFS step.
const totalSteps = computed(() => (scope.value === 'organisation' ? 2 : 3))
const stepTitle = computed(() => ['Details', 'Role', 'CFS'][step.value - 1])

const locLegend = computed(() => (scope.value === 'supervised_locations' ? 'CFS they supervise' : 'CFS they work at'))
const locHelp = computed(() =>
  scope.value === 'supervised_locations'
    ? `Choose every CFS this ${role.value?.name ?? 'person'} oversees. They'll see the staff and programmes there.`
    : `Choose the one CFS where this ${role.value?.name ?? 'person'} works.`,
)
const shownLocations = computed(() => {
  const q = locQuery.value.trim().toLowerCase()
  return q ? locations.value.filter(l => l.name.toLowerCase().includes(q)) : locations.value
})

const scopeShort = (s: Scope) =>
  ({ own_location: 'Works at one CFS', supervised_locations: 'Supervises one or more CFS', organisation: 'Sees the whole organisation' })[s]
const article = (name: string) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`)

function clear() { Object.keys(errs).forEach(k => delete errs[k]); alert.value = '' }
function focusFirst() {
  nextTick(() => dialogEl.value?.querySelector<HTMLElement>('.body input:not([type=hidden]), .body button, #inv-title')?.focus())
}

function validate(): boolean {
  clear()
  if (step.value === 1) {
    if (form.full_name.trim().length < 2) errs.full_name = 'Enter their full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address'
  } else if (step.value === 2) {
    if (!form.role_id) errs.role_id = 'Choose a role'
  } else if (step.value === 3) {
    if (scope.value === 'own_location' && form.cfs_location_ids.length !== 1) errs.cfs_location_ids = 'Choose the CFS this person works at'
    if (scope.value === 'supervised_locations' && !form.cfs_location_ids.length) errs.cfs_location_ids = 'Choose at least one CFS to supervise'
  }
  return Object.keys(errs).length === 0
}

async function next() {
  if (!validate()) {
    nextTick(() => dialogEl.value?.querySelector<HTMLElement>('[aria-invalid="true"], .roles input, .locs input')?.focus())
    return
  }
  if (step.value === 2) {
    // Keep only what fits the chosen role: one CFS, several, or none.
    if (scope.value === 'own_location') form.cfs_location_ids = form.cfs_location_ids.slice(0, 1)
    if (scope.value === 'organisation') form.cfs_location_ids = []
  }
  if (step.value < totalSteps.value) {
    step.value++
    focusFirst()
    return
  }
  await submit()
}

function back() {
  clear()
  step.value--
  focusFirst()
}

const STEP_OF: Record<string, number> = { full_name: 1, email: 1, role_id: 2, cfs_location_ids: 3 }

async function submit() {
  saving.value = true
  try {
    result.value = await accessApi.invite({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      role_id: form.role_id,
      cfs_location_ids: form.cfs_location_ids,
    })
    emit('created', result.value)
    nextTick(() => dialogEl.value?.querySelector<HTMLElement>('#inv-title')?.focus())
  } catch (e) {
    if (e instanceof ApiError && e.data?.errors) {
      Object.assign(errs, e.data.errors)
      const first = Object.keys(e.data.errors).map(k => STEP_OF[k] ?? 1).sort()[0]
      if (first) step.value = first
      focusFirst()
    } else {
      alert.value = e instanceof ApiError ? e.message : 'Connection failed — check your internet connection and try again.'
    }
  } finally {
    saving.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(result.value?.temporary_password ?? '')
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* clipboard blocked: the password is on screen to copy by hand */ }
}

function reset() {
  Object.assign(form, { full_name: '', email: '', role_id: '', cfs_location_ids: [] })
  result.value = null
  step.value = 1
  clear()
  focusFirst()
}

function close() {
  if (!saving.value) emit('close')
}

onMounted(async () => {
  focusFirst()
  accessApi.roles().then(d => { roles.value = d.roles }).catch(() => { alert.value = 'Could not load roles.' }).finally(() => { loadingRoles.value = false })
  try {
    const [all, me] = await Promise.all([beneficiaryApi.listLocations(), ownCfsOnly.value ? meApi.get() : null])
    const mine = me ? new Set(me.locations.map(l => l.id)) : null
    locations.value = mine ? all.filter(l => mine.has(l.id)) : all
  } catch {
    // The CFS step shows its empty message.
  } finally {
    loadingLocs.value = false
  }
})
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 48px 16px; overflow-y: auto;
  background: rgba(0, 0, 0, 0.45);
}
.dialog {
  width: 100%; max-width: 520px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}
.dialog-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 24px 24px 16px; }
.dialog-head h2 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
.dialog-head h2:focus { outline: none; }
.step-label { margin: 4px 0 0; font-size: 0.8125rem; color: var(--text-secondary); }
.close { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 10px; background: none; color: var(--text-secondary); cursor: pointer; transition: color 0.15s ease, background-color 0.15s ease; }
.close:hover { color: var(--text-primary); background: var(--hover-bg); }
.close:focus-visible { outline: 2px solid var(--primary); }
.track { display: grid; grid-auto-flow: column; gap: 8px; padding: 0 24px; }
.seg { height: 4px; border-radius: 999px; background: var(--border-color); transition: background-color 0.15s ease; }
.seg.on { background: var(--primary); }
.body { padding: 24px; }

.roles, .locs { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.roles legend, .locs legend { padding: 0; margin-bottom: 8px; }
.role-option {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; border: 1px solid var(--input-border-hover); border-radius: 10px; cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.role-option:hover { border-color: var(--primary); }
.role-option.on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, transparent); }
.role-option input { margin-top: 2px; }
.role-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.role-name { font-size: 0.9375rem; color: var(--text-primary); }
.loc-list { max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 10px; }
.loc-option { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 8px 16px; cursor: pointer; font-size: 0.9375rem; color: var(--text-primary); }
.loc-option + .loc-option { border-top: 1px solid var(--border-color); }
.loc-option:hover { background: var(--hover-bg); }

.actions { display: flex; align-items: center; gap: 8px; padding-top: 8px; }
.result-actions { padding: 0 24px 24px; }
.spacer { flex: 1; }

.done-icon { width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--link); }
.done-title { margin: 16px 0 8px; font-size: 1rem; color: var(--text-primary); }
.done-text { margin: 0 0 16px; font-size: 0.9375rem; line-height: 1.6; color: var(--text-secondary); }
.done-text strong { font-weight: 400; color: var(--text-primary); }
.warn { margin-bottom: 16px; }
.temp { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px; margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: 10px; }
.temp-label { flex-basis: 100%; font-size: 0.8125rem; color: var(--text-secondary); }
.temp-value { flex: 1; font-size: 1.125rem; letter-spacing: 0.05em; color: var(--text-primary); }
.temp .ui-btn { min-height: 40px; }

@media (max-width: 520px) {
  .overlay { padding: 0; align-items: stretch; }
  .dialog { border-radius: 0; min-height: 100%; }
  .actions .ui-btn--primary { flex: 1; }
}
</style>
