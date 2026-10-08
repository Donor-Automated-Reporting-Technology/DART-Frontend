<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="id">
      {{ label }}<span v-if="optional" class="ui-optional"> (optional)</span>
    </label>
    <input
      :id="id"
      class="ui-input"
      :type="type || 'text'"
      :name="name || id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autofocus="autofocus"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
    >
    <p v-if="help" :id="`${id}-help`" class="ui-help">{{ help }}</p>
    <FieldError :id="`${id}-error`" :message="error" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldError from './FieldError.vue'

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  error?: string;
  help?: string;
  autofocus?: boolean;
  autocomplete?: string;
  inputmode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'url' | 'search' | 'none';
}>();

defineEmits(['update:modelValue', 'blur']);

const describedBy = computed(() =>
  [props.help ? `${props.id}-help` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined
)
</script>
