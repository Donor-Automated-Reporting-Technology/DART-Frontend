/**
 * `pss_smiley` repository.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * One smiley evaluation per (session). The session id index lets the
 * post-session summary load the evaluation in a single point lookup.
 */

import { pssDb } from '../db';
import type { PssSmileyRecord } from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class SmileyRepository extends BaseRepository<PssSmileyRecord> {
  constructor() {
    super(pssDb.pss_smiley);
  }

  getBySession(sessionId: string): Promise<PssSmileyRecord | undefined> {
    return this.table.where('sessionId').equals(sessionId).first();
  }

  listByDate(date: string): Promise<PssSmileyRecord[]> {
    return this.table.where('date').equals(date).toArray();
  }
}

export const smileyRepository = new SmileyRepository();
