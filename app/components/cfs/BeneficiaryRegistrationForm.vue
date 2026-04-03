<template>
  <div class="registration-wizard">
    <div class="wizard-header">
      <div class="wizard-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
      <div class="steps-indicator">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          class="step-item"
          :class="{ active: currentStep === index, completed: currentStep > index }"
        >
          <div class="step-circle">{{ index + 1 }}</div>
          <span class="step-label">{{ step.title }}</span>
        </div>
      </div>
    </div>

    <div v-if="successMessage" class="success-message card">
      <div class="success-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <h3>Registration Successful</h3>
      <p>The beneficiary has been added. ID reference:</p>
      <div class="id-badge">{{ registeredId }}</div>
      <div class="success-actions">
        <button @click="resetForm" class="btn btn-outline">Register Another</button>
        <NuxtLink to="/cfs/dashboard" class="btn btn-primary">Done</NuxtLink>
      </div>
    </div>

    <div v-else class="wizard-body card">
      <div v-if="apiError" class="error-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>{{ apiError }}</span>
      </div>

      <div class="info-banner">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <div class="info-text">
          <strong>CFS Location:</strong> This beneficiary will be automatically registered to your currently assigned Child Friendly Space.
        </div>
      </div>

      <form @submit.prevent="handleNext">
        
        <!-- STEP 1: IDENTITY -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="currentStep === 0" class="step-content" key="step1">
            <h3 class="step-title">Identity</h3>
            <p class="step-subtitle">Please enter the child's standard naming details.</p>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="personal_name">Personal Name <span class="required">*</span></label>
                <input id="personal_name" v-model="form.personal_name" type="text" placeholder="e.g. Amina" :class="{ 'has-error': currentErrors['personal_name'] }" />
                <span v-if="currentErrors['personal_name']" class="error-text">{{ currentErrors['personal_name'] }}</span>
              </div>
              
              <div class="form-group">
                <label for="father_name">Father's Name <span class="required">*</span></label>
                <input id="father_name" v-model="form.father_name" type="text" placeholder="e.g. Majid" :class="{ 'has-error': currentErrors['father_name'] }" />
                <span v-if="currentErrors['father_name']" class="error-text">{{ currentErrors['father_name'] }}</span>
              </div>

              <div class="form-group">
                <label for="grandfather_name">Grandfather's Name</label>
                <input id="grandfather_name" v-model="form.grandfather_name" type="text" placeholder="Optional" />
              </div>

              <div class="form-group">
                <label for="family_name">Family Name (Clan)</label>
                <input id="family_name" v-model="form.family_name" type="text" placeholder="Optional" />
              </div>
            </div>
          </div>

          <!-- STEP 2: DEMOGRAPHICS -->
          <div v-else-if="currentStep === 1" class="step-content" key="step2">
            <h3 class="step-title">Demographics</h3>
            <p class="step-subtitle">Basic demographic information.</p>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="age">Age at Registration (0-25) <span class="required">*</span></label>
                <input id="age" v-model.number="form.age_at_registration" type="number" min="0" max="25" :class="{ 'has-error': currentErrors['age_at_registration'] }" />
                <span v-if="currentErrors['age_at_registration']" class="error-text">{{ currentErrors['age_at_registration'] }}</span>
              </div>

              <div class="form-group">
                <label for="sex">Sex <span class="required">*</span></label>
                <select id="sex" v-model="form.sex" :class="{ 'has-error': currentErrors['sex'] }">
                  <option value="" disabled>Select Sex</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
                <span v-if="currentErrors['sex']" class="error-text">{{ currentErrors['sex'] }}</span>
              </div>

              <div class="form-group full-width">
                <label for="language">Primary Language <span class="required">*</span></label>
                <input id="language" v-model="form.language" type="text" placeholder="e.g. Juba Arabic, Dinka, Nuer, etc." :class="{ 'has-error': currentErrors['language'] }" />
                <span v-if="currentErrors['language']" class="error-text">{{ currentErrors['language'] }}</span>
              </div>
            </div>
          </div>

          <!-- STEP 3: MEDICAL & VULNERABILITY -->
          <div v-else-if="currentStep === 2" class="step-content" key="step3">
            <h3 class="step-title">Vulnerability & Medical Context</h3>
            <p class="step-subtitle">This information helps us tailor care and activities.</p>
            
            <div class="form-grid">
              <div class="form-group full-width">
                <label for="disability">Disability Status <span class="required">*</span></label>
                <select id="disability" v-model="form.disability_status" :class="{ 'has-error': currentErrors['disability_status'] }">
                  <option value="" disabled>Select Status</option>
                  <option value="None">None - No visible or known disability</option>
                  <option value="Physical">Physical / Mobility impairment</option>
                  <option value="Visual">Visual impairment</option>
                  <option value="Hearing">Hearing impairment</option>
                  <option value="Intellectual">Intellectual disability</option>
                  <option value="Multiple">Multiple disabilities</option>
                  <option value="Other">Other</option>
                </select>
                <span v-if="currentErrors['disability_status']" class="error-text">{{ currentErrors['disability_status'] }}</span>
              </div>

              <div class="form-group full-width">
                <label for="medical_issues">Known Medical Issues</label>
                <textarea id="medical_issues" v-model="form.known_medical_issues" rows="3" placeholder="Any chronic illnesses, allergies, or immediate medical needs."></textarea>
              </div>

              <div class="form-group full-width">
                <label for="learning_difficulties">Known Learning Difficulties</label>
                <textarea id="learning_difficulties" v-model="form.known_learning_difficulties" rows="3" placeholder="Any special needs for instruction, engagement, etc."></textarea>
              </div>
            </div>
          </div>

          <!-- STEP 4: GUARDIAN & SYSTEM -->
          <div v-else-if="currentStep === 3" class="step-content" key="step4">
            <h3 class="step-title">Guardian & System Info</h3>
            <p class="step-subtitle">Required contact and reference details.</p>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="guardian_name">Guardian Name <span class="required">*</span></label>
                <input id="guardian_name" v-model="form.guardian_name" type="text" placeholder="Full name of primary caregiver" :class="{ 'has-error': currentErrors['guardian_name'] }" />
                <span v-if="currentErrors['guardian_name']" class="error-text">{{ currentErrors['guardian_name'] }}</span>
              </div>

              <div class="form-group">
                <label for="guardian_phone">Guardian Phone</label>
                <input id="guardian_phone" v-model="form.guardian_phone" type="text" placeholder="e.g. +211 9..." />
              </div>

              <div class="form-group full-width">
                <label for="primero_case_id">Primero Case ID (Optional)</label>
                <div class="input-with-icon">
                  <div class="icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <input id="primero_case_id" v-model="form.primero_case_id" type="text" placeholder="Link to child protection case" />
                </div>
                <small class="helper-text">If this child is an active case in Primero (CPIMS+), link them here.</small>
              </div>

              <div class="form-group full-width">
                <label for="additional_notes">Additional Notes</label>
                <textarea id="additional_notes" v-model="form.additional_notes" rows="4" placeholder="Any other relevant details the registrar or facilitators should know..."></textarea>
              </div>
            </div>
          </div>
        </transition>

        <div class="wizard-footer">
          <button 
            v-if="currentStep > 0" 
            type="button" 
            class="btn btn-outline" 
            @click="prevStep"
            :disabled="isSubmitting"
          >
            Back
          </button>
          <div class="spacer"></div>
          
          <button 
            v-if="currentStep < steps.length - 1" 
            type="button" 
            class="btn btn-primary" 
            @click="nextStep"
          >
            Continue
          </button>
          
          <button 
            v-else 
            type="submit" 
            class="btn btn-primary btn-submit" 
            :disabled="isSubmitting"
          >
            <div class="spinner" v-if="isSubmitting"></div>
            <span v-else>Complete Registration</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCfsRegistration } from '../../composables/useCfsRegistration';

const { form, apiError, isSubmitting, submit } = useCfsRegistration();

const successMessage = ref(false);
const registeredId = ref('');
const currentStep = ref(0);
const currentErrors = ref<Record<string, string>>({});

const steps = [
  { title: 'Identity' },
  { title: 'Demographics' },
  { title: 'Medical' },
  { title: 'Guardian' }
];

const progressPercentage = computed(() => {
  return ((currentStep.value) / (steps.length - 1)) * 100;
});

const validateStep = (stepIndex: number) => {
  currentErrors.value = {};
  let isValid = true;

  if (stepIndex === 0) {
    if (!form.personal_name || form.personal_name.trim() === '') {
      currentErrors.value.personal_name = 'Personal name is required';
      isValid = false;
    }
    if (!form.father_name || form.father_name.trim() === '') {
      currentErrors.value.father_name = "Father's name is required";
      isValid = false;
    }
  } 
  
  else if (stepIndex === 1) {
    const age = form.age_at_registration;
    if (age === null || age === undefined || age < 0 || age > 25) {
      currentErrors.value.age_at_registration = 'Age must be between 0 and 25';
      isValid = false;
    }
    if (!form.sex) {
      currentErrors.value.sex = 'Sex is required';
      isValid = false;
    }
    if (!form.language || form.language.trim() === '') {
      currentErrors.value.language = 'Primary language is required';
      isValid = false;
    }
  }

  else if (stepIndex === 2) {
    if (!form.disability_status) {
      currentErrors.value.disability_status = 'Disability status is required';
      isValid = false;
    }
  }

  else if (stepIndex === 3) {
    if (!form.guardian_name || form.guardian_name.trim() === '') {
      currentErrors.value.guardian_name = 'Guardian name is required';
      isValid = false;
    }
  }

  return isValid;
};

const nextStep = () => {
  if (validateStep(currentStep.value)) {
    currentStep.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
    currentErrors.value = {}; // clear errors when going back
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleNext = async () => {
  if (currentStep.value === steps.length - 1) {
    if (validateStep(currentStep.value)) {
      const newId = await submit();
      if (newId) {
        registeredId.value = newId;
        successMessage.value = true;
      }
    }
  }
};

const resetForm = () => {
  successMessage.value = false;
  registeredId.value = '';
  currentStep.value = 0;
  currentErrors.value = {};
};
</script>

<style scoped>
.registration-wizard {
  max-width: 700px;
  margin: 0 auto;
  padding-bottom: 60px;
}

/* WIZARD HEADER & PROGRESS */
.wizard-header {
  margin-bottom: 32px;
}
.wizard-progress {
  height: 4px;
  background: var(--bg-dark, #121212);
  border-radius: 4px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
}
.progress-fill {
  height: 100%;
  background: var(--primary, #007bff);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.steps-indicator {
  display: flex;
  justify-content: space-between;
}
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  transition: opacity 0.3s;
  position: relative;
  z-index: 2;
}
.step-item.active {
  opacity: 1;
}
.step-item.completed {
  opacity: 0.8;
}
.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-dark, #121212);
  border: 2px solid var(--border-subtle, #333);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted, #aaa);
  transition: all 0.3s;
}
.step-item.active .step-circle {
  border-color: var(--primary, #007bff);
  background: var(--primary, #007bff);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.2);
}
.step-item.completed .step-circle {
  border-color: var(--primary, #007bff);
  color: var(--primary, #007bff);
  background: transparent;
}
.step-label {
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* CARD / BODY */
.card {
  background: var(--bg-card, #1e1e1e);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.step-title {
  margin: 0 0 8px 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #fff;
}
.step-subtitle {
  margin: 0 0 32px 0;
  color: var(--text-muted, #aaa);
  font-size: 0.95rem;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 77, 77, 0.1);
  border: 1px solid rgba(255, 77, 77, 0.3);
  color: #ff4d4d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-weight: 500;
  font-size: 0.9rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.2);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 32px;
}
.info-icon {
  color: var(--primary, #007bff);
  display: flex;
}
.info-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #ccc);
  line-height: 1.4;
}
.info-text strong {
  color: #fff;
  font-weight: 600;
}

/* FORM FIELDS */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: 250px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary, #ccc);
  font-weight: 500;
}
.required {
  color: #ff4d4d;
}

input, select, textarea {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--border-subtle, #444);
  color: #fff;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
}
input::placeholder, textarea::placeholder {
  color: var(--text-muted, #777);
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary, #007bff);
  background: rgba(0,0,0,0.4);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
}
input.has-error, select.has-error {
  border-color: #ff4d4d;
  background: rgba(255,0,0,0.02);
}
.error-text {
  color: #ff4d4d;
  font-size: 0.8rem;
  margin-top: 6px;
  display: block;
  font-weight: 500;
}
.helper-text {
  color: var(--text-muted, #888);
  font-size: 0.8rem;
  margin-top: 6px;
  display: block;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-icon .icon-wrap {
  position: absolute;
  left: 14px;
  color: var(--text-muted, #888);
  display: flex;
}
.input-with-icon input {
  padding-left: 42px;
}

/* FOOTER / BUTTONS */
.wizard-footer {
  display: flex;
  align-items: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.spacer {
  flex: 1;
}

.btn {
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn:active {
  transform: translateY(1px);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.btn-primary {
  background: var(--primary, #007bff);
  color: #fff;
  border: none;
}
.btn-primary:hover:not(:disabled) {
  background: #0069d9;
  box-shadow: 0 6px 12px rgba(0,123,255,0.2);
}
.btn-outline {
  background: transparent;
  color: var(--text-secondary, #ccc);
  border: 1px solid var(--border-subtle, #555);
}
.btn-outline:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
  color: #fff;
  border-color: #888;
}

/* SUCCESS STATE */
.success-message {
  text-align: center;
  padding: 60px 40px;
}
.success-icon {
  width: 80px;
  height: 80px;
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}
.success-message h3 {
  font-size: 1.8rem;
  margin: 0 0 12px 0;
  color: #fff;
}
.success-message p {
  color: var(--text-secondary, #ccc);
  font-size: 1.1rem;
  margin: 0 0 20px 0;
}
.id-badge {
  display: inline-block;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 24px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 1.2rem;
  color: var(--primary, #007bff);
  margin-bottom: 40px;
  letter-spacing: 1px;
}
.success-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* ANIMATIONS */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .card {
    padding: 24px;
  }
  .steps-indicator {
    display: none; /* Hide full steps on mobile to save space */
  }
  .wizard-progress {
    margin-bottom: 0;
  }
}
</style>
