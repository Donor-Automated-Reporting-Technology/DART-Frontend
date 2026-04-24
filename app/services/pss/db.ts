/**
 * PSS module — Dexie database (IndexedDB).
 *
 * Jira: DART-63 (sub-task of DART-60).
 * Contract: DART-61 PSS API Contract v1 (OpenAPI 3.1).
 *
 * This database is **separate** from the existing `dart-offline` database
 * (`app/services/offlineDb.ts`) which serves the CFS attendance / case
 * flag flows. Keeping PSS in its own DB:
 *
 *   1. Avoids stepping on the in-flight CFS sync logic.
 *   2. Lets the PSS schema evolve (versioned migrations) without touching
 *      CFS users.
 *   3. Makes it trivial to wipe local PSS state when a user changes CFS.
 *
 * Stores (all keyed on `clientId`, since records exist locally before the
 * server assigns an id):
 *
 *   pss_activities          — read cache + custom; idx category, ageGroup, source
 *   pss_schedules           — facilitator schedules; idx cfsLocationId, status
 *   pss_sessions            — per-day session execution; idx scheduleId, date, status
 *   pss_session_activities  — slots inside a session; idx sessionId, status
 *   pss_smiley              — wellbeing evaluation; idx sessionId, date
 *   pss_sync_queue          — outbox for the sync worker; idx status, nextAttemptAt
 *
 * Migration policy: bump `version(N).stores({...})` and add an optional
 * `.upgrade(tx => …)` callback below. Never mutate a previous version
 * call site — append a new one. See:
 * https://dexie.org/docs/Tutorial/Design\#database-versioning
 */

import Dexie, { type Table } from 'dexie';
import type {
  PssActivityRecord,
  PssScheduleRecord,
  PssSessionRecord,
  PssSessionActivityRecord,
  PssSmileyRecord,
  PssSyncQueueItem,
} from '../../interfaces/pssDb';

/** Database name — bumping requires a coordinated migration. */
export const PSS_DB_NAME = 'dart-pss';

class DartPssDB extends Dexie {
  pss_activities!: Table<PssActivityRecord, string>;
  pss_schedules!: Table<PssScheduleRecord, string>;
  pss_sessions!: Table<PssSessionRecord, string>;
  pss_session_activities!: Table<PssSessionActivityRecord, string>;
  pss_smiley!: Table<PssSmileyRecord, string>;
  pss_sync_queue!: Table<PssSyncQueueItem, string>;

  constructor() {
    super(PSS_DB_NAME);

    // ── v1 — initial schema ────────────────────────────────────────────
    // Compound indexes are quoted strings, e.g. `[category+ageGroup]`,
    // so the schedule wizard can do: where('[category+ageGroup]')
    //   .equals(['play', '6-10']).toArray()
    this.version(1).stores({
      pss_activities:
        'clientId, syncStatus, category, ageGroup, source, [category+ageGroup]',
      pss_schedules:
        'clientId, syncStatus, cfsLocationId, status, [cfsLocationId+status]',
      pss_sessions:
        'clientId, syncStatus, scheduleId, date, status, [scheduleId+date]',
      pss_session_activities:
        'clientId, syncStatus, sessionId, status, [sessionId+order]',
      pss_smiley:
        'clientId, syncStatus, sessionId, date',
      pss_sync_queue:
        'id, status, nextAttemptAt, resource, recordClientId, [status+nextAttemptAt]',
    });
  }
}

/**
 * Singleton DB handle. Importing this module opens the database lazily
 * on first query (Dexie default behaviour) — no work runs at import time.
 */
export const pssDb = new DartPssDB();

/**
 * Wipe every PSS store. Used when a user logs out or switches CFS so
 * stale data from another context cannot leak into the current one.
 *
 * Does NOT delete the database itself — schema/version stay intact so
 * the next session avoids a re-open cost.
 */
export async function clearPssDb(): Promise<void> {
  await pssDb.transaction(
    'rw',
    [
      pssDb.pss_activities,
      pssDb.pss_schedules,
      pssDb.pss_sessions,
      pssDb.pss_session_activities,
      pssDb.pss_smiley,
      pssDb.pss_sync_queue,
    ],
    async () => {
      await Promise.all([
        pssDb.pss_activities.clear(),
        pssDb.pss_schedules.clear(),
        pssDb.pss_sessions.clear(),
        pssDb.pss_session_activities.clear(),
        pssDb.pss_smiley.clear(),
        pssDb.pss_sync_queue.clear(),
      ]);
    },
  );
}
