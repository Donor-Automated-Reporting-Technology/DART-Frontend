/**
 * Sync senders for the `pss_sessions` resource.
 *
 * Jira: DART-51 (sub-task of DART-35).
 *
 * The single global sync worker (DART-68) drains queue items via one
 * registered `PssSyncSender`. The dispatcher (`syncDispatcher.ts`)
 * routes by `resource` and delegates here for `pss_sessions` items.
 *
 * Scope (DART-51):
 *   • `create` op only — start session + seed slots. The server returns
 *     the session DTO with the seeded `pss_session_activities` rows;
 *     this sender mirrors the server-issued ids back into IndexedDB so
 *     downstream completion / flagging / smiley calls (DART-44, 37, 34)
 *     can address records by `serverId`.
 *
 * Out-of-scope for this sub-task (will land alongside DART-44 / DART-37):
 *   • PATCH `/sessions/:id/activities/:activityId/complete` (slot complete)
 *   • POST  `/sessions/:id/flags`                            (child flag)
 *   • PATCH `/sessions/:id/complete`                         (session complete)
 *
 * Error policy (mirrors `syncSenders.ts` for activities):
 *   • 409 / `conflict` — server enforces UNIQUE
 *     `(cfs_location_id, session_date, time_period, age_group)`.
 *     A duplicate means another device already started the same slot;
 *     flag local `syncStatus='conflict'` so the UI can offer "open the
 *     other session" rather than a silent retry.
 *   • Other 4xx — `fatal`, mark `syncStatus='failed'`.
 *   • Network / 5xx — `retryable`, worker retries with backoff.
 */

import { sessionsRepository } from './repositories/sessionsRepository';
import { sessionActivitiesRepository } from './repositories/sessionActivitiesRepository';
import {
  applySessionDto,
  applySessionActivityDto,
  usePssSessionsApi,
  type PssSessionCreatePayload,
  type PssSessionDto,
} from './sessionsApi';
import type { PssSyncSendOutcome } from '~/composables/usePssSyncQueue';
import type { PssApiError } from '~/interfaces/pss';
import type {
  PssSessionRecord,
  PssSessionActivityRecord,
  PssSyncQueueItem,
} from '~/interfaces/pssDb';

// ── Local-record transitions ──────────────────────────────────────────

/**
 * Apply the server-issued session id (and slot ids) back over the local
 * records. The session row is keyed on `clientId` in Dexie, so we
 * delete + re-insert under the new id when the server assigns a
 * different one — mirrors the activities sender exactly so behaviour
 * stays predictable across resources.
 */
async function applyServerIdsLocally(
  localSessionClientId: string,
  dto: PssSessionDto,
): Promise<{ slotsRekeyed: number }> {
  const localSession = await sessionsRepository.getByClientId(
    localSessionClientId,
  );
  if (!localSession) {
    return { slotsRekeyed: 0 };
  }

  const mergedSession = applySessionDto(localSession, dto);
  if (dto.id !== localSessionClientId) {
    await sessionsRepository.delete(localSessionClientId);
    await sessionsRepository.upsert({ ...mergedSession, clientId: dto.id });
  } else {
    await sessionsRepository.upsert(mergedSession);
  }
  await sessionsRepository.markSynced(
    dto.id !== localSessionClientId ? dto.id : localSessionClientId,
    dto.id,
  );

  // Re-key slot rows: their `sessionId` FK must move to the new session
  // id, AND each slot row may also receive its own server id.
  const localSlots = await sessionActivitiesRepository.listBySession(
    localSessionClientId,
  );
  let slotsRekeyed = 0;
  const dtoSlots = dto.activities ?? [];

  for (const slot of localSlots) {
    // Match by (activity_id, slot_order) — the server preserves order.
    const dtoSlot = dtoSlots.find(
      (a) => a.activity_id === slot.activityId && a.slot_order === slot.order,
    );
    if (!dtoSlot) {
      // Server did not echo this slot back; just rewire the FK.
      const repointed: PssSessionActivityRecord = {
        ...slot,
        sessionId: dto.id,
      };
      if (dto.id !== localSessionClientId) {
        await sessionActivitiesRepository.delete(slot.clientId);
        await sessionActivitiesRepository.upsert(repointed);
      } else {
        await sessionActivitiesRepository.upsert(repointed);
      }
      continue;
    }

    const merged = applySessionActivityDto(slot, dtoSlot);
    merged.sessionId = dto.id;
    if (dtoSlot.id !== slot.clientId) {
      await sessionActivitiesRepository.delete(slot.clientId);
      await sessionActivitiesRepository.upsert({
        ...merged,
        clientId: dtoSlot.id,
      });
      await sessionActivitiesRepository.markSynced(dtoSlot.id, dtoSlot.id);
    } else {
      await sessionActivitiesRepository.upsert(merged);
      await sessionActivitiesRepository.markSynced(slot.clientId, dtoSlot.id);
    }
    slotsRekeyed++;
  }

  return { slotsRekeyed };
}

async function flagLocalConflict(
  clientId: string,
  message: string,
): Promise<void> {
  await sessionsRepository.patch(
    clientId,
    {
      syncStatus: 'conflict',
      syncError: message,
    } as Partial<PssSessionRecord>,
    { markPending: false },
  );
}

async function flagLocalFailure(
  clientId: string,
  message: string,
): Promise<void> {
  await sessionsRepository.patch(
    clientId,
    {
      syncStatus: 'failed',
      syncError: message,
    } as Partial<PssSessionRecord>,
    { markPending: false },
  );
}

// ── Error classification ──────────────────────────────────────────────

function isApiError(err: unknown): err is PssApiError {
  return (
    !!err &&
    typeof err === 'object' &&
    typeof (err as PssApiError).status === 'number' &&
    typeof (err as PssApiError).code === 'string'
  );
}

function isConflict(err: PssApiError): boolean {
  return err.status === 409 || err.code === 'conflict';
}

function isRetryable(err: PssApiError): boolean {
  if (err.status === 0) return true;
  if (err.status >= 500 && err.status <= 599) return true;
  return false;
}

// ── Sender ────────────────────────────────────────────────────────────

/**
 * Handle one queue item targeting `pss_sessions`. Only the `create`
 * operation is wired in DART-51; other operations fall through as
 * fatal so they don't silently retry forever.
 */
export async function sendPssSessionQueueItem(
  item: PssSyncQueueItem,
): Promise<PssSyncSendOutcome> {
  if (item.operation !== 'create') {
    return {
      kind: 'fatal',
      error: `Unsupported pss_sessions operation: ${item.operation}`,
    };
  }

  const payload = item.payload as PssSessionCreatePayload;
  const api = usePssSessionsApi();

  try {
    const dto = await api.create(payload, {
      idempotencyKey: item.idempotencyKey,
    });
    await applyServerIdsLocally(item.recordClientId, dto);
    return { kind: 'success', serverId: dto.id };
  } catch (err) {
    if (!isApiError(err)) {
      const message =
        err instanceof Error ? err.message : 'Unknown sender failure';
      return { kind: 'retryable', error: message };
    }

    if (isConflict(err)) {
      await flagLocalConflict(item.recordClientId, err.message);
      return { kind: 'fatal', error: err.message };
    }
    if (isRetryable(err)) {
      return { kind: 'retryable', error: err.message };
    }
    await flagLocalFailure(item.recordClientId, err.message);
    return { kind: 'fatal', error: err.message };
  }
}

/**
 * Sender for `pss_session_activities` queue items. DART-51 only seeds
 * slot rows alongside the parent session (the server creates them
 * inside the same `POST /pss/sessions` transaction), so any standalone
 * `pss_session_activities` create is a no-op success — slot rows are
 * already in sync once the parent session is. Slot UPDATE / DELETE
 * (notes, child flags) lands in DART-44.
 */
export async function sendPssSessionActivityQueueItem(
  item: PssSyncQueueItem,
): Promise<PssSyncSendOutcome> {
  if (item.operation === 'create') {
    // Parent session already replayed the slot via the transactional
    // POST — nothing to send standalone.
    return { kind: 'success' };
  }
  return {
    kind: 'fatal',
    error: `pss_session_activities ${item.operation} not yet implemented (see DART-44).`,
  };
}

/** Re-export under the dispatcher-facing names. */
export const PSS_SESSIONS_SYNC_SENDER = sendPssSessionQueueItem;
export const PSS_SESSION_ACTIVITIES_SYNC_SENDER = sendPssSessionActivityQueueItem;
