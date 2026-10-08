<template>
  <AuthShell title="Welcome back" subtitle="Log in to continue to WellReach.">
    <form class="ui-form" novalidate @submit.prevent="handleLogin">
      <div class="ui-field">
        <label class="ui-label" for="email">Work email</label>
        <input
          id="email" placeholder="you@organisation.org"
          v-model="email"
          class="ui-input"
          type="email"
          name="email"
          inputmode="email"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
          required
          autofocus
          :aria-invalid="errors.email ? 'true' : undefined"
          :aria-describedby="errors.email ? 'email-error' : undefined"
          @blur="onBlur('email')"
        >
        <FieldError id="email-error" :message="errors.email" />
      </div>

      <div class="ui-field">
        <label class="ui-label" for="password">Password</label>
        <div class="ui-password">
          <input
            id="password" placeholder="Your password"
            v-model="password"
            class="ui-input"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            required
            :aria-invalid="errors.password ? 'true' : undefined"
            :aria-describedby="errors.password ? 'password-error' : undefined"
            @blur="onBlur('password')"
          >
          <button
            type="button"
            class="ui-reveal"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            aria-controls="password"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          </button>
        </div>
        <FieldError id="password-error" :message="errors.password" />
      </div>

      <p v-if="apiError" class="ui-alert" role="alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
        <span>{{ apiError }}</span>
      </p>

      <button
        type="submit"
        class="ui-btn ui-btn--primary ui-btn--block"
        :class="{ 'ui-btn--done': done }"
        :disabled="isSubmitting || done"
        :aria-busy="isSubmitting ? 'true' : undefined"
      >
        <template v-if="isSubmitting"><span class="ui-spinner" aria-hidden="true" />Logging in…</template>
        <template v-else-if="done">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          Logged in
        </template>
        <template v-else>Log in</template>
      </button>
      <p class="visually-hidden" aria-live="polite">{{ isSubmitting ? 'Logging in' : done ? 'Logged in, opening your dashboard' : '' }}</p>
    </form>

    <template #switch>
      New to WellReach? <NuxtLink to="/register" class="ui-link">Create an account</NuxtLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthShell from '../components/brand/AuthShell.vue';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { cfsApi } from '../services/cfsApi';
import FieldError from '../components/interfaces/FieldError.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errors = ref<{ email?: string; password?: string }>({});
const apiError = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);
const done = ref(false);

// A field that shows an error is re-checked as the user types, so the
// message clears as soon as the value is fixed.
watch([email, password], () => {
  const shown = (['email', 'password'] as const).filter(f => errors.value[f]);
  if (!shown.length) return;
  const previous = { ...errors.value };
  validate();
  const next = { ...previous };
  for (const f of shown) {
    delete next[f];
    if (errors.value[f]) next[f] = errors.value[f];
  }
  errors.value = next;
});

// Check one field when the user leaves it, using the same rules as submit.
// An empty, untouched field stays quiet until submit, so no error shifts the
// layout under the pointer.
const onBlur = (field: 'email' | 'password') => {
  const value = field === 'email' ? email.value : password.value;
  if (!value && !errors.value[field]) return;
  const previous = { ...errors.value };
  validate();
  const next = { ...previous };
  delete next[field];
  if (errors.value[field]) next[field] = errors.value[field];
  errors.value = next;
};

const validate = () => {
  errors.value = {};
  let isValid = true;

  if (!email.value) {
    errors.value.email = 'Email is required';
    isValid = false;
  }

  if (!password.value) {
    errors.value.password = 'Password is required';
    isValid = false;
  }

  return isValid;
};

const handleLogin = async () => {
  apiError.value = '';

  if (email.value) {
    email.value = email.value.toLowerCase();
  }

  if (!validate()) {
    return;
  }

  isSubmitting.value = true;
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 400 && data.errors) {
        errors.value = data.errors;
      } else {
        apiError.value = data.message || 'Incorrect email or password';
      }
      return;
    }

    // ── Hydrate auth store ────────────────────────────────────────────────
    const payload = data.data;
    if (payload?.tokens?.access_token) authStore.setToken(payload.tokens.access_token);
    if (payload?.user?.full_name) authStore.setUserName(payload.user.full_name);
    if (payload?.user?.id) authStore.setUserId(payload.user.id);
    if (payload?.user?.role) authStore.setUserRole(payload.user.role);
    if (payload?.user?.organisation?.name) authStore.setOrgName(payload.user.organisation.name);
    if (payload?.user?.organisation?.id) authStore.setOrgId(payload.user.organisation.id);
    if (Array.isArray(payload?.user?.organisation?.activities)) {
      authStore.setActivities(payload.user.organisation.activities);
    }
    if (Array.isArray(payload?.user?.organisation?.framework_activities)) {
      authStore.setFrameworkActivities(payload.user.organisation.framework_activities);
    }

    // Prefer the email returned by the API; fall back to the form value
    // (which is guaranteed to be correct since the login just succeeded).
    authStore.setUserEmail(payload?.user?.email ?? email.value);

    // ── Fetch CFS location (id + name) for staff users ────────────────────
    // why: DART-72 — hydrate the facilitator's active CFS location into the
    // auth store BEFORE navigating, so PSS schedule setup has the real
    // cfs_location_id (no more userId fallback). Best-effort: a network
    // failure here is non-fatal — the user lands on the dashboard and the
    // composable will retry on screens that need the value.
    const userRole = payload?.user?.role;
    if (userRole && userRole !== 'org_admin') {
      try {
        const me = await cfsApi.getMyLocation(payload.tokens.access_token);
        authStore.setCfsLocationId(me.id);
        authStore.setCfsLocationName(me.name);
      } catch {
        // Non-critical — login still succeeds; useCfsLocation will retry.
      }
    }

    done.value = true;

    // Temporary password (new account or reset): choose your own first.
    if (payload?.user?.must_change_password) {
      authStore.setMustChangePassword(true, password.value);
      router.push('/set-password');
      return;
    }
    authStore.setMustChangePassword(false);

    // Redirect based on user role
    if (userRole === 'org_admin') {
      router.push('/dashboard');
    } else {
      // Staff (facilitator, case_worker, etc.) go to dashboard
      router.push('/dashboard');
    }
  } catch (e: any) {
    apiError.value = 'Connection failed — check your internet connection and try again';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* Layout and fields come from AuthShell and forms.css. */
</style>
