<template>
  <div
    class="floating-field"
    :class="{
      'floating-field--focused': isFocused,
      'floating-field--filled': hasValue,
      'floating-field--error': error,
      'floating-field--success': success,
      'floating-field--textarea': textarea,
    }"
  >
    <div class="floating-field__wrap">
      <component
        :is="textarea ? 'textarea' : 'input'"
        :id="fieldId"
        ref="inputRef"
        class="floating-field__input"
        :type="textarea ? undefined : type"
        :value="modelValue"
        :rows="textarea ? rows : undefined"
        :min="min"
        :max="max"
        :required="required"
        :disabled="disabled"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <label class="floating-field__label" :for="fieldId">
        {{ label }}
        <span v-if="optional" class="floating-field__optional">optional</span>
      </label>
      <span v-if="success && !error" class="floating-field__icon floating-field__icon--success">
        <svg viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>
    <Transition name="field-err">
      <span v-if="error" class="floating-field__error">{{ error }}</span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useId } from 'vue'

const props = defineProps<{
  modelValue: string | number | null
  label: string
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
const isFocused = ref(false)

const hasValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return false
  return String(props.modelValue).length > 0
})
</script>

<style scoped>
.floating-field {
  position: relative;
}

.floating-field__wrap {
  position: relative;
  border-radius: 14px;
  background: var(--bg-input, #f9f9fb);
  border: 1.5px solid var(--border-color);
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.floating-field--focused .floating-field__wrap {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

.floating-field--error .floating-field__wrap {
  border-color: var(--error);
  box-shadow: none;
  animation: field-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.floating-field--success .floating-field__wrap {
  border-color: #34c759;
}

.floating-field__input {
  width: 100%;
  padding: 22px 16px 8px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.92rem;
  font-family: inherit;
  line-height: 1.4;
  box-sizing: border-box;
  resize: none;
}

.floating-field--textarea .floating-field__input {
  min-height: 72px;
  resize: vertical;
}

.floating-field__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.floating-field__label {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  font-size: 0.88rem;
  color: var(--text-muted);
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left;
  display: flex;
  align-items: center;
  gap: 6px;
}

.floating-field--textarea .floating-field__label {
  top: 18px;
  transform: translateY(0);
}

.floating-field--focused .floating-field__label,
.floating-field--filled .floating-field__label {
  top: 10px;
  transform: translateY(0) scale(0.75);
  color: var(--text-muted);
}

.floating-field--focused .floating-field__label {
  color: var(--primary);
}

.floating-field--textarea.floating-field--focused .floating-field__label,
.floating-field--textarea.floating-field--filled .floating-field__label {
  top: 6px;
  transform: scale(0.75);
}

.floating-field__optional {
  font-size: 0.78rem;
  font-weight: 400;
  opacity: 0.6;
}

.floating-field__icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
}

.floating-field__icon--success {
  color: #34c759;
  animation: field-tick 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-field__icon--success svg {
  width: 18px;
  height: 18px;
}

.floating-field__error {
  display: block;
  font-size: 0.72rem;
  color: var(--error);
  margin-top: 4px;
  padding-left: 4px;
}

.field-err-enter-active { animation: field-err-in 0.25s ease; }
.field-err-leave-active { animation: field-err-in 0.15s ease reverse; }

@keyframes field-err-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes field-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}

@keyframes field-tick {
  0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
  60% { transform: translateY(-50%) scale(1.15); }
  100% { opacity: 1; transform: translateY(-50%) scale(1); }
}
</style>
