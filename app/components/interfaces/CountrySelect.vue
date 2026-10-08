<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="id">{{ label }}</label>
    <select
      :id="id"
      class="ui-select"
      :name="name || id"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      autocomplete="country"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      @blur="$emit('blur', $event)"
    >
      <option value="" disabled>{{ placeholder || 'Select a country' }}</option>
      <option v-for="country in countries" :key="country.code" :value="country.code">
        {{ country.name }}
      </option>
    </select>
    <FieldError :id="`${id}-error`" :message="error" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FieldError from './FieldError.vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}>();

defineEmits(['update:modelValue', 'blur']);

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
