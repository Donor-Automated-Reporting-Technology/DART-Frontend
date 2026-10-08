<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="id">{{ label }}</label>
    <div class="ui-password">
      <input
        :id="id"
        class="ui-input"
        :type="showPassword ? 'text' : 'password'"
        :name="name || id"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete || (showStrength ? 'new-password' : 'current-password')"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
      >
      <button
        type="button"
        class="ui-reveal"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        :aria-pressed="showPassword"
        :aria-controls="id"
        @click="showPassword = !showPassword"
      >
        <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
      </button>
    </div>

    <!-- New passwords: the requirements, ticked off as they are met. -->
    <ul v-if="checklist.length" :id="`${id}-rules`" class="ui-checklist" aria-label="Password requirements">
      <li v-for="rule in checklist" :key="rule.label" :class="{ met: rule.met }">
        <span class="mark" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        {{ rule.label }}<span class="visually-hidden">{{ rule.met ? ' (met)' : ' (not met)' }}</span>
      </li>
    </ul>

    <FieldError :id="`${id}-error`" :message="error" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FieldError from './FieldError.vue';

export interface PasswordRule { label: string; test: (value: string) => boolean }

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  autocomplete?: string;
  /** Show the requirements checklist (new-password fields). */
  showStrength?: boolean;
  /** Requirements to list; defaults to the registration rules. */
  rules?: PasswordRule[];
}>();

defineEmits(['update:modelValue', 'blur']);

const showPassword = ref(false);

// Mirrors the rules useRegistration validates (display only).
const defaultRules: PasswordRule[] = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'Includes a number', test: v => /\d/.test(v) },
];

const checklist = computed(() => {
  const rules = props.rules ?? (props.showStrength ? defaultRules : []);
  const value = props.modelValue || '';
  return rules.map(r => ({ label: r.label, met: r.test(value) }));
});

const describedBy = computed(() =>
  [checklist.value.length ? `${props.id}-rules` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined
);
</script>
