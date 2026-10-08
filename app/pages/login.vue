<template>
  <AuthShell headline="Welcome back." lead="Pick up where your team left off: sessions, attendance and donor reports in one place.">
    <h1 class="title">Log in</h1>
    <p class="subtitle">Use the work email your organisation registered with.</p>

    <ErrorModal
      :is-open="!!apiError"
      :message="apiError"
      @update:is-open="$event ? null : apiError = ''"
    />

    <form class="auth-form" novalidate @submit.prevent="handleLogin">
      <InputField
        id="email"
        v-model="email"
        type="email"
        label="Email"
        placeholder="you@organisation.org"
        :error="errors.email"
        required
        autofocus
      />
      <PasswordInput
        id="password"
        v-model="password"
        label="Password"
        placeholder="Your password"
        :error="errors.password"
        required
      />
      <button type="submit" class="submit" :disabled="isSubmitting">
        <span v-if="isSubmitting" class="spinner" />
        {{ isSubmitting ? 'Logging in…' : 'Log in' }}
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
import InputField from '../components/interfaces/InputField.vue';
import PasswordInput from '../components/interfaces/PasswordInput.vue';
import ErrorModal from '../components/interfaces/ErrorModal.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errors = ref<{ email?: string; password?: string }>({});
const apiError = ref('');
const isSubmitting = ref(false);

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
.title { margin: 0; font-family: Sora, system-ui, sans-serif; font-weight: 700; font-size: 26px; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 6px 0 28px; font-size: 15px; color: var(--text-secondary); }
.auth-form { display: flex; flex-direction: column; gap: 4px; }
.submit {
  margin-top: 10px;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font: 700 15px Manrope, system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(14, 124, 102, 0.22);
  transition: transform 0.1s, filter 0.15s;
}
.submit:hover:not(:disabled) { filter: brightness(1.05); }
.submit:active:not(:disabled) { transform: translateY(1px); }
.submit:disabled { opacity: 0.7; cursor: wait; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.switch { margin: 24px 0 0; font-size: 14px; color: var(--text-secondary); }
.switch a { color: var(--primary); font-weight: 700; text-decoration: none; }
.switch a:hover { text-decoration: underline; }
</style>
