import { ref, computed } from 'vue';
import { cfsApi } from '../services/cfsApi';
import type { StaffAssignment, CfsLocation, SessionTypeToggle } from '../interfaces/cfs';

import { fetchOnboardingStatus } from '../services/onboardingApi';

// ── Shared State (Singleton) ────────────────────────────────────────────────
const isLoading = ref(false);
const error = ref<string | null>(null);

const cfsLocations = ref<CfsLocation[]>([]);

// Step 1: Staff assignments
const staffAssignments = ref<StaffAssignment[]>([]);

// Step 2: Grant targets form state
const targetsForm = ref({
  period_start: '',
  period_end: '',
  total_children: 0,
  girls: 0,
  children_with_disability: 0,
  sessions: 0,
});

// Step 3: Location Session types state
const sessionTypesMap = ref<Record<string, SessionTypeToggle[]>>({});

// ── Progress & Completion indicators ───────────────────────────────────────
const step1Completed = ref(false);
const step2Completed = ref(false);
const step3Completed = ref(false);

const progressPercentage = computed(() => {
  let completed = 0;
  if (step1Completed.value) completed++;
  if (step2Completed.value) completed++;
  if (step3Completed.value) completed++;
  return Math.round((completed / 3) * 100);
});

export const useCfsConfig = () => {

  // ── Actions ────────────────────────────────────────────────────────────────

  const fetchLocations = async () => {
    try {
      const response = await fetchOnboardingStatus();
      if (response.organisation?.operating_locations) {
        cfsLocations.value = response.organisation.operating_locations
          .filter(loc => loc.id) // Ensure ID is present
          .map(loc => ({
            id: loc.id!,
            name: loc.name
          }));
      }
    } catch (e) {
      console.error('Failed to load real CFS locations:', e);
    }
  };

  const fetchStaffAssignments = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await cfsApi.getStaffAssignments();
      staffAssignments.value = response.assignments || [];
      // If we have active assignments, we can consider Step 1 somewhat complete, 
      // but let's just use manual completion markers or depend on the user explicitly saving.
      if (staffAssignments.value.some(a => a.is_active)) {
        step1Completed.value = true;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch staff assignments';
    } finally {
      isLoading.value = false;
    }
  };

  const assignStaff = async (userId: string, locationId: string, startDate: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      await cfsApi.assignStaff({
        user_id: userId,
        cfs_location_id: locationId,
        start_date: startDate,
      });
      // Optionally re-fetch assignments
      await fetchStaffAssignments();
      step1Completed.value = true;
    } catch (e: any) {
      error.value = e.message || 'Failed to assign staff';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const saveGrantTargets = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await cfsApi.upsertGrantTargets({
        period_start: targetsForm.value.period_start,
        period_end: targetsForm.value.period_end,
        target_values: {
          total_children: targetsForm.value.total_children,
          girls: targetsForm.value.girls,
          children_with_disability: targetsForm.value.children_with_disability,
          sessions: targetsForm.value.sessions,
        }
      });
      step2Completed.value = true;
    } catch (e: any) {
      error.value = e.message || 'Failed to save grant targets';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const saveLocationSessionTypes = async (locationId: string, toggles: SessionTypeToggle[]) => {
    isLoading.value = true;
    error.value = null;
    try {
      await cfsApi.upsertLocationSessionTypes({
        cfs_location_id: locationId,
        session_types: toggles,
      });
      // Mark step 3 as complete once at least one location is configured.
      step3Completed.value = true;
    } catch (e: any) {
      error.value = e.message || 'Failed to save session types';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchGrantTargets = async () => {
    isLoading.value = true;
    try {
      const targets = await cfsApi.getGrantTargets();
      if (targets) {
        targetsForm.value.period_start = targets.period_start;
        targetsForm.value.period_end = targets.period_end;
        targetsForm.value.total_children = targets.target_values.total_children;
        targetsForm.value.girls = targets.target_values.girls;
        targetsForm.value.children_with_disability = targets.target_values.children_with_disability;
        targetsForm.value.sessions = targets.target_values.sessions;
        step2Completed.value = true;
      }
    } catch (e: any) {
      console.error('Failed to fetch grant targets', e);
    } finally {
      isLoading.value = false;
    }
  };

  const fetchSessionTypes = async () => {
    if (cfsLocations.value.length === 0) return;
    
    isLoading.value = true;
    try {
      let hasConfigured = false;
      await Promise.all(cfsLocations.value.map(async (loc) => {
        const response = await cfsApi.getLocationSessionTypes(loc.id).catch(() => null);
        if (response && response.session_types && response.session_types.length > 0) {
          sessionTypesMap.value[loc.id] = response.session_types;
          hasConfigured = true;
        }
      }));
      if (hasConfigured) {
        step3Completed.value = true;
      }
    } catch (e: any) {
      console.error('Failed to fetch location session types', e);
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize toggles for all mock locations if undefined
  const getSessionTogglesForLocation = (locationId: string): SessionTypeToggle[] => {
    if (!sessionTypesMap.value[locationId]) {
      sessionTypesMap.value[locationId] = [
        { type: 'general_group_activity', is_active: false },
        { type: 'teamup', is_active: false },
        { type: 'children_sessions', is_active: false },
      ];
    }
    return sessionTypesMap.value[locationId];
  };

  return {
    isLoading,
    error,
    cfsLocations,
    staffAssignments,
    targetsForm,
    sessionTypesMap,
    step1Completed,
    step2Completed,
    step3Completed,
    progressPercentage,
    fetchLocations,
    fetchStaffAssignments,
    fetchGrantTargets,
    fetchSessionTypes,
    assignStaff,
    saveGrantTargets,
    saveLocationSessionTypes,
    getSessionTogglesForLocation,
  };
};
