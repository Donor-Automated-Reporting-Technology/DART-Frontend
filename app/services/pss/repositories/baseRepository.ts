/**
 * PSS module — generic repository base.
 *
 * Jira: DART-63 (sub-task of DART-60).
 *
 * Wraps a Dexie `Table<TRecord, string>` and centralises the boilerplate
 * every per-resource repository would otherwise duplicate:
 *
 *   • `clientId` is the canonical local key (server `id` is mirrored once
 *     known, but joins always happen via `clientId`).
 *   • Every write stamps `clientTimestamp` and re-asserts the sync state.
 *   • Sync metadata transitions (`markSynced`, `markFailed`, `markConflict`)
 *     are funnelled through one place so the sync queue worker (DART-68),
 *     conflict resolver (DART-64), and stores all observe the same
 *     invariants.
 *
 * Mappers from API DTOs ⇄ local records live in each resource's own
 * service module — this base intentionally stays DTO-agnostic.
 */

import type { Table } from 'dexie';
import type {
  PssLocalMeta,
  PssLocalSyncStatus,
} from '../../../interfaces/pssDb';

/** Any local PSS record satisfies `PssLocalMeta`. */
export type PssLocalRecord = PssLocalMeta & Record<string, unknown>;

export class BaseRepository<TRecord extends PssLocalMeta> {
  constructor(protected readonly table: Table<TRecord, string>) {}

  // ── Queries ──────────────────────────────────────────────────────────

  /** Fetch a single record by `clientId`. */
  getByClientId(clientId: string): Promise<TRecord | undefined> {
    return this.table.get(clientId);
  }

  /**
   * Fetch a record by either local `clientId` or server `serverId`.
   * Useful when navigating from a deep-link that may carry either id.
   */
  async getByEitherId(id: string): Promise<TRecord | undefined> {
    const local = await this.table.get(id);
    if (local) return local;
    return this.table.where('serverId' as never).equals(id).first();
  }

  list(): Promise<TRecord[]> {
    return this.table.toArray();
  }

  listByStatus(status: PssLocalSyncStatus): Promise<TRecord[]> {
    return this.table.where('syncStatus').equals(status).toArray();
  }

  countByStatus(status: PssLocalSyncStatus): Promise<number> {
    return this.table.where('syncStatus').equals(status).count();
  }

  // ── Writes ───────────────────────────────────────────────────────────

  /**
   * Insert or replace a record. Stamps `clientTimestamp` to "now" when
   * the caller did not provide one (mutations always update it; pure
   * cache seeds may keep the server-provided value).
   */
  async upsert(record: TRecord): Promise<string> {
    const stamped: TRecord = {
      ...record,
      clientTimestamp: record.clientTimestamp || new Date().toISOString(),
    };
    return this.table.put(stamped, stamped.clientId);
  }

  /** Bulk upsert — used by server pulls that seed the local cache. */
  bulkUpsert(records: TRecord[]): Promise<string> {
    return this.table.bulkPut(records);
  }

  /**
   * Patch an existing record. Always advances `clientTimestamp` and, if
   * the caller is mutating user data (anything other than the sync
   * metadata fields), flips `syncStatus` back to `pending` so the queue
   * picks it up on the next flush.
   */
  async patch(
    clientId: string,
    changes: Partial<TRecord>,
    options: { markPending?: boolean } = { markPending: true },
  ): Promise<number> {
    const next: Partial<TRecord> = {
      ...changes,
      clientTimestamp: new Date().toISOString() as TRecord['clientTimestamp'],
    };
    if (options.markPending) {
      (next as Partial<PssLocalMeta>).syncStatus = 'pending';
    }
    return this.table.update(clientId, next);
  }

  /** Hard-delete by `clientId`. Sync queue cleanup is the caller's job. */
  delete(clientId: string): Promise<void> {
    return this.table.delete(clientId);
  }

  // ── Sync state transitions ───────────────────────────────────────────

  /**
   * Mark a record as successfully synced and (optionally) capture the
   * server-assigned id. Subsequent reads can resolve via `getByEitherId`.
   */
  markSynced(clientId: string, serverId?: string): Promise<number> {
    const patch: Partial<PssLocalMeta> = {
      syncStatus: 'synced',
      syncError: undefined,
      ...(serverId ? { serverId, id: serverId } : {}),
    };
    return this.table.update(clientId, patch as Partial<TRecord>);
  }

  markSyncing(clientId: string): Promise<number> {
    return this.table.update(clientId, {
      syncStatus: 'syncing',
    } as Partial<TRecord>);
  }

  markFailed(clientId: string, error: string): Promise<number> {
    return this.table.update(clientId, {
      syncStatus: 'failed',
      syncError: error,
    } as Partial<TRecord>);
  }

  markConflict(clientId: string, error: string): Promise<number> {
    return this.table.update(clientId, {
      syncStatus: 'conflict',
      syncError: error,
    } as Partial<TRecord>);
  }
}
