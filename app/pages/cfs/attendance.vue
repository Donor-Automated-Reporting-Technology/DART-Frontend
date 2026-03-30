<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="attendance-page">
      <div class="page-header">
        <h1 class="page-title">Take Attendance</h1>
        <p class="page-subtitle">Record session attendance for CFS beneficiaries</p>
      </div>

      <!-- Step 1: Session Setup (5-Tap Flow) -->
      <div v-if="currentStep === 'setup'" class="session-setup">
        <div class="form-card">
          <h2 class="form-title">Session Details</h2>

          <div class="form-group">
            <label class="form-label">Session Date</label>
            <input
              v-model="sessionDate"
              type="date"
              class="form-input"
              :max="today"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Session Type</label>
            <select v-model="sessionType" class="form-input">
              <option value="">Select session type...</option>
              <option value="teamup">TeamUp</option>
              <option value="general_group_activity">General Group Activity</option>
              <option value="children_sessions">Children Sessions</option>
            </select>
          </div>

          <div class="form-actions">
            <button
              @click="initializeSession"
              :disabled="!canStartSession"
              class="btn btn-primary"
            >
              Start Attendance
            </button>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Step 2: Attendance List -->
      <div v-if="currentStep === 'attendance'" class="attendance-list">
        <div class="list-header">
          <div class="session-info">
            <h2 class="session-title">
              {{ sessionTypeLabel }} - {{ formatDate(sessionDate) }}
            </h2>
            <p class="session-subtitle">Tap children to mark present</p>
          </div>
          <div class="attendance-summary">
            <span class="count-badge present">{{ presentCount }} Present</span>
            <span class="count-badge absent">{{ absentCount }} Absent</span>
          </div>
        </div>

        <div class="beneficiary-list">
          <div
            v-for="beneficiary in beneficiaries"
            :key="beneficiary.id"
            @click="toggleAttendance(beneficiary.id)"
            :class="[
              'beneficiary-item',
              attendanceMap[beneficiary.id] === 'present' ? 'present' : 'absent'
            ]"
          >
            <div class="beneficiary-info">
              <div class="beneficiary-name">
                {{ beneficiary.personal_name }} {{ beneficiary.father_name }}
              </div>
              <div class="beneficiary-meta">
                {{ beneficiary.age_at_registration }} yrs · {{ beneficiary.sex }}
              </div>
            </div>
            <div class="status-indicator">
              <AppIcon
                :name="attendanceMap[beneficiary.id] === 'present' ? 'check-circle' : 'circle'"
                :size="24"
              />
            </div>
          </div>
        </div>

        <div class="form-actions sticky-actions">
          <button @click="cancelSession" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="submitAttendance" class="btn btn-primary">
            Submit Attendance
          </button>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <!-- Step 3: Success Summary -->
      <div v-if="currentStep === 'success'" class="success-summary">
        <div class="success-card">
          <div class="success-icon">
            <AppIcon name="check-circle" :size="48" />
          </div>
          <h2 class="success-title">Attendance Recorded</h2>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{{ lastSubmission.records_count }}</span>
              <span class="stat-label">Total Records</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ lastSubmission.present_count }}</span>
              <span class="stat-label">Present</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ lastSubmission.absent_count }}</span>
              <span class="stat-label">Absent</span>
            </div>
          </div>
          <div class="form-actions">
            <button @click="resetSession" class="btn btn-primary">
              Take Another Attendance
            </button>
            <NuxtLink to="/cfs" class="btn btn-secondary">
              Back to CFS Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { cfsApi } from '../../services/cfsApi';
import {
  getBeneficiariesOffline,
  saveSessionOffline,
  saveAttendanceRecordsOffline,
  updateSessionSyncStatus,
  updateAttendanceSyncStatus,
  seedBeneficiaries,
} from '../../services/offlineDb';
import { useAuthStore } from '../../stores/auth';
import AppIcon from '../../components/interfaces/AppIcon.vue';
import type { Breadcrumb } from '../../interfaces/dashboard';
import type {
  SessionType,
  AttendanceStatus,
  RecordAttendanceResponse
} from '../../interfaces/cfs';

definePageMeta({ middleware: ['auth', 'role-guard'], layout: false, allowedRoles: ['facilitator', 'case_worker'] });
useHead({ title: 'Attendance — CFS — DART' });

const authStore = useAuthStore();

const breadcrumbs: Breadcrumb[] = [
  { title: 'Activities', href: '/cfs' },
  { title: 'Child Friendly Spaces', href: '/cfs' },
  { title: 'Attendance', href: '/cfs/attendance', current: true },
];

// State
type Step = 'setup' | 'attendance' | 'success';
const currentStep = ref<Step>('setup');
const loading = ref(false);
const error = ref('');

// Session data
const sessionDate = ref(new Date().toISOString().split('T')[0]);
const sessionType = ref<SessionType | ''>('');
const sessionId = ref('');
const today = new Date().toISOString().split('T')[0];

// Beneficiaries from database
const beneficiaries = ref<any[]>([]);

// Attendance tracking
const attendanceMap = ref<Record<string, AttendanceStatus>>({});

// Last submission result
const lastSubmission = ref<RecordAttendanceResponse>({
  message: '',
  records_count: 0,
  present_count: 0,
  absent_count: 0,
});

// Computed
const canStartSession = computed(() => {
  return sessionDate.value && sessionType.value;
});

const sessionTypeLabel = computed(() => {
  const labels: Record<SessionType, string> = {
    teamup: 'TeamUp',
    general_group_activity: 'General Group Activity',
    children_sessions: 'Children Sessions',
  };
  return sessionType.value ? labels[sessionType.value as SessionType] : '';
});

const presentCount = computed(() => {
  return Object.values(attendanceMap.value).filter(s => s === 'present').length;
});

const absentCount = computed(() => {
  return beneficiaries.value.length - presentCount.value;
});

// Methods
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function initializeSession() {
  try {
    loading.value = true;
    error.value = '';

    // Generate a client-side UUID for the session (offline-first)
    const localSessionId = uuidv4();
    const now = new Date().toISOString();

    // Save session to IndexedDB immediately
    await saveSessionOffline({
      id: localSessionId,
      sessionDate: sessionDate.value,
      sessionType: sessionType.value as SessionType,
      syncStatus: 'pending',
      clientTimestamp: now,
    });

    sessionId.value = localSessionId;

    // Try to sync session and pull fresh beneficiaries if online
    try {
      const token = authStore.accessToken || undefined;
      const sessionResponse = await cfsApi.createSession({
        session_date: sessionDate.value,
        session_type: sessionType.value as SessionType,
      }, token);

      // Update local record with server ID
      await updateSessionSyncStatus(localSessionId, 'synced', sessionResponse.session.id);

      // Pull fresh beneficiaries from server into IndexedDB
      const beneficiariesResponse = await cfsApi.getBeneficiaries(token);
      const serverList = Array.isArray(beneficiariesResponse.beneficiaries)
        ? beneficiariesResponse.beneficiaries
        : Array.isArray(beneficiariesResponse) ? beneficiariesResponse : [];

      if (serverList.length) {
        await seedBeneficiaries(serverList);
      }
    } catch {
      // Offline or failed — we'll work from cached data
    }

    // Load beneficiaries from IndexedDB (includes both synced + pending local records)
    const localBeneficiaries = await getBeneficiariesOffline();

    if (localBeneficiaries.length) {
      beneficiaries.value = localBeneficiaries.map(b => ({
        id: b.serverId ?? b.id,   // prefer server ID if available for API calls
        localId: b.id,            // keep local ID for reference
        personal_name: b.personalName,
        father_name: b.fatherName,
        age_at_registration: b.ageAtRegistration,
        sex: b.sex,
      }));
    } else {
      // Fallback: try API directly
      try {
        const token = authStore.accessToken || undefined;
        const beneficiariesResponse = await cfsApi.getBeneficiaries(token);
        const serverList = Array.isArray(beneficiariesResponse.beneficiaries)
          ? beneficiariesResponse.beneficiaries
          : Array.isArray(beneficiariesResponse) ? beneficiariesResponse : [];
        beneficiaries.value = serverList;
        if (serverList.length) await seedBeneficiaries(serverList);
      } catch {
        beneficiaries.value = [];
      }
    }

    if (!beneficiaries.value || beneficiaries.value.length === 0) {
      error.value = 'No beneficiaries found. Please register beneficiaries first or sync data.';
      loading.value = false;
      return;
    }

    // Initialize all as absent
    beneficiaries.value.forEach(b => {
      attendanceMap.value[b.id] = 'absent';
    });

    currentStep.value = 'attendance';
  } catch (err: any) {
    console.error('Session initialization error:', err);
    error.value = err?.message || 'Failed to create session. Please try again.';
  } finally {
    loading.value = false;
  }
}

function toggleAttendance(beneficiaryId: string) {
  const current = attendanceMap.value[beneficiaryId];
  attendanceMap.value[beneficiaryId] = current === 'present' ? 'absent' : 'present';
}

async function submitAttendance() {
  try {
    loading.value = true;
    error.value = '';

    const now = new Date().toISOString();
    const records = Object.entries(attendanceMap.value).map(([beneficiary_id, status]) => ({
      beneficiary_id,
      status,
    }));

    // Save attendance records to IndexedDB immediately (offline-first)
    const offlineRecords = records.map(r => ({
      id: uuidv4(),
      sessionId: sessionId.value,
      beneficiaryId: r.beneficiary_id,
      status: r.status as AttendanceStatus,
      syncStatus: 'pending' as const,
      clientTimestamp: now,
    }));
    await saveAttendanceRecordsOffline(offlineRecords);

    // Try to sync immediately if online
    let syncedResponse: RecordAttendanceResponse | null = null;
    try {
      const token = authStore.accessToken || undefined;

      // Resolve the server session ID if we have it
      const { db } = await import('../../services/offlineDb');
      const localSession = await db.cfsSessions.get(sessionId.value);
      const serverSessionId = localSession?.serverId ?? sessionId.value;

      const response = await cfsApi.recordAttendance({
        session_id: serverSessionId,
        records,
      }, token);

      // Mark attendance records as synced
      await updateAttendanceSyncStatus(offlineRecords.map(r => r.id), 'synced');

      syncedResponse = response;
    } catch {
      // Offline — records are safely stored locally, will sync later
    }

    // Show success summary
    lastSubmission.value = syncedResponse ?? {
      message: 'Saved offline — will sync when connected',
      records_count: records.length,
      present_count: records.filter(r => r.status === 'present').length,
      absent_count: records.filter(r => r.status === 'absent').length,
    };
    currentStep.value = 'success';
  } catch (err: any) {
    error.value = err?.message || 'Failed to record attendance. Please try again.';
  } finally {
    loading.value = false;
  }
}

function cancelSession() {
  if (confirm('Are you sure you want to cancel? All attendance data will be lost.')) {
    resetSession();
  }
}

function resetSession() {
  currentStep.value = 'setup';
  sessionId.value = '';
  beneficiaries.value = [];
  attendanceMap.value = {};
  error.value = '';
  sessionDate.value = new Date().toISOString().split('T')[0];
  sessionType.value = '';
}
</script>

<style scoped>
.attendance-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Session Setup */
.form-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2rem;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-base);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Attendance List */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.session-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.session-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.attendance-summary {
  display: flex;
  gap: 0.75rem;
}

.count-badge {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
}

.count-badge.present {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.count-badge.absent {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.beneficiary-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.beneficiary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.beneficiary-item:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.beneficiary-item.present {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.beneficiary-item.absent {
  border-color: var(--border-color);
}

.beneficiary-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.beneficiary-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.status-indicator {
  color: var(--text-muted);
}

.beneficiary-item.present .status-indicator {
  color: #22c55e;
}

/* Success Summary */
.success-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 3rem 2rem;
  text-align: center;
}

.success-icon {
  color: #22c55e;
  margin-bottom: 1rem;
}

.success-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2rem 0;
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.sticky-actions {
  position: sticky;
  bottom: 1rem;
  background: var(--bg-base);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-panel);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-panel-hover);
}

/* Error Message */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: var(--radius-sm);
  color: #ef4444;
  font-size: 0.875rem;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .form-card, .success-card {
    padding: 1.5rem;
  }

  .list-header {
    flex-direction: column;
  }

  .summary-stats {
    gap: 1.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}
</style>
