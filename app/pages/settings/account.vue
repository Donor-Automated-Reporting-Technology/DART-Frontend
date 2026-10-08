<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'My account', href: '/settings/account', current: true }]">
    <div class="account">
      <header class="head">
        <h1 class="title">My account</h1>
        <p class="subtitle">Your details, sign-in email and password.</p>
      </header>

      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading your account" />

      <p v-else-if="loadError" class="ui-alert" role="alert">
        <AppIcon name="alert-circle" :size="16" />
        <span>{{ loadError }}</span>
      </p>

      <template v-else-if="me">
        <!-- Who you are in the organisation (read-only) -->
        <section class="card summary" aria-labelledby="sum-h">
          <h2 id="sum-h" class="visually-hidden">Your role</h2>
          <div class="avatar" aria-hidden="true">{{ initials }}</div>
          <dl class="facts">
            <div><dt>Organisation</dt><dd>{{ me.organisation.name }}</dd></div>
            <div><dt>Role</dt><dd>{{ me.role?.name ?? '—' }}</dd></div>
            <div><dt>Sees data from</dt><dd>{{ me.role ? SCOPE_LABELS[me.role.scope] : '—' }}</dd></div>
            <div v-if="me.locations.length"><dt>CFS</dt><dd>{{ me.locations.map(l => l.name).join(', ') }}</dd></div>
          </dl>
          <p class="ui-help note">Your role is set by your organisation's admin.</p>
        </section>

        <!-- Profile -->
        <form class="card ui-form" novalidate aria-labelledby="pf-h" @submit.prevent="saveProfile">
          <div class="ui-section-head">
            <h2 id="pf-h">Profile</h2>
            <p>How your name appears on sessions, reports and to your team.</p>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="pf-name">Full name</label>
            <input
              id="pf-name" v-model="profile.full_name" class="ui-input" type="text" name="full_name"
              autocomplete="name" placeholder="Your full name" maxlength="255"
              :aria-invalid="profileErr.full_name ? 'true' : undefined"
              :aria-describedby="profileErr.full_name ? 'pf-name-error' : undefined"
              @blur="pfv.onBlur('full_name')"
            >
            <FieldError id="pf-name-error" :message="profileErr.full_name" />
          </div>

          <div class="ui-field">
            <label class="ui-label" for="pf-phone">Phone <span class="ui-optional">(optional)</span></label>
            <input
              id="pf-phone" v-model="profile.phone" class="ui-input" type="tel" name="phone"
              autocomplete="tel" inputmode="tel" placeholder="e.g. +211 912 345 678" maxlength="40"
              :aria-invalid="profileErr.phone ? 'true' : undefined"
              :aria-describedby="profileErr.phone ? 'pf-phone-error' : undefined"
              @blur="pfv.onBlur('phone')"
            >
            <FieldError id="pf-phone-error" :message="profileErr.phone" />
          </div>

          <p v-if="profileAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ profileAlert }}</span></p>

          <div class="actions">
            <SaveButton :busy="profileSaving" :done="profileDone" label="Save profile" done-label="Saved" />
          </div>
        </form>

        <!-- Sign-in email -->
        <form class="card ui-form" novalidate aria-labelledby="em-h" @submit.prevent="saveEmail">
          <div class="ui-section-head">
            <h2 id="em-h">Sign-in email</h2>
            <p>You sign in with <strong>{{ me.email }}</strong>. We'll send a notice to this address if it changes.</p>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="em-new">New email</label>
            <input
              id="em-new" v-model="email.email" class="ui-input" type="email" name="email"
              inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"
              placeholder="you@organisation.org"
              :aria-invalid="emailErr.email ? 'true' : undefined"
              :aria-describedby="emailErr.email ? 'em-new-error' : undefined"
              @blur="emv.onBlur('email')"
            >
            <FieldError id="em-new-error" :message="emailErr.email" />
          </div>

          <div class="ui-field">
            <label class="ui-label" for="em-pass">Current password</label>
            <div class="ui-password">
              <input
                id="em-pass" v-model="email.current_password" class="ui-input"
                :type="showEmailPass ? 'text' : 'password'" name="current_password"
                autocomplete="current-password" placeholder="To confirm it's you"
                :aria-invalid="emailErr.current_password ? 'true' : undefined"
                :aria-describedby="emailErr.current_password ? 'em-pass-error' : undefined"
                @blur="emv.onBlur('current_password')"
              >
              <RevealButton v-model="showEmailPass" controls="em-pass" />
            </div>
            <FieldError id="em-pass-error" :message="emailErr.current_password" />
          </div>

          <p v-if="emailAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ emailAlert }}</span></p>

          <div class="actions">
            <SaveButton :busy="emailSaving" :done="emailDone" label="Change email" done-label="Email changed" />
          </div>
        </form>

        <!-- Password -->
        <form class="card ui-form" novalidate aria-labelledby="pw-h" @submit.prevent="savePassword">
          <div class="ui-section-head">
            <h2 id="pw-h">Password</h2>
            <p>Changing it signs you out on your other devices. This one stays signed in.</p>
          </div>

          <!-- Hidden username helps password managers save the right account. -->
          <input class="visually-hidden" type="email" name="username" autocomplete="username" :value="me.email" tabindex="-1" aria-hidden="true" readonly>

          <div class="ui-field">
            <label class="ui-label" for="pw-current">Current password</label>
            <div class="ui-password">
              <input
                id="pw-current" v-model="pw.current_password" class="ui-input"
                :type="showCurrent ? 'text' : 'password'" name="current_password"
                autocomplete="current-password" placeholder="Your current password"
                :aria-invalid="pwErr.current_password ? 'true' : undefined"
                :aria-describedby="pwErr.current_password ? 'pw-current-error' : undefined"
                @blur="pwv.onBlur('current_password')"
              >
              <RevealButton v-model="showCurrent" controls="pw-current" />
            </div>
            <FieldError id="pw-current-error" :message="pwErr.current_password" />
          </div>

          <PasswordInput
            id="pw-new"
            v-model="pw.new_password"
            label="New password"
            autocomplete="new-password"
            placeholder="At least 8 characters, with a number"
            show-strength
            :error="pwErr.new_password"
            @blur="pwv.onBlur('new_password')"
          />

          <PasswordInput
            id="pw-confirm"
            v-model="pw.confirm_password"
            label="Confirm new password"
            autocomplete="new-password"
            placeholder="Type the new password again"
            :error="pwErr.confirm_password"
            @blur="pwv.onBlur('confirm_password')"
          />

          <p v-if="pwAlert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ pwAlert }}</span></p>

          <div class="actions">
            <SaveButton :busy="pwSaving" :done="pwDone" label="Change password" done-label="Password changed" />
          </div>
        </form>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { meApi, SCOPE_LABELS, type Me } from '../../services/meApi'
import { ApiError } from '../../services/api'
import FieldError from '../../components/interfaces/FieldError.vue'
import PasswordInput from '../../components/interfaces/PasswordInput.vue'
import { useBlurValidation } from '../../composables/useBlurValidation'

// Every signed-in user can manage their own account.
definePageMeta({ layout: false, middleware: ['auth'] })
useHead({ title: 'My account · WellReach' })

const authStore = useAuthStore()

const me = ref<Me | null>(null)
const loading = ref(true)
const loadError = ref('')

const initials = computed(() =>
  (me.value?.full_name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'
)

// ── Small presentational helpers ─────────────────────────────────────────────
const SaveButton = defineComponent({
  props: { busy: Boolean, done: Boolean, label: { type: String, required: true }, doneLabel: { type: String, required: true } },
  setup(p) {
    return () => h('button', {
      type: 'submit',
      class: ['ui-btn', 'ui-btn--primary', p.done && 'ui-btn--done'],
      disabled: p.busy,
      'aria-busy': p.busy ? 'true' : undefined,
    }, p.busy
      ? [h('span', { class: 'ui-spinner', 'aria-hidden': 'true' }), 'Saving…']
      : p.done
        ? [h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: 'M20 6 9 17l-5-5' })]), p.doneLabel]
        : p.label)
  },
})

const RevealButton = defineComponent({
  props: { modelValue: Boolean, controls: { type: String, required: true } },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const eye = [h('path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' }), h('circle', { cx: 12, cy: 12, r: 3 })]
    const eyeOff = [h('path', { d: 'M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2' })]
    return () => h('button', {
      type: 'button',
      class: 'ui-reveal',
      'aria-label': p.modelValue ? 'Hide password' : 'Show password',
      'aria-pressed': p.modelValue,
      'aria-controls': p.controls,
      onClick: () => emit('update:modelValue', !p.modelValue),
    }, [h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, p.modelValue ? eyeOff : eye)])
  },
})

/** Server field errors → the form's error map; anything else → a form message. */
function applyServerError(e: unknown, errs: Record<string, string>, fields: string[]): string {
  if (e instanceof ApiError) {
    const fieldErrors = (e.data?.errors ?? {}) as Record<string, string>
    const known = Object.keys(fieldErrors).filter(k => fields.includes(k))
    for (const k of known) errs[k] = fieldErrors[k]!
    if (known.length) return ''
    if (e.status === 429) return 'Too many attempts — wait a minute and try again.'
    return e.message || 'Something went wrong — please try again.'
  }
  return 'Connection failed — check your internet connection and try again.'
}

function replace(target: Record<string, string>, next: Record<string, string>) {
  Object.keys(target).forEach(k => delete target[k])
  Object.assign(target, next)
}

const flash = (flag: { value: boolean }) => {
  flag.value = true
  setTimeout(() => { flag.value = false }, 3000)
}

// ── Profile ──────────────────────────────────────────────────────────────────
const profile = reactive({ full_name: '', phone: '' })
const profileErr = reactive<Record<string, string>>({})
const profileAlert = ref('')
const profileSaving = ref(false)
const profileDone = ref(false)
const PHONE = /^\+?[0-9][0-9 ()-]{5,30}$/

function validateProfile() {
  replace(profileErr, {})
  const name = profile.full_name.trim()
  if (name.length < 2 || name.length > 255) profileErr.full_name = 'Full name must be between 2 and 255 characters'
  if (profile.phone.trim() && !PHONE.test(profile.phone.trim())) profileErr.phone = 'Enter a phone number with digits only, e.g. +211 912 345 678'
  return Object.keys(profileErr).length === 0
}
const pfv = useBlurValidation({
  get: () => profileErr, set: n => replace(profileErr, n), validate: validateProfile,
  value: f => profile[f as keyof typeof profile], fields: ['full_name', 'phone'],
})

async function saveProfile() {
  profileAlert.value = ''
  if (!validateProfile()) return
  profileSaving.value = true
  try {
    me.value = await meApi.updateProfile({ full_name: profile.full_name.trim(), phone: profile.phone.trim() })
    authStore.setMe(me.value)
    flash(profileDone)
  } catch (e) {
    profileAlert.value = applyServerError(e, profileErr, ['full_name', 'phone'])
  } finally {
    profileSaving.value = false
  }
}

// ── Email ────────────────────────────────────────────────────────────────────
const email = reactive({ email: '', current_password: '' })
const emailErr = reactive<Record<string, string>>({})
const emailAlert = ref('')
const emailSaving = ref(false)
const emailDone = ref(false)
const showEmailPass = ref(false)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail() {
  replace(emailErr, {})
  const v = email.email.trim().toLowerCase()
  if (!EMAIL.test(v)) emailErr.email = 'Enter a valid email address'
  else if (v === me.value?.email) emailErr.email = 'This is already your sign-in email'
  if (!email.current_password) emailErr.current_password = 'Enter your current password'
  return Object.keys(emailErr).length === 0
}
const emv = useBlurValidation({
  get: () => emailErr, set: n => replace(emailErr, n), validate: validateEmail,
  value: f => email[f as keyof typeof email], fields: ['email', 'current_password'],
})

async function saveEmail() {
  emailAlert.value = ''
  if (!validateEmail()) return
  emailSaving.value = true
  try {
    me.value = await meApi.changeEmail({ email: email.email.trim().toLowerCase(), current_password: email.current_password })
    authStore.setMe(me.value)
    email.email = ''
    email.current_password = ''
    replace(emailErr, {})
    flash(emailDone)
  } catch (e) {
    emailAlert.value = applyServerError(e, emailErr, ['email', 'current_password'])
  } finally {
    emailSaving.value = false
  }
}

// ── Password ─────────────────────────────────────────────────────────────────
const pw = reactive({ current_password: '', new_password: '', confirm_password: '' })
const pwErr = reactive<Record<string, string>>({})
const pwAlert = ref('')
const pwSaving = ref(false)
const pwDone = ref(false)
const showCurrent = ref(false)

// Same rules as the API (and registration).
function validatePassword() {
  replace(pwErr, {})
  if (!pw.current_password) pwErr.current_password = 'Enter your current password'
  if (pw.new_password.length < 8) pwErr.new_password = 'Password must be at least 8 characters'
  else if (!/\d/.test(pw.new_password)) pwErr.new_password = 'Password must contain at least one number'
  else if (pw.new_password === pw.current_password) pwErr.new_password = 'Choose a password different from your current one'
  if (pw.confirm_password !== pw.new_password) pwErr.confirm_password = 'Passwords do not match'
  return Object.keys(pwErr).length === 0
}
const pwv = useBlurValidation({
  get: () => pwErr, set: n => replace(pwErr, n), validate: validatePassword,
  value: f => pw[f as keyof typeof pw], fields: ['current_password', 'new_password', 'confirm_password'],
})

async function savePassword() {
  pwAlert.value = ''
  if (!validatePassword()) return
  pwSaving.value = true
  try {
    await meApi.changePassword({ ...pw })
    pw.current_password = ''
    pw.new_password = ''
    pw.confirm_password = ''
    replace(pwErr, {})
    flash(pwDone)
  } catch (e) {
    pwAlert.value = applyServerError(e, pwErr, ['current_password', 'new_password', 'confirm_password'])
  } finally {
    pwSaving.value = false
  }
}

// ── Load ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    me.value = await meApi.get()
    authStore.setMe(me.value)
    profile.full_name = me.value.full_name
    profile.phone = me.value.phone ?? ''
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 401
      ? 'Your session has ended — please log in again.'
      : 'Could not load your account. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.account { max-width: 640px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { margin-bottom: 8px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-quiet); }

.card {
  position: relative;
  padding: 32px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
}
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

.ui-section-head strong { font-weight: 400; color: var(--text-primary); }
.actions { display: flex; justify-content: flex-end; padding-top: 24px; border-top: 1px solid var(--border-color); }

@media (max-width: 640px) {
  .card { padding: 24px 16px; }
  .summary { grid-template-columns: 1fr; }
  .actions .ui-btn { width: 100%; }
}
</style>
