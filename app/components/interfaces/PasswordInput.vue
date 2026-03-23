<template>
  <div class="password-input" :class="{ 'has-error': error }">
    <label v-if="label" :for="id">{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="input-wrapper">
      <input
        :id="id"
        :type="showPassword ? 'text' : 'password'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :disabled="disabled"
        @blur="$emit('blur', $event)"
      />
      <button 
        type="button" 
        class="toggle-btn" 
        @click="showPassword = !showPassword"
        tabindex="-1"
      >
        {{ showPassword ? 'Hide' : 'Show' }}
      </button>
    </div>
    
    <div v-if="showStrength && modelValue" class="strength-meter">
      <div class="strength-bar" :class="strengthClass" :style="{ width: strengthPercent + '%' }"></div>
    </div>
    
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showStrength?: boolean;
}>();

defineEmits(['update:modelValue', 'blur']);

const showPassword = ref(false);

const strengthPercent = computed(() => {
  const val = props.modelValue || '';
  let score = 0;
  if (val.length >= 8) score += 40;
  if (/[A-Z]/.test(val)) score += 20;
  if (/\d/.test(val)) score += 20;
  if (/[^A-Za-z0-9]/.test(val)) score += 20;
  return Math.min(score, 100);
});

const strengthClass = computed(() => {
  const p = strengthPercent.value;
  if (p < 40) return 'weak';
  if (p < 80) return 'medium';
  return 'strong';
});
</script>

<style scoped>
.password-input {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}
label {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.required {
  color: var(--error);
}
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
input {
  width: 100%;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 3.5rem 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}
input:focus {
  border-color: var(--primary);
}
.has-error input {
  border-color: var(--error);
}
.toggle-btn {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}
.toggle-btn:hover {
  text-decoration: underline;
}
.error-text {
  color: var(--error);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
.strength-meter {
  height: 4px;
  background-color: var(--border-color);
  margin-top: 0.5rem;
  border-radius: 2px;
  overflow: hidden;
}
.strength-bar {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}
.weak { background-color: var(--error); }
.medium { background-color: #faad14; }
.strong { background-color: var(--success); }
</style>
