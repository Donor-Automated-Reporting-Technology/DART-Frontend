<template>
  <div class="login-page">
    <div class="form-section">
      <div class="form-container">

        <div class="brand-header">
          <h1 class="logo">DART</h1>
          <h2 class="tagline">Welcome Back!</h2>
        </div>

        <div class="form-box">
          <div class="form-header">
            <h3>Good to see you again</h3>
            <h2>Log In to your Account</h2>
          </div>

          <ErrorModal
            :is-open="!!apiError"
            :message="apiError"
            @update:is-open="$event ? null : apiError = ''"
          />

          <form @submit.prevent="handleLogin" class="login-form" novalidate>
            <InputField
              id="email"
              type="email"
              v-model="email"
              label="Email Address"
              placeholder="you@organisation.org"
              :error="errors.email"
              required
              autofocus
            />

            <PasswordInput
              id="password"
              v-model="password"
              label="Password"
              placeholder="********"
              :error="errors.password"
              required
            />

            <button
              type="submit"
              class="submit-btn"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="spinner"></span>
              {{ isSubmitting ? 'Logging in...' : 'Log In' }}
            </button>
          </form>

          <p class="register-link">
            Don't have an account? <NuxtLink to="/register">Create one</NuxtLink>
          </p>
        </div>

        <div class="footer-copy">
          &copy; 2026 DART Inc., All rights reserved.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

    // Prefer the email returned by the API; fall back to the form value
    // (which is guaranteed to be correct since the login just succeeded).
    authStore.setUserEmail(payload?.user?.email ?? email.value);

    // ── Fetch CFS location name for staff users ───────────────────────────
    const userRole = payload?.user?.role;
    const userId = payload?.user?.id;
    if (userRole && userRole !== 'org_admin' && userId) {
      try {
        const staffData = await cfsApi.getStaffAssignments(payload.tokens.access_token);
        const myAssignment = staffData?.assignments?.find(
          (a: any) => a.user_id === userId && a.is_active
        );
        if (myAssignment?.location_name) {
          authStore.setCfsLocationName(myAssignment.location_name);
        }
      } catch {
        // Non-critical — location name won't show but login still succeeds
      }
    }

    // Redirect based on user role
    if (userRole === 'org_admin') {
      router.push('/dashboard');
    } else {
      // Staff (facilitator, case_worker, etc.) go to CFS
      router.push('/cfs');
    }
  } catch (e: any) {
    apiError.value = 'Connection failed — check your internet connection and try again';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background-color: var(--bg-dark);
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.form-section {
  width: 100%;
  display: flex;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: 2px;
}

.tagline {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--primary);
  margin: 0;
}

.form-box {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  padding: 2.5rem;
  border-radius: 12px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-header h3 {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.form-header h2 {
  font-size: 1.75rem;
  color: var(--text-primary);
  font-weight: 600;
  margin: 0;
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  background-color: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(0.9);
}

.submit-btn:disabled {
  background-color: #555;
  cursor: not-allowed;
  opacity: 0.7;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-left-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.register-link {
  text-align: center;
  margin-top: 2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.footer-copy {
  text-align: center;
  margin-top: 2rem;
  font-size: 0.75rem;
  color: #555;
}
</style>
