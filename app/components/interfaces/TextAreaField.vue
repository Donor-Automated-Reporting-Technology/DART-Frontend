<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="id">
      {{ label }}<span v-if="optional" class="ui-optional"> (optional)</span>
    </label>
    <textarea
      :id="id"
      class="ui-textarea"
      :name="name || id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :maxlength="maxlength"
      :rows="rows ?? 4"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="onInput"
      @blur="$emit('blur', $event)"
    />
    <div v-if="maxlength && !error" :id="`${id}-count`" class="ui-help count" :class="{ near: charsLeft <= 20 }">
      {{ modelValue?.length || 0 }} / {{ maxlength }}
    </div>
    <FieldError :id="`${id}-error`" :message="error" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FieldError from './FieldError.vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  error?: string;
  maxlength?: number;
  rows?: number;
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

const describedBy = computed(() =>
  [props.maxlength && !props.error ? `${props.id}-count` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined
);
</script>

<style scoped>
.count { text-align: right; }
.count.near { color: var(--text-primary); }
</style>
