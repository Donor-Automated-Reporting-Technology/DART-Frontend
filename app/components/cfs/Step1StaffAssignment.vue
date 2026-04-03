<template>
  <div class="cfs-step">
    <h2>1. Staff Assignment</h2>
    <p class="description">Assign active facilitators and case workers to a CFS location.</p>
    
    <div v-if="isLoading" class="loading">Loading staff...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="staff-list">
      <div v-for="staff in staffAssignments" :key="staff.user_id" class="staff-card">
        <div class="staff-info">
          <span class="staff-name">{{ staff.full_name || staff.user_id }}</span>
          <span class="staff-role">{{ staff.role || 'Unknown role' }}</span>
          <span v-if="staff.is_active" class="current-location">
            Current: {{ staff.location_name }}
          </span>
        </div>
        
        <div class="staff-actions">
          <select v-model="getStaffState(staff.user_id).locationId" class="select-field">
            <option value="" disabled>Select Location</option>
            <option v-for="loc in cfsLocations" :key="loc.id" :value="loc.id">
              {{ loc.name }}
            </option>
          </select>
          
          <input 
            type="date" 
            v-model="getStaffState(staff.user_id).startDate" 
            class="date-field" 
          />
          
          <button 
            @click="handleAssign(staff.user_id)" 
            class="btn btn-primary"
            :disabled="!getStaffState(staff.user_id).locationId || !getStaffState(staff.user_id).startDate"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useCfsConfig } from '../../composables/useCfsConfig';

const { 
  staffAssignments, 
  cfsLocations, 
  fetchStaffAssignments, 
  assignStaff,
  isLoading,
  error
} = useCfsConfig();

// Local form state for each staff member: { [userId]: { locationId, startDate } }
const assignmentsState = ref<Record<string, { locationId: string, startDate: string }>>({});

const getStaffState = (userId: string) => {
  if (!assignmentsState.value[userId]) {
    assignmentsState.value[userId] = {
      locationId: '',
      startDate: new Date().toISOString().split('T')[0]!
    };
  }
  return assignmentsState.value[userId]!;
};

// Initialize state for each staff
watch(staffAssignments, (newStaff) => {
  newStaff.forEach(s => {
    const state = getStaffState(s.user_id);
    if (s.cfs_location_id) {
      state.locationId = s.cfs_location_id as string;
    }
  });
}, { immediate: true });

onMounted(() => {
  if (staffAssignments.value.length === 0) {
    fetchStaffAssignments();
  }
});

const handleAssign = async (userId: string) => {
  const state = getStaffState(userId);
  if (state.locationId && state.startDate) {
    try {
      await assignStaff(userId, state.locationId, state.startDate);
      // alert('Staff assigned successfully');
    } catch (e) {
      // Error handled in composable
    }
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
.staff-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.staff-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.03);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.05);
}
.staff-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.staff-name {
  font-weight: 600;
  color: #fff;
}
.staff-role {
  font-size: 0.8rem;
  color: var(--text-muted, #aaa);
  text-transform: capitalize;
}
.current-location {
  font-size: 0.75rem;
  color: var(--primary, #007bff);
  margin-top: 4px;
}
.staff-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.select-field, .date-field {
  padding: 8px 12px;
  background: var(--bg-dark, #121212);
  border: 1px solid var(--border-subtle, #333);
  color: #fff;
  border-radius: 4px;
  font-size: 0.9rem;
}
.btn {
  padding: 8px 16px;
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
.loading, .error {
  padding: 20px;
  text-align: center;
  color: var(--text-muted, #aaa);
}
.error {
  color: var(--error, #ff4d4d);
}

@media (max-width: 768px) {
  .staff-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .staff-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
