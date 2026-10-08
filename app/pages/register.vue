<template>
  <AuthShell wide headline="Start reporting in minutes." lead="Create your organisation's account, set up your programme and work offline from day one.">
    <h1 class="title">Get started</h1>
    <p class="subtitle">Create your organisation's account. It's free while we test.</p>

    <ErrorModal 
      :is-open="!!apiError" 
      :message="apiError" 
      @update:is-open="$event ? null : apiError = ''" 
    />
    
    <form @submit.prevent="handleRegister" class="register-form" novalidate>
      <!-- Organisation Fields -->
      <div class="section-title">Organisation Details</div>
      
      <InputField
        id="orgName"
        v-model="form.organisation.name"
        label="Organisation Name"
        placeholder="Enter organisation name"
        :error="errors['organisation.name']"
        required
        autofocus
      />
      
      <TextAreaField
      :rows="2"
        id="orgDesc"
        v-model="form.organisation.description"
        label="Organisation Description"
        placeholder="Brief description of your organisation (optional)"
        :error="errors['organisation.description']"
        :maxlength="1000"
      />
      
      <CountrySelect
        id="country"
        v-model="form.organisation.country"
        label="Country"
        :error="errors['organisation.country']"
        required
      />
      
      <hr class="divider" />
      
      <!-- User Fields -->
      <div class="section-title">Admin User Details</div>
      
      <InputField
        id="fullName"
        v-model="form.user.full_name"
        label="Your Full Name"
        placeholder="John Doe"
        :error="errors['user.full_name']"
        required
      />
      
      <InputField
        id="email"
        type="email"
        v-model="form.user.email"
        label="Email Address"
        placeholder="you@organisation.org"
        :error="errors['user.email']"
        required
      />
      
      <div class="form-row">
        <PasswordInput
          id="password"
          v-model="form.user.password"
          label="Password"
          placeholder="********"
          :error="errors['user.password']"
          required
          showStrength
          class="flex-1"
        />
        
        <PasswordInput
          id="confirmPassword"
          v-model="form.user.confirm_password"
          label="Confirm Password"
          placeholder="********"
          :error="errors['user.confirm_password']"
          required
          class="flex-1"
        />
      </div>
      
      <button 
        type="submit" 
        class="submit-btn" 
        :disabled="isSubmitting"
      >
        <span v-if="isSubmitting" class="spinner"></span>
        {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
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

const router = useRouter();
const { form, errors, apiError, isSubmitting, submit } = useRegistration();

const handleRegister = async () => {
  const success = await submit();
  if (success) {
    alert('Welcome to WellReach — complete your organisation profile');
    router.push('/dashboard');
  }
};
</script>

<style scoped>
.title { margin: 0; font-family: Sora, system-ui, sans-serif; font-weight: 700; font-size: 26px; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 6px 0 24px; font-size: 15px; color: var(--text-secondary); }
.switch { margin: 24px 0 0; font-size: 14px; color: var(--text-secondary); }
.switch a { color: var(--primary); font-weight: 700; text-decoration: none; }
.switch a:hover { text-decoration: underline; }
.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 2rem 0;
}

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
  font: 700 15px Manrope, system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(14, 124, 102, 0.22);
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
