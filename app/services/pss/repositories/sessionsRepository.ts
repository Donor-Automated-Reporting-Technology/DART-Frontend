/**
 * `pss_sessions` repository.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * Session lookups are scoped to a (schedule, date) pair on the daily
 * report path; the `[scheduleId+date]` compound index serves both the
 * facilitator's "today's sessions" view and the supervisor weekly report.
 */

import { pssDb } from '../db';
import type {
  PssSessionRecord,
  PssSessionStatus,
} from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class SessionsRepository extends BaseRepository<PssSessionRecord> {
  constructor() {
    super(pssDb.pss_sessions);
  }

  listBySchedule(scheduleId: string): Promise<PssSessionRecord[]> {
    return this.table.where('scheduleId').equals(scheduleId).toArray();
  }

  /** All sessions on a given date across schedules. */
  listByDate(date: string): Promise<PssSessionRecord[]> {
    return this.table.where('date').equals(date).toArray();
  }

  listByScheduleAndDate(
    scheduleId: string,
    date: string,
  ): Promise<PssSessionRecord[]> {
    return this.table
      .where('[scheduleId+date]')
      .equals([scheduleId, date])
      .toArray();
  }

  listByStatusForSchedule(
    scheduleId: string,
    status: PssSessionStatus,
  ): Promise<PssSessionRecord[]> {
    return this.table
      .where('scheduleId')
      .equals(scheduleId)
      .and((s) => s.status === status)
      .toArray();
  }
}

export const sessionsRepository = new SessionsRepository();
