<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'People', href: '/settings/people' },
      { title: user?.full_name ?? 'Profile', href: `/settings/people/${id}`, current: true },
    ]"
  >
    <div class="profile">
      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading profile" />

      <p v-else-if="loadError" class="ui-alert" role="alert">
        <AppIcon name="alert-circle" :size="16" />
        <span>{{ loadError }}</span>
      </p>

      <template v-else-if="user">
        <header class="head">
          <h1 class="title">{{ user.full_name }}</h1>
          <p class="subtitle">
            {{ user.role_name ?? 'No role' }}<template v-if="user.locations.length"> · {{ locationNames }}</template>
          </p>
        </header>

        <!-- Who they are (read-only) -->
        <section class="card summary" aria-labelledby="sum-h">
          <h2 id="sum-h" class="visually-hidden">Summary</h2>
          <div class="avatar" aria-hidden="true">{{ initials }}</div>
          <dl class="facts">
            <div><dt>Role</dt><dd>{{ user.role_name ?? '—' }}</dd></div>
            <div><dt>CFS</dt><dd>{{ locationNames || 'None assigned' }}</dd></div>
            <div><dt>Account</dt><dd>{{ user.is_active ? 'Active' : 'Deactivated' }}</dd></div>
            <div><dt>Last signed in</dt><dd>{{ user.last_login_at ? formatDate(user.last_login_at) : 'Not yet' }}</dd></div>
            <div v-if="user.must_change_password"><dt>Password</dt><dd>Temporary — they choose their own at next sign-in</dd></div>
          </dl>
          <p v-if="!profile?.can_edit" class="ui-help note">
            {{ isSelf ? 'This is you. Change your own details in My account.' : 'You can view this person but not change them.' }}
          </p>
        </section>

        <!-- Details -->
        <form v-if="profile?.can_edit" class="card ui-form" novalidate aria-labelledby="dt-h" @submit.prevent="saveDetails">
          <div class="ui-section-head">
            <h2 id="dt-h">Details</h2>
            <p>The name shown on sessions and reports, and how to reach them.</p>
          </div>

          <p v-if="detailsAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ detailsAlert }}</span></p>

          <div class="ui-field">
            <label class="ui-label" for="sp-name">Full name</label>
            <input
              id="sp-name" v-model="form.full_name" class="ui-input" type="text" autocomplete="off" maxlength="255"
              :aria-invalid="errs.full_name ? 'true' : undefined" :aria-describedby="errs.full_name ? 'sp-name-error' : undefined"
            >
            <FieldError id="sp-name-error" :message="errs.full_name" />
          </div>

          <div class="ui-field">
            <label class="ui-label" for="sp-phone">Phone <span class="ui-optional">(optional)</span></label>
            <input
              id="sp-phone" v-model="form.phone" class="ui-input" type="tel" inputmode="tel" autocomplete="off" maxlength="40"
              placeholder="e.g. +211 912 345 678"
              :aria-invalid="errs.phone ? 'true' : undefined" :aria-describedby="errs.phone ? 'sp-phone-error' : undefined"
            >
            <FieldError id="sp-phone-error" :message="errs.phone" />
          </div>

          <div class="ui-field">
            <label class="ui-label" for="sp-email">Sign-in email</label>
            <input
              id="sp-email" v-model="form.email" class="ui-input" type="email" inputmode="email" autocomplete="off" maxlength="255"
              :disabled="!profile.can_recover"
              :aria-invalid="errs.email ? 'true' : undefined"
              :aria-describedby="errs.email ? 'sp-email-error sp-email-help' : 'sp-email-help'"
            >
            <p id="sp-email-help" class="ui-help">
              {{ profile.can_recover
                ? 'Changing this changes what they sign in with, and signs them out everywhere.'
                : 'Your role cannot change sign-in emails. Ask an admin.' }}
            </p>
            <FieldError id="sp-email-error" :message="errs.email" />
          </div>

          <div class="actions">
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving ? 'true' : undefined">
              {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save details' }}
            </button>
          </div>
        </form>

        <!-- Password -->
        <section v-if="profile?.can_edit" class="card ui-form" aria-labelledby="pw-h">
          <div class="ui-section-head">
            <h2 id="pw-h">Password</h2>
            <p>If they forgot their password or cannot sign in. Their current password stops working and they are signed out.</p>
          </div>

          <p v-if="pwAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ pwAlert }}</span></p>

          <div class="choices">
            <div class="choice">
              <div>
                <p class="choice-title">Email a new temporary password</p>
                <p class="ui-help">{{ user.email ? `Sent to ${user.email}.` : 'This person has no email address.' }}</p>
              </div>
              <button type="button" class="ui-btn ui-btn--outline" :disabled="pwBusy || !user.email || !user.is_active" @click="resetPassword(false)">
                Email new password
              </button>
            </div>

            <div v-if="profile.can_recover" class="choice">
              <div>
                <p class="choice-title">Show a temporary password here</p>
                <p class="ui-help">For someone who cannot reach their email. Nothing is emailed; you give it to them in person or by phone.</p>
              </div>
              <button type="button" class="ui-btn ui-btn--outline" :disabled="pwBusy || !user.is_active" @click="resetPassword(true)">
                Show temporary password
              </button>
            </div>
          </div>

          <p v-if="!user.is_active" class="ui-help">Reactivate the account before issuing a password.</p>

          <div v-if="tempPassword" class="temp" role="status">
            <p class="choice-title">Temporary password (shown once)</p>
            <code class="temp-code">{{ tempPassword }}</code>
            <div class="temp-actions">
              <button type="button" class="ui-btn ui-btn--outline" @click="copyTemp">{{ copied ? 'Copied' : 'Copy' }}</button>
              <button type="button" class="ui-btn ui-btn--text" @click="tempPassword = ''">Hide</button>
            </div>
            <p class="ui-help">They sign in with {{ user.email ?? 'their email' }} and this password, then choose their own.</p>
          </div>
          <p v-else-if="pwNote" class="ui-help" role="status">{{ pwNote }}</p>
        </section>

        <!-- Access -->
        <section v-if="profile?.can_edit" class="card ui-form" aria-labelledby="ac-h">
          <div class="ui-section-head">
            <h2 id="ac-h">Access</h2>
            <p>Changing the role or deactivating signs them out, so the change applies straight away.</p>
          </div>

          <p v-if="accessAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ accessAlert }}</span></p>

          <div class="ui-field">
            <label class="ui-label" for="sp-role">Role</label>
            <select
              id="sp-role" :key="roleRev" class="ui-select" :value="user.role_id ?? ''" :disabled="accessBusy"
              @change="changeRole(($event.target as HTMLSelectElement).value)"
            >
              <option v-if="!user.role_id" value="" disabled>No role</option>
              <option v-for="r in assignable" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <p class="ui-help">You can give roles ranked below your own.</p>
          </div>

          <div class="choice">
            <div>
              <p class="choice-title">{{ user.is_active ? 'Deactivate this account' : 'Reactivate this account' }}</p>
              <p class="ui-help">
                {{ user.is_active
                  ? 'They can no longer sign in. Their records and history are kept.'
                  : 'They can sign in again with their email and password.' }}
              </p>
            </div>
            <button type="button" class="ui-btn ui-btn--outline" :disabled="accessBusy" @click="toggleActive">
              {{ user.is_active ? 'Deactivate' : 'Reactivate' }}
            </button>
          </div>
          <p v-if="accessNote" class="ui-help" role="status">{{ accessNote }}</p>
        </section>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { accessApi, type OrgRole, type OrgUser, type UserProfile } from '../../../services/accessApi'
import { ApiError } from '../../../services/api'
import { useAuthStore } from '../../../stores/auth'
import FieldError from '../../../components/interfaces/FieldError.vue'

// Anyone who can see people can open a profile; what they can change comes
// from the API (can_edit / can_recover), which follows their role.
definePageMeta({ layout: false, middleware: ['auth', 'role-guard'], allowedRoles: ['org_admin', 'program_manager', 'supervisor'], permission: 'people.view' })

const route = useRoute()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))

const profile = ref<UserProfile | null>(null)
const user = computed<OrgUser | null>(() => profile.value?.user ?? null)
const roles = ref<OrgRole[]>([])
const loading = ref(true)
const loadError = ref('')

useHead({ title: () => `${user.value?.full_name ?? 'Profile'} · WellReach` })

const isSelf = computed(() => user.value?.id === auth.userId)
const myLevel = computed(() => auth.orgRole?.level ?? 0)
const assignable = computed(() => roles.value.filter(r => r.level < myLevel.value))
const locationNames = computed(() => (user.value?.locations ?? []).map(l => l.name).join(', '))
const initials = computed(() =>
  (user.value?.full_name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?',
)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// ── Details ──────────────────────────────────────────────────────────────────
const form = reactive({ full_name: '', email: '', phone: '' })
const errs = reactive<Record<string, string>>({})
const detailsAlert = ref('')
const saving = ref(false)
const saved = ref(false)

function apply(p: UserProfile) {
  profile.value = p
  form.full_name = p.user.full_name
  form.email = p.user.email ?? ''
  form.phone = p.user.phone ?? ''
}

/** Keeps what the caller may do, and swaps in the updated person. */
function setUser(updated: OrgUser) {
  if (profile.value) profile.value = { ...profile.value, user: updated }
}

function message(e: unknown) {
  if (e instanceof ApiError) return e.status === 403 ? 'Your role does not allow this.' : e.message
  return 'Connection failed — try again.'
}

async function saveDetails() {
  Object.keys(errs).forEach(k => delete errs[k])
  detailsAlert.value = ''
  if (form.full_name.trim().length < 2) errs.full_name = 'Enter their full name'
  if (profile.value?.can_recover && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address'
  if (Object.keys(errs).length) return

  saving.value = true
  try {
    apply(await accessApi.updateUser(id.value, { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() }))
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    const fields = e instanceof ApiError ? (e.data?.errors as Record<string, string> | undefined) : undefined
    if (fields && Object.keys(fields).length) Object.assign(errs, fields)
    else detailsAlert.value = message(e)
  } finally {
    saving.value = false
  }
}

// ── Password ─────────────────────────────────────────────────────────────────
const pwBusy = ref(false)
const pwAlert = ref('')
const pwNote = ref('')
const tempPassword = ref('')
const copied = ref(false)

async function resetPassword(show: boolean) {
  if (!user.value) return
  const name = user.value.full_name
  const ok = window.confirm(show
    ? `Set a temporary password for ${name}? Their current password stops working.`
    : `Email ${name} a new temporary password? Their current password stops working.`)
  if (!ok) return

  pwBusy.value = true
  pwAlert.value = ''
  pwNote.value = ''
  tempPassword.value = ''
  copied.value = false
  try {
    const res = await accessApi.resetPassword(id.value, show)
    setUser(res.user)
    if (res.temporary_password) tempPassword.value = res.temporary_password
    else if (res.email_sent) pwNote.value = `New password emailed to ${res.user.email}.`
    else pwAlert.value = 'The email could not be sent. Try again, or ask an admin to show a temporary password.'
  } catch (e) {
    pwAlert.value = message(e)
  } finally {
    pwBusy.value = false
  }
}

async function copyTemp() {
  try {
    await navigator.clipboard.writeText(tempPassword.value)
    copied.value = true
  } catch {
    // Clipboard blocked: the password is on screen to read out.
  }
}

// ── Access ───────────────────────────────────────────────────────────────────
const accessBusy = ref(false)
const accessAlert = ref('')
const accessNote = ref('')
// Bumped to put the role select back on the saved role after an error.
const roleRev = ref(0)

async function changeRole(roleId: string) {
  if (!user.value || !roleId || roleId === user.value.role_id) return
  accessBusy.value = true
  accessAlert.value = ''
  accessNote.value = ''
  try {
    const updated = await accessApi.setUserRole(id.value, roleId)
    setUser(updated)
    accessNote.value = `Now ${updated.role_name}.`
  } catch (e) {
    accessAlert.value = e instanceof ApiError ? (e.data?.errors?.role_id ?? message(e)) : message(e)
    roleRev.value += 1
  } finally {
    accessBusy.value = false
  }
}

async function toggleActive() {
  if (!user.value) return
  const next = !user.value.is_active
  if (!next && !window.confirm(`Deactivate ${user.value.full_name}? They will be signed out and cannot sign in.`)) return
  accessBusy.value = true
  accessAlert.value = ''
  accessNote.value = ''
  try {
    setUser(await accessApi.setUserActive(id.value, next))
    accessNote.value = next ? 'Account reactivated.' : 'Account deactivated.'
  } catch (e) {
    accessAlert.value = message(e)
  } finally {
    accessBusy.value = false
  }
}

onMounted(async () => {
  try {
    const [p, roleData] = await Promise.all([accessApi.user(id.value), accessApi.roles()])
    apply(p)
    roles.value = roleData.roles
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 404
      ? 'This person was not found, or works at a CFS you do not manage.'
      : e instanceof ApiError && e.status === 403
        ? 'Your role cannot see people.'
        : 'Could not load this profile. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.profile { max-width: 640px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { margin-bottom: 8px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-quiet); }

.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.skeleton { height: 240px; opacity: 0.6; }

.summary { display: grid; grid-template-columns: auto 1fr; gap: 16px 24px; align-items: start; }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary); color: var(--on-primary); font-size: 1.125rem;
}
.facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px 24px; }
.facts dt { font-size: 0.8125rem; color: var(--text-secondary); }
.facts dd { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-primary); overflow-wrap: anywhere; }
.note { grid-column: 1 / -1; }

.actions { display: flex; justify-content: flex-end; padding-top: 24px; border-top: 1px solid var(--border-color); }

.choices { display: flex; flex-direction: column; gap: 16px; }
.choice { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.choice-title { margin: 0 0 4px; font-size: 0.9375rem; color: var(--text-primary); }

.temp { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--border-color); border-radius: 12px; }
.temp-code { font-size: 1.25rem; letter-spacing: 0.04em; color: var(--text-primary); overflow-wrap: anywhere; user-select: all; }
.temp-actions { display: flex; align-items: center; gap: 16px; }

@media (max-width: 640px) {
  .card { padding: 24px 16px; }
  .summary { grid-template-columns: 1fr; }
  .choice { flex-direction: column; align-items: stretch; }
  .actions .ui-btn { width: 100%; }
}
</style>
