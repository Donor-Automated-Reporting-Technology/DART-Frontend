/**
 * `pss_schedules` repository.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * The active-schedule lookup (one schedule per CFS in `active` status) is
 * the most-frequent read path — backed by the `[cfsLocationId+status]`
 * compound index so it is O(log n) regardless of archive depth.
 */

import { pssDb } from '../db';
import type { PssScheduleRecord } from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class SchedulesRepository extends BaseRepository<PssScheduleRecord> {
  constructor() {
    super(pssDb.pss_schedules);
  }

  listByCfs(cfsLocationId: string): Promise<PssScheduleRecord[]> {
    return this.table.where('cfsLocationId').equals(cfsLocationId).toArray();
  }

  /** Returns the (at most one) active schedule for a CFS, or undefined. */
  getActive(cfsLocationId: string): Promise<PssScheduleRecord | undefined> {
    return this.table
      .where('[cfsLocationId+status]')
      .equals([cfsLocationId, 'active'])
      .first();
  }

  listArchived(cfsLocationId: string): Promise<PssScheduleRecord[]> {
    return this.table
      .where('[cfsLocationId+status]')
      .equals([cfsLocationId, 'archived'])
      .toArray();
  }
}

export const schedulesRepository = new SchedulesRepository();
