<!--
  PssDiscardConfirmModal — minimal confirm dialog for the schedule
  setup screen's Cancel button (DART-47).

  Stateless: parent controls `open` and decides what "confirm" means.
  Renders inside a <Teleport to="body"> so backdrop covers app chrome.
-->
<template>
  <Teleport to="body">
    <transition name="discard-fade">
      <div
        v-if="open"
        class="discard-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="$emit('cancel')"
      >
        <div class="discard-card">
          <div class="discard-card__head">
            <AppIcon name="alert-circle" :size="22" class="discard-icon" />
            <h2 :id="titleId" class="discard-title">Discard changes?</h2>
          </div>
          <p class="discard-body">
            {{ message }}
          </p>
          <div class="discard-actions">
            <button
              ref="cancelButtonRef"
              type="button"
              class="btn btn--ghost"
              @click="$emit('cancel')"
            >
              Keep editing
            </button>
            <button
              type="button"
              class="btn btn--danger"
              @click="$emit('confirm')"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue';

interface Props {
  open: boolean;
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message:
    'Your unsaved changes to this schedule setup will be lost.',
});

defineEmits<{
  confirm: [];
  cancel: [];
}>();

const titleId = useId();
const cancelButtonRef = ref<HTMLButtonElement | null>(null);

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    await nextTick();
    cancelButtonRef.value?.focus();
  },
);
</script>

<style scoped>
.discard-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 26, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.discard-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface-1, #0f0f1a);
  border: 1px solid var(--border, #2a2a3e);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.discard-card__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.discard-icon {
  color: var(--warning, #f59e0b);
  flex-shrink: 0;
}

.discard-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text, #fff);
}

.discard-body {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted, #9ca3af);
  line-height: 1.45;
}

.discard-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.625rem 1rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 40px;
}

.btn--ghost {
  background: transparent;
  color: var(--text, #fff);
  border-color: var(--border, #2a2a3e);
}

.btn--ghost:hover {
  background: var(--surface-2, #1a1a2e);
}

.btn--danger {
  background: var(--danger, #ef4444);
  color: #fff;
}

.btn--danger:hover {
  background: #dc2626;
}

.btn:focus-visible {
  outline: 2px solid var(--accent, #818cf8);
  outline-offset: 2px;
}

.discard-fade-enter-active,
.discard-fade-leave-active {
  transition: opacity 140ms ease;
}

.discard-fade-enter-from,
.discard-fade-leave-to {
  opacity: 0;
}
</style>
