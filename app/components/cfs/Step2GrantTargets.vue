<template>
  <div class="cfs-step">
    <h2>2. Grant Targets</h2>
    <p class="description">Define the combined CFS grant period and overall target values.</p>
    
    <form @submit.prevent="handleSave" class="targets-form">
      <div class="form-row">
        <div class="form-group">
          <label>Period Start</label>
          <input type="date" v-model="targetsForm.period_start" class="input-field" required />
        </div>
        <div class="form-group">
          <label>Period End</label>
          <input type="date" v-model="targetsForm.period_end" class="input-field" required />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Total Children Target</label>
          <input type="number" min="0" v-model.number="targetsForm.total_children" class="input-field" required />
        </div>
        <div class="form-group">
          <label>Girls Sub-target</label>
          <input type="number" min="0" v-model.number="targetsForm.girls" class="input-field" required />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Children with Disability Sub-target</label>
          <input type="number" min="0" v-model.number="targetsForm.children_with_disability" class="input-field" required />
        </div>
        <div class="form-group">
          <label>Total Sessions Target</label>
          <input type="number" min="0" v-model.number="targetsForm.sessions" class="input-field" required />
        </div>
      </div>
      
      <div class="form-actions">
        <div v-if="error" class="error-text">{{ error }}</div>
        <button type="submit" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Saving...' : 'Save Targets' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useCfsConfig } from '../../composables/useCfsConfig';

const { targetsForm, saveGrantTargets, isLoading, error } = useCfsConfig();

const handleSave = async () => {
  try {
    await saveGrantTargets();
  } catch (e) {
    // Error handled in composable
  }
};
</script>

<style scoped>
.cfs-step {
  background: var(--bg-card, #1e1e1e);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}
h2 {
  margin-top: 0;
  color: var(--text-primary, #fff);
  font-size: 1.2rem;
}
.description {
  color: var(--text-muted, #aaa);
  font-size: 0.9rem;
  margin-bottom: 20px;
}
.targets-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: flex;
  gap: 16px;
}
.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
label {
  font-size: 0.85rem;
  color: var(--text-secondary, #ccc);
  font-weight: 500;
}
.input-field {
  padding: 10px 12px;
  background: var(--bg-dark, #121212);
  border: 1px solid var(--border-subtle, #333);
  color: #fff;
  border-radius: 4px;
  font-size: 0.95rem;
  width: 100%;
}
.input-field:focus {
  outline: none;
  border-color: var(--primary, #007bff);
}
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 10px;
}
.error-text {
  color: var(--error, #ff4d4d);
  font-size: 0.85rem;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}
.btn:hover:not(:disabled) {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--primary, #007bff);
  color: #fff;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
