<template>
  <div class="textarea-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="id">{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="input-wrapper">
      <textarea
        :id="id"
        :value="modelValue"
        @input="onInput"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        rows="4"
        @blur="$emit('blur', $event)"
      ></textarea>
    </div>
    <div class="bottom-info">
      <span v-if="error" class="error-text">{{ error }}</span>
      <span v-else class="spacer"></span>
      <span v-if="maxlength" class="char-count" :class="{ 'near-limit': charsLeft <= 20 }">
        {{ modelValue.length || 0 }} / {{ maxlength }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  maxlength?: number;
}>();

const emit = defineEmits(['update:modelValue', 'blur']);

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const charsLeft = computed(() => {
  if (!props.maxlength) return 999;
  return props.maxlength - (props.modelValue?.length || 0);
});
</script>

<style scoped>
.textarea-field {
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
textarea {
  width: 100%;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  font-family: inherit;
}
textarea:focus {
  border-color: var(--primary);
}
.has-error textarea {
  border-color: var(--error);
}
.bottom-info {
  display: flex;
  justify-content: space-between;
  margin-top: 0.25rem;
  font-size: 0.8rem;
}
.error-text {
  color: var(--error);
}
.char-count {
  color: var(--text-secondary);
}
.char-count.near-limit {
  color: #faad14;
}
.spacer {
  flex-grow: 1;
}
</style>
