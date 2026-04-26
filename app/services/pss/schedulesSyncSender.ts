/**
 * Sync sender for the `pss_schedules` resource.
 *
 * Jira: DART-41 (PSS schedules) + DART-68 (sync worker).
 *
 * Replays queued schedule mutations against the BE on develop after
 * PR #6 (DART-73 contract). Two payload shapes are recognised:
 *
 *   1. A full create payload — `{cfs_location_id, name, slots:[...]}`.
 *      Replays via `POST /pss/schedules`. On success the schedule's
 *      local record is patched with the server id + merged DTO and
 *      flipped to `synced`.
 *
 *   2. A control envelope `{__op: 'activate', id}` — replays via
 *      `POST /pss/schedules/:id/activate`. The server auto-archives
 *      any sibling active schedule on the same CFS.
 *
 * Edits (`operation: 'update'` with a full payload) and explicit
 * archive envelopes are intentionally NOT shipped on the BE yet
 * (DART-73 is create-only). They are returned as `fatal` so the queue
 * indicator can surface them and the user can retry once the
 * endpoints land. The failure does NOT block other queue items.
 */

import { schedulesRepository } from './repositories/schedulesRepository';
import {
  applyScheduleDto,
  usePssSchedulesApi,
  type PssSchedulePayload,
  type PssScheduleDto,
} from './schedulesApi';
import { usePssApi } from '~/composables/usePssApi';
import type { PssSyncSendOutcome } from '~/composables/usePssSyncQueue';
import type { PssApiError } from '~/interfaces/pss';
import type { PssSyncQueueItem } from '~/interfaces/pssDb';

interface ActivateEnvelope {
  __op: 'activate';
  id: string;
}

interface ArchiveEnvelope {
  __op: 'archive';
  id: string;
}

function isActivateEnvelope(p: unknown): p is ActivateEnvelope {
  return (
    typeof p === 'object' &&
    p !== null &&
    (p as { __op?: string }).__op === 'activate' &&
    typeof (p as { id?: unknown }).id === 'string'
  );
}

function isArchiveEnvelope(p: unknown): p is ArchiveEnvelope {
  return (
    typeof p === 'object' &&
    p !== null &&
    (p as { __op?: string }).__op === 'archive'
  );
}

function isApiError(err: unknown): err is PssApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { status?: unknown }).status === 'number'
  );
}

function isRetryable(err: PssApiError): boolean {
  return err.status === 0 || err.status >= 500;
}

async function applyServerDtoLocally(
  recordClientId: string,
  dto: PssScheduleDto,
): Promise<void> {
  const local = await schedulesRepository.getByClientId(recordClientId);
  if (!local) return;
  const merged = applyScheduleDto(local, dto);
  merged.syncStatus = 'synced';
  merged.syncError = undefined;
  await schedulesRepository.upsert(merged);
}

async function flagFailure(
  recordClientId: string,
  message: string,
): Promise<void> {
  await schedulesRepository
    .patch(
      recordClientId,
      { syncStatus: 'failed', syncError: message },
      { markPending: false },
    )
    .catch(() => {
      /* swallow secondary failure */
    });
}

export async function sendPssScheduleQueueItem(
  item: PssSyncQueueItem,
): Promise<PssSyncSendOutcome> {
  const api = usePssSchedulesApi();
  const rawApi = usePssApi();

  // Activate envelope: server-side `activate` round-trip after a
  // previously-queued create has landed.
  if (isActivateEnvelope(item.payload)) {
    // Resolve the server id at replay time — when the activate was
    // queued the schedule may still have only had a clientId; the
    // create that ran earlier in the queue will have stamped the
    // serverId on the local record.
    const local = await schedulesRepository.getByClientId(item.recordClientId);
    const serverId = local?.serverId ?? item.payload.id;
    if (!serverId || serverId === item.recordClientId) {
      // The create has not landed yet (or failed). Retry — keeping the
      // activate behind it in the queue.
      return {
        kind: 'retryable',
        error: 'Cannot activate schedule before its server id is known.',
      };
    }
    try {
      const dto = await api.activate(serverId, {
        idempotencyKey: item.idempotencyKey,
      });
      await applyServerDtoLocally(item.recordClientId, dto);
      return { kind: 'success', serverId: dto.id };
    } catch (err) {
      if (isApiError(err) && isRetryable(err)) {
        return { kind: 'retryable', error: err.message };
      }
      const message =
        err instanceof Error ? err.message : 'Activate failed';
      await flagFailure(item.recordClientId, message);
      return { kind: 'fatal', error: message };
    }
  }

  // Archive envelope: BE has no archive endpoint yet (server enforces
  // archive-on-activate). Drop the item so it stops blocking the queue.
  if (isArchiveEnvelope(item.payload)) {
    return {
      kind: 'fatal',
      error:
        'Archive endpoint not yet implemented on backend; ' +
        'server auto-archives on activate. Skipping queued archive.',
    };
  }

  // Full payload create.
  if (item.operation === 'create') {
    const payload = item.payload as PssSchedulePayload;
    try {
      const dto = await rawApi.post<PssScheduleDto>(
        '/pss/schedules',
        payload,
        { idempotencyKey: item.idempotencyKey },
      );
      await applyServerDtoLocally(item.recordClientId, dto);
      return { kind: 'success', serverId: dto.id };
    } catch (err) {
      if (isApiError(err) && isRetryable(err)) {
        return { kind: 'retryable', error: err.message };
      }
      const message = err instanceof Error ? err.message : 'Create failed';
      await flagFailure(item.recordClientId, message);
      return { kind: 'fatal', error: message };
    }
  }

  // `update` of a full payload — BE has no PATCH endpoint yet.
  return {
    kind: 'fatal',
    error:
      'PSS schedule update endpoint not yet implemented on backend; ' +
      'queued update will be retried after a future BE release.',
  };
}

export const PSS_SCHEDULES_SYNC_SENDER = sendPssScheduleQueueItem;
