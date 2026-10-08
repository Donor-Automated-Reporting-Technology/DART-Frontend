<template>
  <!-- Labelled field (label above, always visible). The name is kept for
       existing imports; it no longer floats. -->
  <div class="ui-field">
    <label class="ui-label" :for="fieldId">
      {{ label }}<span v-if="optional" class="ui-optional"> (optional)</span>
    </label>
    <div class="wrap">
      <component
        :is="textarea ? 'textarea' : 'input'"
        :id="fieldId"
        ref="inputRef"
        :class="textarea ? 'ui-textarea' : 'ui-input'"
        :type="textarea ? undefined : type"
        :inputmode="!textarea && type === 'number' ? 'numeric' : undefined"
        :value="modelValue"
        :placeholder="placeholder"
        :rows="textarea ? rows : undefined"
        :min="min"
        :max="max"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${fieldId}-error` : undefined"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="success && !error && !textarea" class="ok" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </span>
    </div>
    <FieldError :id="`${fieldId}-error`" :message="error" />
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'
import FieldError from '../interfaces/FieldError.vue'

defineProps<{
  modelValue: string | number | null
  label: string
  placeholder?: string
  type?: string
  textarea?: boolean
  rows?: number
  min?: number
  max?: number
  required?: boolean
  optional?: boolean
  disabled?: boolean
  error?: string
  success?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const fieldId = `fi-${useId()}`
const inputRef = ref<HTMLInputElement | null>(null)
</script>

<style scoped>
.wrap { position: relative; }
.wrap .ui-input { padding-right: 40px; }
.ok {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  color: var(--link);
  pointer-events: none;
}
</style>
