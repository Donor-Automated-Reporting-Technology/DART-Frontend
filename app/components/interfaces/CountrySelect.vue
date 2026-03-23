<template>
  <div class="country-select" :class="{ 'has-error': error }">
    <label v-if="label" :for="id">{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="select-wrapper">
      <select
        :id="id"
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :disabled="disabled"
      >
        <option value="" disabled>{{ placeholder || 'Select a country' }}</option>
        <option v-for="country in countries" :key="country.code" :value="country.code">
          {{ country.name }}
        </option>
      </select>
    </div>
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}>();

defineEmits(['update:modelValue']);

// A standard list for demonstration.
const countries = ref([
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'IN', name: 'India' }
].sort((a, b) => a.name.localeCompare(b.name)));
</script>

<style scoped>
.country-select {
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
select {
  width: 100%;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  appearance: none;
  cursor: pointer;
}
select:focus {
  border-color: var(--primary);
}
.has-error select {
  border-color: var(--error);
}
.error-text {
  color: var(--error);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
</style>
