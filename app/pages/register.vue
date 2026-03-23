<template>
  <div class="register-page">
    <div class="form-section">
      <div class="form-container">
        
        <div class="brand-header">
          <h1 class="logo">DART</h1>
          <h2 class="tagline">Donor Automated Reporting Technology</h2>
        </div>

        <div class="form-box">
          <div class="form-header">
            <h3>Let's get started</h3>
            <h2>Create new account</h2>
          </div>
          
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
          
          <p class="login-link">
            Already have an account? <NuxtLink to="/login">Login</NuxtLink>
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
    alert('Welcome to DART — complete your organisation profile');
    router.push('/dashboard');
  }
};
</script>

<style scoped>
.register-page {
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
  max-width: 550px;
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

.section-title {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--third);
  margin-bottom: 1rem;
  font-weight: 600;
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

@media (min-width: 600px) {
  .form-row {
    flex-direction: row;
  }
}

.flex-1 {
  flex: 1;
  min-width: 0;
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

.login-link {
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
