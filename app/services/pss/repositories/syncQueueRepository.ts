/**
 * `pss_sync_queue` repository — outbox for the sync worker (DART-68).
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * The queue worker dequeues `status='pending'` items whose `nextAttemptAt`
 * has passed, in `createdAt` order (FIFO), and replays them against the
 * server with the embedded `idempotencyKey` so retries cannot double-write.
 *
 * Backoff is computed by the worker — this repository only persists the
 * `nextAttemptAt` timestamp the worker chose.
 */

import { pssDb } from '../db';
import type {
  PssSyncQueueItem,
  PssSyncQueueStatus,
} from '../../../interfaces/pssDb';

class SyncQueueRepository {
  private readonly table = pssDb.pss_sync_queue;

  // ── Queries ──────────────────────────────────────────────────────────

  getById(id: string): Promise<PssSyncQueueItem | undefined> {
    return this.table.get(id);
  }

  list(): Promise<PssSyncQueueItem[]> {
    return this.table.toArray();
  }

  countByStatus(status: PssSyncQueueStatus): Promise<number> {
    return this.table.where('status').equals(status).count();
  }

  /**
   * Items the worker should process now: status === 'pending' and
   * nextAttemptAt <= now, ordered by createdAt to preserve FIFO across
   * resources (which matters for FK dependencies).
   */
  async listDue(now: string = new Date().toISOString()): Promise<PssSyncQueueItem[]> {
    const due = await this.table
      .where('[status+nextAttemptAt]')
      .between(['pending', ''], ['pending', now], true, true)
      .toArray();
    return due.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Items belonging to a specific local record (used on cascade-delete). */
  listForRecord(recordClientId: string): Promise<PssSyncQueueItem[]> {
    return this.table
      .where('recordClientId')
      .equals(recordClientId)
      .toArray();
  }

  // ── Writes ───────────────────────────────────────────────────────────

  enqueue(item: PssSyncQueueItem): Promise<string> {
    return this.table.put(item);
  }

  markSyncing(id: string): Promise<number> {
    return this.table.update(id, {
      status: 'syncing',
      updatedAt: new Date().toISOString(),
    } as Partial<PssSyncQueueItem>);
  }

  markSynced(id: string): Promise<number> {
    return this.table.update(id, {
      status: 'synced',
      lastError: undefined,
      updatedAt: new Date().toISOString(),
    } as Partial<PssSyncQueueItem>);
  }

  /**
   * Record a transient failure and schedule the next attempt. The worker
   * passes `nextAttemptAt` after computing its backoff (typically
   * exponential with jitter, capped).
   */
  markFailed(
    id: string,
    error: string,
    nextAttemptAt: string,
    attempts: number,
  ): Promise<number> {
    return this.table.update(id, {
      status: 'pending',
      lastError: error,
      nextAttemptAt,
      attempts,
      updatedAt: new Date().toISOString(),
    } as Partial<PssSyncQueueItem>);
  }

  /** Mark an item as terminally failed (max attempts exceeded). */
  markDead(id: string, error: string): Promise<number> {
    return this.table.update(id, {
      status: 'dead',
      lastError: error,
      updatedAt: new Date().toISOString(),
    } as Partial<PssSyncQueueItem>);
  }

  /** Remove items in 'synced' state — the worker calls this periodically. */
  removeSynced(): Promise<number> {
    return this.table.where('status').equals('synced').delete();
  }
}

export const syncQueueRepository = new SyncQueueRepository();
