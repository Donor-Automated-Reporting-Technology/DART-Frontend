<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Tablets', href: '/settings/tablets', current: true },
    ]"
  >
    <div class="tablets-page">
      <header class="head">
        <div>
          <h1 class="title">Tablets</h1>
          <p class="subtitle">
            Only tablets and phones you authorise here can run the WellReach app. If one is lost or stolen, revoke it:
            it stops syncing, and everything on it is erased the next time it connects.
          </p>
        </div>
        <button type="button" class="ui-btn ui-btn--primary" @click="openAdd">Add a tablet</button>
      </header>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading tablets" />

      <p v-else-if="!loadError && current.length === 0" class="empty">
        No tablets yet. Add the first one, then enter its code on the tablet.
      </p>

      <ul v-else-if="!loadError" class="list">
        <li v-for="d in current" :key="d.id" class="tablet">
          <span class="icon" :class="d.status" aria-hidden="true"><AppIcon name="tablet" :size="20" /></span>
          <span class="who">
            <span class="name">
              {{ d.name }}
              <span class="badge" :class="d.status">{{ d.status === 'active' ? 'Authorised' : 'Waiting for its code' }}</span>
            </span>
            <span class="meta">{{ d.cfs_location_name ?? 'No CFS' }}<template v-if="d.model"> · {{ d.model }}</template><template v-if="d.app_version"> · app {{ d.app_version }}</template></span>
            <span v-if="d.status === 'active'" class="meta">
              {{ d.last_seen_at ? `Last used ${ago(d.last_seen_at)}${d.last_user_name ? ` by ${d.last_user_name}` : ''}` : 'Not used yet' }}
              · set up {{ d.enrolled_at ? date(d.enrolled_at) : '' }}{{ d.enrolled_by_name ? ` by ${d.enrolled_by_name}` : '' }}
            </span>
            <span v-else class="meta">
              {{ codeExpired(d) ? 'The code has expired. Make a new one.' : `Code works until ${time(d.code_expires_at!)}.` }}
            </span>
          </span>
          <span class="controls">
            <button v-if="d.status === 'pending'" type="button" class="ui-btn ui-btn--outline" :disabled="busy[d.id]" @click="newCode(d)">New code</button>
            <button type="button" class="ui-btn ui-btn--text danger" :disabled="busy[d.id]" @click="askRevoke(d)">
              {{ d.status === 'pending' ? 'Cancel' : 'Revoke' }}
            </button>
          </span>
        </li>
      </ul>

      <button v-if="revoked.length && !showRevoked" type="button" class="ui-btn ui-btn--text more" @click="showRevoked = true">
        Revoked tablets ({{ revoked.length }})
      </button>
      <ul v-if="showRevoked" class="list">
        <li v-for="d in revoked" :key="d.id" class="tablet off">
          <span class="icon revoked" aria-hidden="true"><AppIcon name="tablet" :size="20" /></span>
          <span class="who">
            <span class="name">{{ d.name }} <span class="badge revoked">Revoked</span></span>
            <span class="meta">{{ d.cfs_location_name ?? 'No CFS' }}<template v-if="d.model"> · {{ d.model }}</template></span>
            <span class="meta">Revoked {{ d.revoked_at ? date(d.revoked_at) : '' }}{{ d.revoked_by_name ? ` by ${d.revoked_by_name}` : '' }}</span>
          </span>
        </li>
      </ul>
    </div>

    <!-- Add a tablet: name + CFS, then its code -->
    <div v-if="adding" class="overlay" @mousedown.self="closeAdd">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="add-title" @keydown.esc="closeAdd">
        <header class="dialog-head">
          <h2 id="add-title">{{ issued ? 'Enter this code on the tablet' : 'Add a tablet' }}</h2>
          <button type="button" class="close" aria-label="Close" @click="closeAdd"><AppIcon name="x" :size="18" /></button>
        </header>

        <div v-if="issued" class="body">
          <p class="code" aria-live="polite">{{ issued.code }}</p>
          <p class="ui-help center">For <strong>{{ issued.device.name }}</strong>. It works once, for 15 minutes.</p>
          <ol class="steps">
            <li>On the tablet, open WellReach and sign in.</li>
            <li>When it asks "Authorise this tablet", type the code.</li>
          </ol>
          <button type="button" class="ui-btn ui-btn--primary ui-btn--block" @click="closeAdd">Done</button>
        </div>

        <form v-else class="body" @submit.prevent="add">
          <div class="ui-field">
            <label class="ui-label" for="tab-name">Name</label>
            <input id="tab-name" v-model="form.name" class="ui-input" placeholder="e.g. Malakal CFS tablet 1" maxlength="100" autocomplete="off">
            <p class="ui-help">A name you will recognise, e.g. the CFS and a number written on the tablet.</p>
          </div>
          <div class="ui-field">
            <label class="ui-label" for="tab-cfs">CFS where it stays</label>
            <select id="tab-cfs" v-model="form.cfs" class="ui-select">
              <option value="" disabled>Choose a CFS</option>
              <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>
          <p v-if="addError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ addError }}</span></p>
          <button type="submit" class="ui-btn ui-btn--primary ui-btn--block" :disabled="saving || !form.name.trim() || !form.cfs" :aria-busy="saving">
            Get the code
          </button>
        </form>
      </div>
    </div>

    <!-- Revoke: say exactly what happens -->
    <div v-if="revoking" class="overlay" @mousedown.self="revoking = null">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="rev-title" @keydown.esc="revoking = null">
        <header class="dialog-head">
          <h2 id="rev-title">{{ revoking.status === 'pending' ? `Cancel ${revoking.name}?` : `Revoke ${revoking.name}?` }}</h2>
        </header>
        <div class="body">
          <p v-if="revoking.status === 'pending'">Its code stops working. You can add the tablet again later.</p>
          <template v-else>
            <p>The tablet can no longer sync. The next time it connects, it signs out and <strong>everything on it is erased</strong>.</p>
            <p class="ui-help">Records it has not uploaded yet are lost. Use this for a lost or stolen tablet, or one leaving the organisation.</p>
          </template>
          <p v-if="revokeError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ revokeError }}</span></p>
          <div class="actions">
            <button type="button" class="ui-btn ui-btn--outline" @click="revoking = null">Keep it</button>
            <button type="button" class="ui-btn ui-btn--primary danger-fill" :disabled="busy[revoking.id]" @click="revoke">
              {{ revoking.status === 'pending' ? 'Cancel tablet' : 'Revoke tablet' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { beneficiaryApi, type OrgLocation } from '../../services/beneficiaryApi'
import { deviceApi, type Device, type DeviceWithCode } from '../../services/deviceApi'
import { meApi } from '../../services/meApi'

definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin'], permission: 'devices.manage' })

const auth = useAuthStore()
const devices = ref<Device[]>([])
const loading = ref(true)
const loadError = ref('')
const busy = reactive<Record<string, boolean>>({})
const showRevoked = ref(false)

const current = computed(() => devices.value.filter(d => d.status !== 'revoked'))
const revoked = computed(() => devices.value.filter(d => d.status === 'revoked'))

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const codeExpired = (d: Device) => !d.code_expires_at || new Date(d.code_expires_at).getTime() < Date.now()
function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `on ${date(iso)}`
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    devices.value = await deviceApi.list()
  } catch (e: any) {
    loadError.value = e?.status === 403 ? "You don't have access to manage tablets." : 'Could not load the tablets. Please try again.'
  } finally {
    loading.value = false
  }
}

// ── Add ────────────────────────────────────────────────────────────────────
const adding = ref(false)
const saving = ref(false)
const addError = ref('')
const issued = ref<DeviceWithCode | null>(null)
const form = reactive({ name: '', cfs: '' })
const locations = ref<OrgLocation[]>([])

async function openAdd() {
  adding.value = true
  issued.value = null
  addError.value = ''
  form.name = ''
  form.cfs = ''
  if (!locations.value.length) {
    // Roles that see only their CFS add tablets only for those CFS.
    const ownOnly = !!auth.orgRole && auth.orgRole.scope !== 'organisation'
    const [all, me] = await Promise.all([beneficiaryApi.listLocations(), ownOnly ? meApi.get() : null])
    const mine = me ? new Set(me.locations.map(l => l.id)) : null
    locations.value = mine ? all.filter(l => mine.has(l.id)) : all
  }
  if (locations.value.length === 1) form.cfs = locations.value[0]!.id
}

async function add() {
  saving.value = true
  addError.value = ''
  try {
    issued.value = await deviceApi.add(form.name.trim(), form.cfs)
    await load()
  } catch (e: any) {
    addError.value = e?.status === 403 ? "You can't add tablets for this CFS." : 'Could not add the tablet. Please try again.'
  } finally {
    saving.value = false
  }
}

function closeAdd() {
  adding.value = false
  issued.value = null
}

async function newCode(d: Device) {
  busy[d.id] = true
  try {
    issued.value = await deviceApi.newCode(d.id)
    adding.value = true
    await load()
  } catch {
    loadError.value = 'Could not make a new code. Please try again.'
  } finally {
    busy[d.id] = false
  }
}

// ── Revoke ─────────────────────────────────────────────────────────────────
const revoking = ref<Device | null>(null)
const revokeError = ref('')

function askRevoke(d: Device) {
  revokeError.value = ''
  revoking.value = d
}

async function revoke() {
  const d = revoking.value
  if (!d) return
  busy[d.id] = true
  revokeError.value = ''
  try {
    await deviceApi.revoke(d.id)
    revoking.value = null
    await load()
  } catch {
    revokeError.value = 'Could not revoke the tablet. Please try again.'
  } finally {
    busy[d.id] = false
  }
}

onMounted(load)
</script>

<style scoped>
.tablets-page { max-width: 900px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 60ch; font-size: 0.9375rem; color: var(--text-quiet); }
.empty { margin: 0; padding: 24px; text-align: center; color: var(--text-quiet); background: var(--bg-panel); border: 1px dashed var(--border-color); border-radius: 12px; }
.card.skeleton { height: 88px; border-radius: 12px; background: var(--bg-panel); border: 1px solid var(--border-color); }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.tablet { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px 20px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; }
.tablet.off { opacity: 0.75; }
.icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: var(--primary-soft, rgba(13, 128, 111, 0.1)); color: var(--primary); flex: none; }
.icon.pending { background: var(--warning-bg, rgba(245, 158, 11, 0.12)); color: var(--warning, #b45309); }
.icon.revoked { background: var(--hover-bg); color: var(--text-quiet); }
.who { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.meta { font-size: 0.875rem; color: var(--text-quiet); }
.badge { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--primary-soft, rgba(13, 128, 111, 0.1)); color: var(--primary); }
.badge.pending { background: var(--warning-bg, rgba(245, 158, 11, 0.12)); color: var(--warning, #b45309); }
.badge.revoked { background: var(--hover-bg); color: var(--text-quiet); }
.controls { display: flex; gap: 8px; align-items: center; }
.danger { color: var(--error, #dc2626); }
.more { align-self: center; }

.overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 42, 0.45); }
.dialog { width: 100%; max-width: 460px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
.dialog-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 20px 0; }
.dialog-head h2 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }
.close { border: 0; background: none; color: var(--text-quiet); cursor: pointer; padding: 4px; border-radius: 6px; }
.body { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
.body p { margin: 0; }
.code { font-size: 2.25rem; font-weight: 700; letter-spacing: 0.12em; text-align: center; font-variant-numeric: tabular-nums; color: var(--text-primary); padding: 16px; background: var(--hover-bg); border-radius: 12px; }
.center { text-align: center; }
.steps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; color: var(--text-primary); }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.danger-fill { background: var(--error, #dc2626); border-color: var(--error, #dc2626); }
</style>
