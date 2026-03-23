<template>
  <div class="input-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="id">{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="input-wrapper">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :disabled="disabled"
        :autofocus="autofocus"
        @blur="$emit('blur', $event)"
      />
    </div>
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  autofocus?: boolean;
}>();

defineEmits(['update:modelValue', 'blur']);
</script>

<style scoped>
.input-field {
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

input {
  width: 100%;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1rem;
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

.error-text {
  color: var(--error);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
</style>
