<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Registration Error</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button class="primary-btn" @click="close">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  message: string;
}>();

const emit = defineEmits(['update:isOpen']);

const close = () => {
  emit('update:isOpen', false);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  animation: modal-enter 0.3s ease-out;
}

@keyframes modal-enter {
  from { opacity: 0; transform: translateY(-20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--error);
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.5;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.primary-btn:hover {
  background-color: #1062c0;
}
</style>
