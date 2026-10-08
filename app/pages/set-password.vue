<template>
  <AuthShell title="Choose your password" :subtitle="`You signed in with a temporary password${firstName ? `, ${firstName}` : ''}. Choose your own to continue.`">
    <form class="ui-form" novalidate @submit.prevent="save">
      <!-- Lets password managers save the new password against the right account. -->
      <input class="visually-hidden" type="email" name="username" autocomplete="username" :value="auth.userEmail ?? ''" tabindex="-1" aria-hidden="true" readonly>

      <PasswordInput
        v-if="!auth.temporaryPassword"
        id="sp-temp"
        v-model="temp"
        label="Temporary password"
        autocomplete="current-password"
        placeholder="From your invitation email"
        :error="errs.current_password"
        @blur="bv.onBlur('current_password')"
      />

      <PasswordInput
        id="sp-new"
        v-model="pw.new_password"
        label="New password"
        autocomplete="new-password"
        placeholder="At least 8 characters, with a number"
        show-strength
        :error="errs.new_password"
        @blur="bv.onBlur('new_password')"
      />

      <PasswordInput
        id="sp-confirm"
        v-model="pw.confirm_password"
        label="Confirm new password"
        autocomplete="new-password"
        placeholder="Type it again"
        :error="errs.confirm_password"
        @blur="bv.onBlur('confirm_password')"
      />

      <p v-if="alert" class="ui-alert" role="alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
        <span>{{ alert }}</span>
      </p>

      <button
        type="submit"
        class="ui-btn ui-btn--primary ui-btn--block"
        :class="{ 'ui-btn--done': done }"
        :disabled="saving || done"
        :aria-busy="saving ? 'true' : undefined"
      >
        <template v-if="saving"><span class="ui-spinner" aria-hidden="true" />Saving…</template>
        <template v-else-if="done">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          Password saved
        </template>
        <template v-else>Save and continue</template>
      </button>
      <p class="visually-hidden" aria-live="polite">{{ done ? 'Password saved, opening WellReach' : '' }}</p>
    </form>

    <template #switch>
      Not you? <button type="button" class="ui-btn--text link-btn" @click="logout">Log out</button>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '../components/brand/AuthShell.vue'
import PasswordInput from '../components/interfaces/PasswordInput.vue'
import { useAuthStore } from '../stores/auth'
import { meApi } from '../services/meApi'
import { ApiError } from '../services/api'
import { useBlurValidation } from '../composables/useBlurValidation'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Choose your password · WellReach' })

const auth = useAuthStore()
const router = useRouter()
const firstName = computed(() => (auth.userName ?? '').split(/\s+/)[0] ?? '')

const temp = ref('')
const pw = reactive({ new_password: '', confirm_password: '' })
const errs = reactive<Record<string, string>>({})
const alert = ref('')
const saving = ref(false)
const done = ref(false)

const current = () => auth.temporaryPassword ?? temp.value

// Same rules as the API.
function validate() {
  Object.keys(errs).forEach(k => delete errs[k])
  if (!current()) errs.current_password = 'Enter the temporary password from your email'
  if (pw.new_password.length < 8) errs.new_password = 'Password must be at least 8 characters'
  else if (!/\d/.test(pw.new_password)) errs.new_password = 'Password must contain at least one number'
  else if (pw.new_password === current()) errs.new_password = 'Choose a password different from the temporary one'
  if (pw.confirm_password !== pw.new_password) errs.confirm_password = 'Passwords do not match'
  return Object.keys(errs).length === 0
}
const bv = useBlurValidation({
  get: () => errs,
  set: n => { Object.keys(errs).forEach(k => delete errs[k]); Object.assign(errs, n) },
  validate,
  value: f => (f === 'current_password' ? temp.value : pw[f as keyof typeof pw]),
  fields: ['current_password', 'new_password', 'confirm_password'],
})

async function save() {
  alert.value = ''
  if (!validate()) return
  saving.value = true
  try {
    await meApi.changePassword({ current_password: current(), ...pw })
    done.value = true
    auth.setMustChangePassword(false)
    router.push('/dashboard')
  } catch (e) {
    if (e instanceof ApiError && e.data?.errors) {
      Object.assign(errs, e.data.errors)
      // The remembered temporary password was wrong (e.g. reset again): ask for it.
      if (e.data.errors.current_password) auth.temporaryPassword = null
    } else {
      alert.value = e instanceof ApiError ? e.message : 'Connection failed — check your internet connection and try again.'
    }
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.clearSession()
  router.push('/login')
}
</script>

<style scoped>
.link-btn { padding: 0; border: 0; background: none; font: inherit; color: var(--link); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.link-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
