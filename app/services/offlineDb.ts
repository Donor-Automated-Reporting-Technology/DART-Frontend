import Dexie, { type Table } from 'dexie';
import type {
  OfflineBeneficiary,
  OfflineCfsRegistration,
  OfflineCfsSession,
  OfflineAttendanceRecord,
  OfflineCaseFlag,
  SyncQueueItem,
} from '../interfaces/cfs';

/**
 * DART Offline Database
 * ─────────────────────────────────────────────────────────────────────────────
 * Five domain stores (per the attendance/init spec) + 1 sync queue store.
 *
 * Each domain record carries:
 *   - id:              client-generated UUID v4
 *   - syncStatus:      'pending' | 'synced' | 'conflict'
 *   - clientTimestamp:  ISO-8601 string set at write time
 *   - serverId:        populated after successful sync
 */
class DartOfflineDB extends Dexie {
  beneficiaries!: Table<OfflineBeneficiary, string>;
  cfsRegistrations!: Table<OfflineCfsRegistration, string>;
  cfsSessions!: Table<OfflineCfsSession, string>;
  attendanceRecords!: Table<OfflineAttendanceRecord, string>;
  caseFlags!: Table<OfflineCaseFlag, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('dart-offline');

    this.version(1).stores({
      beneficiaries:    'id, syncStatus, clientTimestamp, personalName',
      cfsRegistrations: 'id, syncStatus, beneficiaryId, clientTimestamp',
      cfsSessions:      'id, syncStatus, sessionDate, sessionType, clientTimestamp',
      attendanceRecords:'id, syncStatus, sessionId, beneficiaryId, clientTimestamp',
      caseFlags:        'id, syncStatus, beneficiaryId, clientTimestamp',
      syncQueue:        'id, type, status, createdAt',
    });
  }
}

export const db = new DartOfflineDB();

// ── Beneficiary helpers ─────────────────────────────────────────────────────

export async function saveBeneficiaryOffline(record: OfflineBeneficiary): Promise<void> {
  await db.beneficiaries.put(record);
}

export async function getBeneficiariesOffline(): Promise<OfflineBeneficiary[]> {
  return db.beneficiaries.toArray();
}

export async function getSyncedBeneficiaries(): Promise<OfflineBeneficiary[]> {
  return db.beneficiaries.where('syncStatus').equals('synced').toArray();
}

export async function getPendingBeneficiaries(): Promise<OfflineBeneficiary[]> {
  return db.beneficiaries.where('syncStatus').equals('pending').toArray();
}

export async function updateBeneficiarySyncStatus(
  id: string,
  syncStatus: 'pending' | 'synced' | 'conflict',
  serverId?: string,
): Promise<void> {
  await db.beneficiaries.update(id, { syncStatus, ...(serverId ? { serverId } : {}) });
}

/** Seed beneficiaries from server response into IndexedDB (mark as synced) */
export async function seedBeneficiaries(
  serverBeneficiaries: Array<{
    id: string;
    personal_name: string;
    father_name: string;
    grandfather_name?: string;
    family_name?: string;
    age_at_registration: number;
    sex: string;
    language: string;
    disability_status: string;
    guardian_name: string;
    guardian_phone?: string;
    created_at?: string;
    updated_at?: string;
  }>,
): Promise<void> {
  await db.transaction('rw', db.beneficiaries, async () => {
    for (const b of serverBeneficiaries) {
      const existing = await db.beneficiaries.get(b.id);
      // Don't overwrite a pending local record
      if (existing && existing.syncStatus === 'pending') continue;

      await db.beneficiaries.put({
        id: b.id,
        personalName: b.personal_name,
        fatherName: b.father_name,
        grandfatherName: b.grandfather_name ?? '',
        familyName: b.family_name ?? '',
        ageAtRegistration: b.age_at_registration,
        sex: b.sex,
        language: b.language,
        disabilityStatus: b.disability_status,
        guardianName: b.guardian_name,
        guardianPhone: b.guardian_phone ?? '',
        knownMedicalIssues: '',
        knownLearningDifficulties: '',
        additionalNotes: '',
        primeroCaseId: '',
        syncStatus: 'synced',
        serverId: b.id,
        clientTimestamp: b.created_at ?? new Date().toISOString(),
      });
    }
  });
}

// ── CFS Registration helpers ────────────────────────────────────────────────

export async function saveCfsRegistrationOffline(record: OfflineCfsRegistration): Promise<void> {
  await db.cfsRegistrations.put(record);
}

export async function getPendingCfsRegistrations(): Promise<OfflineCfsRegistration[]> {
  return db.cfsRegistrations.where('syncStatus').equals('pending').toArray();
}

export async function updateCfsRegistrationSyncStatus(
  id: string,
  syncStatus: 'pending' | 'synced' | 'conflict',
  serverId?: string,
): Promise<void> {
  await db.cfsRegistrations.update(id, { syncStatus, ...(serverId ? { serverId } : {}) });
}

// ── Session helpers ─────────────────────────────────────────────────────────

export async function saveSessionOffline(record: OfflineCfsSession): Promise<void> {
  await db.cfsSessions.put(record);
}

export async function getPendingSessions(): Promise<OfflineCfsSession[]> {
  return db.cfsSessions.where('syncStatus').equals('pending').toArray();
}

export async function updateSessionSyncStatus(
  id: string,
  syncStatus: 'pending' | 'synced' | 'conflict',
  serverId?: string,
): Promise<void> {
  await db.cfsSessions.update(id, { syncStatus, ...(serverId ? { serverId } : {}) });
}

// ── Attendance helpers ──────────────────────────────────────────────────────

export async function saveAttendanceRecordsOffline(records: OfflineAttendanceRecord[]): Promise<void> {
  await db.attendanceRecords.bulkPut(records);
}

export async function getPendingAttendanceBySession(sessionId: string): Promise<OfflineAttendanceRecord[]> {
  return db.attendanceRecords
    .where('sessionId')
    .equals(sessionId)
    .and(r => r.syncStatus === 'pending')
    .toArray();
}

export async function getPendingAttendanceRecords(): Promise<OfflineAttendanceRecord[]> {
  return db.attendanceRecords.where('syncStatus').equals('pending').toArray();
}

export async function updateAttendanceSyncStatus(
  ids: string[],
  syncStatus: 'pending' | 'synced' | 'conflict',
): Promise<void> {
  await db.transaction('rw', db.attendanceRecords, async () => {
    for (const id of ids) {
      await db.attendanceRecords.update(id, { syncStatus });
    }
  });
}

// ── Case Flag helpers ───────────────────────────────────────────────────────

export async function saveCaseFlagOffline(record: OfflineCaseFlag): Promise<void> {
  await db.caseFlags.put(record);
}

export async function getPendingCaseFlags(): Promise<OfflineCaseFlag[]> {
  return db.caseFlags.where('syncStatus').equals('pending').toArray();
}

// ── Sync Queue helpers ──────────────────────────────────────────────────────

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  await db.syncQueue.put(item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('status').equals('pending').sortBy('createdAt');
}

export async function updateSyncItemStatus(
  id: string,
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await db.syncQueue.update(id, { status, ...(errorMessage ? { errorMessage } : {}) });
}

export async function removeSyncedItems(): Promise<void> {
  await db.syncQueue.where('status').equals('synced').delete();
}

// ── Aggregate counts ────────────────────────────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const [b, r, s, a, f] = await Promise.all([
    db.beneficiaries.where('syncStatus').equals('pending').count(),
    db.cfsRegistrations.where('syncStatus').equals('pending').count(),
    db.cfsSessions.where('syncStatus').equals('pending').count(),
    db.attendanceRecords.where('syncStatus').equals('pending').count(),
    db.caseFlags.where('syncStatus').equals('pending').count(),
  ]);
  return b + r + s + a + f;
}

export async function getConflictCount(): Promise<number> {
  const [b, r, s, a, f] = await Promise.all([
    db.beneficiaries.where('syncStatus').equals('conflict').count(),
    db.cfsRegistrations.where('syncStatus').equals('conflict').count(),
    db.cfsSessions.where('syncStatus').equals('conflict').count(),
    db.attendanceRecords.where('syncStatus').equals('conflict').count(),
    db.caseFlags.where('syncStatus').equals('conflict').count(),
  ]);
  return b + r + s + a + f;
}
