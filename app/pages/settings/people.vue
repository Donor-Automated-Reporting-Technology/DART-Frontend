<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'People', href: '/settings/people', current: true },
    ]"
  >
    <div class="people-page">
      <header class="head">
        <div>
          <h1 class="title">People</h1>
          <p class="subtitle">
            {{ scope === 'organisation' ? 'Everyone in your organisation' : 'People at the CFS you work with' }}, their role and whether they can sign in.
            <template v-if="canManage">You can change people ranked below you.</template>
          </p>
        </div>
        <button v-if="canManage" type="button" class="ui-btn ui-btn--primary" @click="showInvite = true">Add staff</button>
      </header>

      <p v-if="loadError" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ loadError }}</span></p>

      <div v-if="!loadError" class="ui-field search">
        <label class="ui-label" for="pp-search">Find someone</label>
        <input id="pp-search" v-model="query" class="ui-input" type="search" placeholder="Name, email, role or CFS" autocomplete="off">
      </div>

      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading people" />

      <p v-else-if="!loadError && filtered.length === 0" class="empty">No one matches “{{ query }}”.</p>

      <ul v-else-if="!loadError" class="people">
        <li v-for="u in filtered" :key="u.id" class="person" :class="{ inactive: !u.is_active }">
          <span class="avatar" aria-hidden="true">{{ initials(u.full_name) }}</span>
          <span class="who">
            <span class="name">{{ u.full_name }}<span v-if="u.id === auth.userId" class="tag">You</span><span v-if="!u.is_active" class="tag">Deactivated</span></span>
            <span class="meta">{{ u.email ?? u.phone ?? '' }}<template v-if="u.location_name"> · {{ u.location_name }}</template></span>
            <span class="meta">{{ u.last_login_at ? `Last signed in ${formatDate(u.last_login_at)}` : 'Has not signed in yet' }}</span>
          </span>

          <span class="controls">
            <template v-if="manageable(u)">
              <label class="visually-hidden" :for="`role-${u.id}`">Role for {{ u.full_name }}</label>
              <select :id="`role-${u.id}`" :key="`${u.id}-${rev[u.id] ?? 0}`" class="ui-select role-select" :value="u.role_id ?? ''" :disabled="busy[u.id]"
                :aria-describedby="`status-${u.id}`" @change="changeRole(u, ($event.target as HTMLSelectElement).value)">
                <option v-if="!u.role_id" value="" disabled>No role</option>
                <option v-for="r in assignable" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
              <button type="button" class="ui-btn ui-btn--outline" :disabled="busy[u.id]" @click="toggleActive(u)">
                {{ u.is_active ? 'Deactivate' : 'Reactivate' }}
              </button>
              <button v-if="u.is_active && u.email" type="button" class="ui-btn ui-btn--text" :disabled="busy[u.id]" @click="sendPassword(u)">
                Send new password
              </button>
            </template>
            <span v-else class="role-pill">{{ u.role_name ?? 'No role' }}</span>
            <span :id="`status-${u.id}`" class="row-status" :class="{ err: rowError[u.id] }" aria-live="polite">{{ rowError[u.id] || rowNote[u.id] || '' }}</span>
            <span v-if="tempShown[u.id]" class="temp-pass">Email couldn't be sent. Temporary password (shown once): <code>{{ tempShown[u.id] }}</code></span>
          </span>
        </li>
      </ul>

      <InviteStaffDialog v-if="showInvite" @close="showInvite = false" @created="onInvited" />

      <p v-if="canManage && !loading && !loadError" class="ui-help">
        Changing someone's role or deactivating them signs them out, so the change applies straight away.
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { accessApi, type OrgRole, type OrgUser, type Scope } from '../../services/accessApi'
import { ApiError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import InviteStaffDialog from '../../components/people/InviteStaffDialog.vue'
import type { InviteResult } from '../../services/accessApi'

definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin', 'program_manager'], permission: 'people.view' })
useHead({ title: 'People · WellReach' })

const auth = useAuthStore()
const users = ref<OrgUser[]>([])
const roles = ref<OrgRole[]>([])
const canManage = ref(false)
const myLevel = ref(0)
const scope = ref<Scope>('organisation')
const loading = ref(true)
const loadError = ref('')
const query = ref('')
const busy = reactive<Record<string, boolean>>({})
const rowNote = reactive<Record<string, string>>({})
const rowError = reactive<Record<string, string>>({})
// Bumped to re-render a row's select back to the saved role after an error.
const rev = reactive<Record<string, number>>({})
const tempShown = reactive<Record<string, string>>({})
const showInvite = ref(false)

function onInvited(res: InviteResult) {
  users.value = [res.user, ...users.value.filter(u => u.id !== res.user.id)]
}

async function sendPassword(u: OrgUser) {
  busy[u.id] = true
  rowError[u.id] = ''
  rowNote[u.id] = 'Sending…'
  delete tempShown[u.id]
  try {
    const res = await accessApi.resetPassword(u.id)
    rowNote[u.id] = res.email_sent ? `New password emailed to ${u.email}` : ''
    if (!res.email_sent && res.temporary_password) tempShown[u.id] = res.temporary_password
  } catch (e) {
    rowNote[u.id] = ''
    rowError[u.id] = errorText(e)
  } finally {
    busy[u.id] = false
  }
}

const assignable = computed(() => roles.value.filter(r => r.level < myLevel.value))
const manageable = (u: OrgUser) => canManage.value && u.id !== auth.userId && (u.role_level ?? 0) < myLevel.value

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    [u.full_name, u.email, u.phone, u.role_name, u.location_name].some(v => v?.toLowerCase().includes(q)),
  )
})

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function replaceUser(updated: OrgUser) {
  const i = users.value.findIndex(x => x.id === updated.id)
  if (i >= 0) users.value[i] = updated
}

function errorText(e: unknown) {
  if (e instanceof ApiError) return e.data?.errors?.role_id ?? e.message
  return 'Connection failed — try again.'
}

async function changeRole(u: OrgUser, roleId: string) {
  if (!roleId || roleId === u.role_id) return
  busy[u.id] = true
  rowError[u.id] = ''
  rowNote[u.id] = 'Saving…'
  try {
    const updated = await accessApi.setUserRole(u.id, roleId)
    replaceUser(updated)
    rowNote[u.id] = `Now ${updated.role_name}`
  } catch (e) {
    rowNote[u.id] = ''
    rowError[u.id] = errorText(e)
    rev[u.id] = (rev[u.id] ?? 0) + 1
  } finally {
    busy[u.id] = false
  }
}

async function toggleActive(u: OrgUser) {
  busy[u.id] = true
  rowError[u.id] = ''
  rowNote[u.id] = ''
  try {
    const updated = await accessApi.setUserActive(u.id, !u.is_active)
    replaceUser(updated)
    rowNote[u.id] = updated.is_active ? 'Can sign in again' : 'Deactivated and signed out'
  } catch (e) {
    rowError[u.id] = errorText(e)
  } finally {
    busy[u.id] = false
  }
}

onMounted(async () => {
  try {
    const [people, roleData] = await Promise.all([accessApi.users(), accessApi.roles()])
    users.value = people.users
    canManage.value = people.can_manage
    myLevel.value = people.my_level
    scope.value = people.scope
    roles.value = roleData.roles
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 403 ? 'Your role cannot see people.' : 'Could not load people. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.people-page { max-width: 900px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; max-width: 64ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-quiet); }
.search { max-width: 400px; }
.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.skeleton { height: 280px; opacity: 0.6; }
.empty { margin: 0; color: var(--text-quiet); }

.people { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.person { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px 20px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; }
.person.inactive .name, .person.inactive .avatar { opacity: 0.75; }
.avatar { width: 40px; height: 40px; flex: none; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--link); font-size: 0.875rem; }
.who { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 0.9375rem; color: var(--text-primary); }
.meta { font-size: 0.8125rem; color: var(--text-secondary); overflow-wrap: anywhere; }
.tag { margin-left: 8px; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; border: 1px solid var(--border-color); color: var(--text-secondary); }
.controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.role-select { width: 220px; min-height: 40px; }
.controls .ui-btn { min-height: 40px; padding: 0 16px; }
.role-pill { padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border-color); font-size: 0.875rem; color: var(--text-primary); }
.row-status { flex-basis: 100%; text-align: right; font-size: 0.8125rem; color: var(--text-secondary); min-height: 0; }
.row-status:empty { display: none; }
.row-status.err { color: var(--error-text); }
.temp-pass { flex-basis: 100%; text-align: right; font-size: 0.8125rem; color: var(--text-primary); }
.temp-pass code { font-size: 0.9375rem; letter-spacing: 0.05em; }

@media (max-width: 640px) {
  .controls { width: 100%; justify-content: stretch; }
  .role-select { flex: 1; width: auto; }
  .row-status { text-align: left; }
}
</style>
