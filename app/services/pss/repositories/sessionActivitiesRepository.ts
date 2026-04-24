/**
 * `pss_session_activities` repository.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * Slot rows live independently of their parent session so writes (notes,
 * flagging a child) do not collide with concurrent edits elsewhere in
 * the session document. The `[sessionId+order]` index returns the
 * ordered slot list in one indexed scan.
 */

import { pssDb } from '../db';
import type {
  PssSessionActivityRecord,
  PssFlaggedChild,
} from '../../../interfaces/pssDb';
import { BaseRepository } from './baseRepository';

class SessionActivitiesRepository extends BaseRepository<PssSessionActivityRecord> {
  constructor() {
    super(pssDb.pss_session_activities);
  }

  /** Slots for a session in order 1 → 4. */
  async listBySession(
    sessionId: string,
  ): Promise<PssSessionActivityRecord[]> {
    const rows = await this.table
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    return rows.sort((a, b) => a.order - b.order);
  }

  /** Append a flagged child to a slot without overwriting existing flags. */
  async addFlaggedChild(
    clientId: string,
    flag: PssFlaggedChild,
  ): Promise<number> {
    const existing = await this.table.get(clientId);
    if (!existing) return 0;
    const flaggedChildren = [...(existing.flaggedChildren ?? []), flag];
    return this.patch(clientId, { flaggedChildren } as Partial<PssSessionActivityRecord>);
  }
}

export const sessionActivitiesRepository = new SessionActivitiesRepository();
