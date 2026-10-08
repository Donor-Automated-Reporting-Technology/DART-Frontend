<template>
  <AuthShell centered>
    <h1 class="title">Welcome back</h1>
    <p class="subtitle">Log in to continue to WellReach.</p>

    <ErrorModal
      :is-open="!!apiError"
      :message="apiError"
      @update:is-open="$event ? null : apiError = ''"
    />

    <form class="auth-form" novalidate @submit.prevent="handleLogin">
      <div class="float-field" :class="{ invalid: errors.email }">
        <input id="email" v-model="email" type="email" placeholder=" " autocomplete="email" required autofocus :aria-invalid="!!errors.email" aria-describedby="email-error">
        <label for="email">Work email</label>
      </div>
      <p v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</p>

      <div class="float-field has-action" :class="{ invalid: errors.password }">
        <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder=" " autocomplete="current-password" required :aria-invalid="!!errors.password" aria-describedby="password-error">
        <label for="password">Password</label>
        <button type="button" class="reveal" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
          <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        </button>
      </div>
      <p v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</p>

      <button type="submit" class="submit" :disabled="isSubmitting">
        <span v-if="isSubmitting" class="spinner" />
        <template v-else>
          Log in
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </template>
      </button>
    </form>

    <p class="switch">New to WellReach? <NuxtLink to="/register">Get started</NuxtLink></p>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthShell from '../components/brand/AuthShell.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { cfsApi } from '../services/cfsApi';
import ErrorModal from '../components/interfaces/ErrorModal.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errors = ref<{ email?: string; password?: string }>({});
const apiError = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);

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
.title { margin: 0; font-family: Sora, system-ui, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -0.015em; color: var(--text-primary); }
.subtitle { margin: 6px 0 26px; font-size: 15px; color: var(--text-secondary); }
.auth-form { display: flex; flex-direction: column; gap: 12px; }

/* Floating-label fields: the label sits inside and glides up on focus/typing. */
.float-field { position: relative; }
.float-field input {
  width: 100%;
  height: 56px;
  box-sizing: border-box;
  padding: 22px 16px 8px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-panel);
  color: var(--text-primary);
  font: 400 15px Manrope, system-ui, sans-serif;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.float-field.has-action input { padding-right: 48px; }
.float-field label {
  position: absolute;
  left: 17px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  color: var(--text-secondary);
  pointer-events: none;
  transition: top 0.15s ease, font-size 0.15s ease, color 0.15s ease;
}
.float-field input:focus + label,
.float-field input:not(:placeholder-shown) + label {
  top: 17px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.float-field input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(14, 124, 102, 0.12); }
.float-field input:focus + label { color: var(--primary); }
.float-field.invalid input { border-color: #DC2626; }
.float-field.invalid input:focus { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12); }
.reveal {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}
.reveal:hover { color: var(--text-primary); }
.field-error { margin: -4px 0 0 4px; font-size: 13px; color: #DC2626; }

.submit {
  margin-top: 8px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font: 600 15px Manrope, system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(14, 124, 102, 0.2);
  transition: transform 0.1s, filter 0.15s;
}
.submit svg { transition: transform 0.15s; }
.submit:hover:not(:disabled) svg { transform: translateX(3px); }
.submit:hover:not(:disabled) { filter: brightness(1.05); }
.submit:active:not(:disabled) { transform: translateY(1px); }
.submit:disabled { opacity: 0.75; cursor: wait; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.switch { margin: 22px 0 0; text-align: center; font-size: 14px; color: var(--text-secondary); }
.switch a { color: var(--primary); font-weight: 600; text-decoration: none; }
.switch a:hover { text-decoration: underline; }

/* Dark mode: green text uses the bright mint so it pops. */
[data-theme='dark'] .switch a,
[data-theme='dark'] .float-field input:focus + label { color: #8AF0D2; }
</style>
