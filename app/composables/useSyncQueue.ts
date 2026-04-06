import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { cfsApi } from '../services/cfsApi';
import { ApiError } from '../services/api';
import {
  db,
  getPendingBeneficiaries,
  getPendingCfsRegistrations,
  getPendingSessions,
  getPendingAttendanceRecords,
  updateBeneficiarySyncStatus,
  updateCfsRegistrationSyncStatus,
  updateSessionSyncStatus,
  updateAttendanceSyncStatus,
  getPendingCount,
  getConflictCount,
  seedBeneficiaries,
} from '../services/offlineDb';
import type {
  OfflineBeneficiary,
  OfflineCfsRegistration,
  OfflineCfsSession,
  OfflineAttendanceRecord,
} from '../interfaces/cfs';

/**
 * useSyncQueue
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the offline → online sync pipeline.
 *
 * Sync order (FK dependencies):
 *   1. beneficiaries       → POST /cfs/beneficiaries
 *   2. cfs_registrations   → POST /cfs/registrations  (needs server beneficiary_id)
 *   3. cfs_sessions        → POST /cfs/sessions
 *   4. attendance_records  → POST /cfs/attendance      (needs server session_id + beneficiary_id)
 *
 * After sync, local UUIDs are remapped to server IDs.
 */
export const useSyncQueue = () => {
  const isSyncing = ref(false);
  const pendingCount = ref(0);
  const conflictCount = ref(0);
  const syncError = ref('');
  const syncLog = ref<string[]>([]);
  const lastSyncTime = ref<string | null>(null);

  // Map: localId → serverId (populated during sync)
  const idMap = new Map<string, string>();

  /** Refresh pending/conflict counts from IndexedDB */
  async function refreshCounts() {
    pendingCount.value = await getPendingCount();
    conflictCount.value = await getConflictCount();
  }

  /** Pull server beneficiaries into local IndexedDB cache */
  async function pullBeneficiaries(token?: string) {
    try {
      const response = await cfsApi.getBeneficiaries(token);
      const list = Array.isArray(response.beneficiaries)
        ? response.beneficiaries
        : Array.isArray(response) ? response : [];
      await seedBeneficiaries(list);
      syncLog.value.push(`Pulled ${list.length} beneficiaries from server`);
    } catch (e: any) {
      syncLog.value.push(`Pull failed: ${e.message || 'unknown error'}`);
    }
  }

  /** Sync all pending records in correct order */
  async function flushQueue(token?: string) {
    if (isSyncing.value) return;

    isSyncing.value = true;
    syncError.value = '';
    syncLog.value = [];
    idMap.clear();

    try {
      // ── Pre-populate idMap from previously-synced records ────────────────
      // Ensures registrations/attendance can resolve server IDs even if
      // the parent record was synced in a prior flush.
      const syncedBens = await db.beneficiaries.where('syncStatus').equals('synced').toArray();
      for (const b of syncedBens) {
        if (b.serverId && b.serverId !== b.id) idMap.set(b.id, b.serverId);
      }
      const syncedSessions = await db.cfsSessions.where('syncStatus').equals('synced').toArray();
      for (const s of syncedSessions) {
        if (s.serverId && s.serverId !== s.id) idMap.set(s.id, s.serverId);
      }

      // ── Step 1: Sync beneficiaries ──────────────────────────────────────
      const pendingBeneficiaries = await getPendingBeneficiaries();
      if (pendingBeneficiaries.length) {
        syncLog.value.push(`Syncing ${pendingBeneficiaries.length} beneficiaries...`);
        for (const b of pendingBeneficiaries) {
          try {
            const response = await cfsApi.registerBeneficiary({
              personal_name: b.personalName,
              father_name: b.fatherName,
              grandfather_name: b.grandfatherName || undefined,
              family_name: b.familyName || undefined,
              age_at_registration: b.ageAtRegistration,
              sex: b.sex,
              language: b.language,
              disability_status: b.disabilityStatus,
              guardian_name: b.guardianName,
              guardian_phone: b.guardianPhone || undefined,
              known_medical_issues: b.knownMedicalIssues || undefined,
              known_learning_difficulties: b.knownLearningDifficulties || undefined,
              additional_notes: b.additionalNotes || undefined,
              primero_case_id: b.primeroCaseId || undefined,
            }, token);

            const serverId = response.beneficiary.id;
            idMap.set(b.id, serverId);
            await updateBeneficiarySyncStatus(b.id, 'synced', serverId);
            syncLog.value.push(`✓ Beneficiary ${b.personalName} synced`);
          } catch (e: any) {
            const isDuplicate = (e instanceof ApiError && e.status === 409)
              || (e?.message?.includes('duplicate key') || e?.message?.includes('23505'));
            if (isDuplicate) {
              await updateBeneficiarySyncStatus(b.id, 'synced');
              syncLog.value.push(`✓ Beneficiary ${b.personalName} already exists — marked synced`);
            } else {
              syncLog.value.push(`✗ Beneficiary ${b.personalName}: ${e.message}`);
            }
          }
        }
      }

      // ── Step 2: Sync CFS registrations ────────────────────────────────────
      const pendingRegs = await getPendingCfsRegistrations();
      if (pendingRegs.length) {
        syncLog.value.push(`Syncing ${pendingRegs.length} registrations...`);
        for (const reg of pendingRegs) {
          try {
            const serverBenId = idMap.get(reg.beneficiaryId) ?? reg.beneficiaryId;
            await cfsApi.createCfsRegistration({
              beneficiary_id: serverBenId,
            }, token);
            await updateCfsRegistrationSyncStatus(reg.id, 'synced');
            syncLog.value.push(`✓ Registration for ${serverBenId} synced`);
          } catch (e: any) {
            const isDuplicate = (e instanceof ApiError && e.status === 409)
              || (e?.message?.includes('duplicate key') || e?.message?.includes('23505'));
            if (isDuplicate) {
              await updateCfsRegistrationSyncStatus(reg.id, 'synced');
              syncLog.value.push(`✓ Registration already exists — marked synced`);
            } else {
              syncLog.value.push(`✗ Registration: ${e.message}`);
            }
          }
        }
      }

      // ── Step 3: Sync sessions ───────────────────────────────────────────
      const pendingSessions = await getPendingSessions();
      if (pendingSessions.length) {
        syncLog.value.push(`Syncing ${pendingSessions.length} sessions...`);
        for (const session of pendingSessions) {
          try {
            const response = await cfsApi.createSession({
              session_date: session.sessionDate,
              session_type: session.sessionType,
            }, token);

            const serverSessionId = response.session.id;
            idMap.set(session.id, serverSessionId);
            await updateSessionSyncStatus(session.id, 'synced', serverSessionId);
            syncLog.value.push(`✓ Session ${session.sessionDate} synced`);
          } catch (e: any) {
            const isDuplicate = (e instanceof ApiError && e.status === 409)
              || (e?.message?.includes('duplicate key') || e?.message?.includes('23505'));
            if (isDuplicate) {
              await updateSessionSyncStatus(session.id, 'synced');
              syncLog.value.push(`✓ Session ${session.sessionDate} already exists — marked synced`);
            } else {
              syncLog.value.push(`✗ Session: ${e.message}`);
            }
          }
        }
      }

      // ── Step 4: Sync attendance records ─────────────────────────────────
      const pendingAttendance = await getPendingAttendanceRecords();
      if (pendingAttendance.length) {
        // Group by sessionId
        const bySession = new Map<string, OfflineAttendanceRecord[]>();
        for (const rec of pendingAttendance) {
          const group = bySession.get(rec.sessionId) ?? [];
          group.push(rec);
          bySession.set(rec.sessionId, group);
        }

        syncLog.value.push(`Syncing attendance for ${bySession.size} session(s)...`);
        for (const [localSessionId, records] of bySession) {
          const serverSessionId = idMap.get(localSessionId) ?? localSessionId;
          try {
            const mappedRecords = records.map(r => ({
              beneficiary_id: idMap.get(r.beneficiaryId) ?? r.beneficiaryId,
              status: r.status,
            }));

            await cfsApi.recordAttendance({
              session_id: serverSessionId,
              records: mappedRecords,
            }, token);

            await updateAttendanceSyncStatus(records.map(r => r.id), 'synced');
            syncLog.value.push(`✓ ${records.length} attendance records synced`);
          } catch (e: any) {
            syncLog.value.push(`✗ Attendance: ${e.message}`);
          }
        }
      }

      // ── Post-sync: Pull fresh data ──────────────────────────────────────
      await pullBeneficiaries(token);

      lastSyncTime.value = new Date().toISOString();
      syncLog.value.push('Sync complete');
    } catch (e: any) {
      syncError.value = e.message || 'Sync failed';
      syncLog.value.push(`Error: ${syncError.value}`);
    } finally {
      isSyncing.value = false;
      await refreshCounts();
    }
  }

  // Initialize counts
  refreshCounts();

  return {
    isSyncing,
    pendingCount,
    conflictCount,
    syncError,
    syncLog,
    lastSyncTime,
    flushQueue,
    pullBeneficiaries,
    refreshCounts,
  };
};
