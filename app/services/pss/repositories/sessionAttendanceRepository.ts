/**
 * `pss_session_attendance` repository.
 *
 * Per-session attendance rows. The BE keeps one row per
 * (session, beneficiary) and re-marking flips the status — we mirror
 * that locally with the `[sessionId+beneficiaryId]` compound index.
 */

import { pssDb } from '../db';
import type {
  PssSessionAttendanceRecord,
  PssAttendanceStatus,
} from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class SessionAttendanceRepository extends BaseRepository<PssSessionAttendanceRecord> {
  constructor() {
    super(pssDb.pss_session_attendance);
  }

  listBySession(sessionId: string): Promise<PssSessionAttendanceRecord[]> {
    return this.table.where('sessionId').equals(sessionId).toArray();
  }

  async getForSessionAndBeneficiary(
    sessionId: string,
    beneficiaryId: string,
  ): Promise<PssSessionAttendanceRecord | undefined> {
    return this.table
      .where('[sessionId+beneficiaryId]')
      .equals([sessionId, beneficiaryId])
      .first();
  }

  async countBySession(
    sessionId: string,
    status?: PssAttendanceStatus,
  ): Promise<number> {
    const coll = this.table.where('sessionId').equals(sessionId);
    if (!status) return coll.count();
    return coll.and((r) => r.status === status).count();
  }

  deleteBySession(sessionId: string): Promise<number> {
    return this.table.where('sessionId').equals(sessionId).delete();
  }
}

export const sessionAttendanceRepository = new SessionAttendanceRepository();
