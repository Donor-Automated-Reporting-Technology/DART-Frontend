<template>
  <div class="cfs-step">
    <h2>3. Location Session Types</h2>
    <p class="description">Activate or deactivate session types for each CFS location.</p>
    
    <div class="locations-grid">
      <div v-for="loc in cfsLocations" :key="loc.id" class="location-card">
        <h3 class="location-name">{{ loc.name }}</h3>
        
        <div class="toggles-list">
          <label v-for="toggle in getSessionTogglesForLocation(loc.id)" :key="toggle.type" class="toggle-row">
            <span class="type-label">{{ formatTypeLabel(toggle.type) }}</span>
            <input 
              type="checkbox" 
              v-model="toggle.is_active" 
            />
          </label>
        </div>
        
        <div class="card-actions">
          <button 
            @click="handleSave(loc.id)" 
            class="btn btn-secondary"
            :disabled="isLoading"
          >
            Save for {{ loc.name }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="error" class="error-text">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { useCfsConfig } from '../../composables/useCfsConfig';

const { 
  cfsLocations, 
  getSessionTogglesForLocation,
  saveLocationSessionTypes,
  isLoading,
  error
} = useCfsConfig();

const formatTypeLabel = (type: string) => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const handleSave = async (locationId: string) => {
  try {
    const toggles = getSessionTogglesForLocation(locationId);
    await saveLocationSessionTypes(locationId, toggles);
  } catch (e) {
    // Error mapped in composable
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
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.location-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.location-name {
  margin: 0;
  font-size: 1rem;
  color: #fff;
  border-bottom: 1px solid var(--border-subtle, #333);
  padding-bottom: 8px;
}
.toggles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.type-label {
  font-size: 0.9rem;
  color: var(--text-secondary, #ccc);
}
.card-actions {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: opacity 0.2s;
}
.btn:hover:not(:disabled) {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-secondary {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.error-text {
  color: var(--error, #ff4d4d);
  font-size: 0.85rem;
  margin-top: 10px;
}
</style>
