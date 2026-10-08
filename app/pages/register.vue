<template>
  <AuthShell wide headline="Start reporting in minutes." lead="Create your organisation's account, set up your programme and work offline from day one.">
    <h1 class="title">Get started</h1>
    <p class="subtitle">Free while we test. It takes about a minute.</p>

    <ErrorModal
      :is-open="!!apiError"
      :message="apiError"
      @update:is-open="$event ? null : apiError = ''"
    />

    <form class="register-form" novalidate @submit.prevent="handleRegister">
      <div class="step" role="group" aria-labelledby="step-org">
        <h2 id="step-org" class="step-label"><span class="step-num">1</span>Your organisation</h2>

        <InputField
          id="orgName"
          v-model="form.organisation.name"
          label="Organisation name"
          placeholder="e.g. Hope for Children"
          :error="errors['organisation.name']"
          required
          autofocus
        />

        <CountrySelect
          id="country"
          v-model="form.organisation.country"
          label="Country"
          :error="errors['organisation.country']"
          required
        />

        <TextAreaField
          v-if="showDescription"
          id="orgDesc"
          v-model="form.organisation.description"
          :rows="2"
          label="Short description (optional)"
          placeholder="What your organisation does, in a sentence or two"
          :error="errors['organisation.description']"
          :maxlength="1000"
        />
        <button v-else type="button" class="link-btn" @click="descriptionOpen = true">+ Add a short description</button>
      </div>

      <div class="step" role="group" aria-labelledby="step-account">
        <h2 id="step-account" class="step-label"><span class="step-num">2</span>Your account</h2>

        <InputField
          id="fullName"
          v-model="form.user.full_name"
          label="Full name"
          placeholder="Your name"
          :error="errors['user.full_name']"
          required
        />

        <InputField
          id="email"
          v-model="form.user.email"
          type="email"
          label="Work email"
          placeholder="you@organisation.org"
          :error="errors['user.email']"
          required
        />

        <div class="form-row">
          <PasswordInput
            id="password"
            v-model="form.user.password"
            label="Password"
            placeholder="At least 8 characters"
            :error="errors['user.password']"
            required
            show-strength
            class="flex-1"
          />
          <PasswordInput
            id="confirmPassword"
            v-model="form.user.confirm_password"
            label="Confirm password"
            placeholder="Repeat it"
            :error="errors['user.confirm_password']"
            required
            class="flex-1"
          />
        </div>
      </div>

      <button type="submit" class="submit-btn" :disabled="isSubmitting">
        <span v-if="isSubmitting" class="spinner" />
        {{ isSubmitting ? 'Creating your account…' : 'Create account' }}
      </button>
    </form>

    <p class="switch">Already have an account? <NuxtLink to="/login">Log in</NuxtLink></p>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthShell from '../components/brand/AuthShell.vue';
import { useRegistration } from '../composables/useRegistration';
import { useRouter } from 'vue-router';
import InputField from '../components/interfaces/InputField.vue';
import TextAreaField from '../components/interfaces/TextAreaField.vue';
import PasswordInput from '../components/interfaces/PasswordInput.vue';
import CountrySelect from '../components/interfaces/CountrySelect.vue';
import ErrorModal from '../components/interfaces/ErrorModal.vue';
import { computed, ref } from 'vue';

const router = useRouter();
const { form, errors, apiError, isSubmitting, submit } = useRegistration();

// The optional description stays tucked away unless it is opened, filled or has an error.
const descriptionOpen = ref(false);
const showDescription = computed(() =>
  descriptionOpen.value || !!form.organisation.description || !!errors.value?.['organisation.description']
);

const handleRegister = async () => {
  const success = await submit();
  if (success) {
    router.push('/dashboard');
  }
};
</script>

<style scoped>
.title { margin: 0; font-family: Sora, system-ui, sans-serif; font-weight: 600; font-size: 26px; letter-spacing: -0.015em; color: var(--text-primary); }
.subtitle { margin: 6px 0 28px; font-size: 15px; font-weight: 400; color: var(--text-secondary); }
.step { display: flex; flex-direction: column; }
.step + .step { margin-top: 22px; padding-top: 22px; border-top: 1px solid var(--border-color); }
.step-label { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font: 500 15px Manrope, system-ui, sans-serif; color: var(--text-primary); }
.step-num { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.link-btn { align-self: flex-start; margin: 2px 0 4px; padding: 6px 0; border: 0; background: none; color: var(--primary); font: 500 14px Manrope, system-ui, sans-serif; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.register-form :deep(label) { font-weight: 500; }
.switch { margin: 24px 0 0; font-size: 14px; color: var(--text-secondary); }
.switch a { color: var(--primary); font-weight: 600; text-decoration: none; }
.switch a:hover { text-decoration: underline; }
.form-row {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.submit-btn {
  width: 100%;
  margin-top: 12px;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font: 600 15px Manrope, system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(14, 124, 102, 0.18);
}

.submit-btn:hover:not(:disabled) { filter: brightness(1.05); }

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

@media (min-width: 600px) {
  .form-row {
    flex-direction: row;
  }
}











@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
