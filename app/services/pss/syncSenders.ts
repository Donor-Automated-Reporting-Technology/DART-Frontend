/**
 * Sync senders for the `pss_activities` resource.
 *
 * Jira: DART-30 (offline custom activity sync).
 *
 * The single global sync worker (DART-68) drains queue items via one
 * registered `PssSyncSender`. The dispatcher (`syncDispatcher.ts`)
 * routes by `resource` and delegates here for `pss_activities` items.
 *
 * Responsibilities of this module:
 *   1. Replay the create against the server with the queue item's
 *      stable `idempotencyKey` (so the server dedupes any retry).
 *   2. On success, swap the temporary client UUID for the server's
 *      UUID across BOTH `pss_activities` AND every `pss_schedules`
 *      record whose `templateSlots[].activityId` referenced the
 *      pre-sync clientId. This is the bit that makes the
 *      airplane-mode-then-reconnect flow consistent end-to-end.
 *   3. Translate API failures into the worker's outcome envelope:
 *        • 409 / `conflict` (server-wins on duplicate-name) → `fatal`
 *          + flag the local record `syncStatus='conflict'` so the
 *          activity picker can surface a "rename and retry" affordance.
 *        • Any other 4xx / `validation_failed` → `fatal`.
 *        • Network / 5xx → `retryable` (worker handles backoff).
 */

import { activitiesRepository } from './repositories/activitiesRepository';
import { schedulesRepository } from './repositories/schedulesRepository';
import {
  applySubActivityDto,
  toCreatePayload,
  usePssSubActivitiesApi,
  type PssSubActivityCreatePayload,
  type PssSubActivityDto,
} from './subActivitiesApi';
import type { PssSyncSendOutcome } from '~/composables/usePssSyncQueue';
import type { PssApiError } from '~/interfaces/pss';
import type {
  PssActivityRecord,
  PssScheduleRecord,
  PssSyncQueueItem,
  PssTemplateSlot,
} from '~/interfaces/pssDb';

// ── ID rewriting (exported for direct unit testing) ───────────────────────

/**
 * Replace `oldId` with `newId` in every schedule's templateSlots.
 *
 * Walks every `pss_schedules` row (custom-activity references can land in
 * any draft/active/archived schedule), patches the affected slots, and
 * persists with `markPending: false` so we don't kick off a redundant
 * re-sync of schedules whose payload is otherwise unchanged.
 *
 * Returns the number of schedule rows actually rewritten — useful for
 * tests and for the toast text in the queue indicator.
 */
export async function rewriteActivityIdInSchedules(
  oldId: string,
  newId: string,
): Promise<number> {
  if (oldId === newId) return 0;
  const schedules = await schedulesRepository.list();
  let rewritten = 0;

  for (const schedule of schedules) {
    let touched = false;
    const nextSlots: PssTemplateSlot[] = schedule.templateSlots.map((s) => {
      if (s.activityId !== oldId) return s;
      touched = true;
      return { ...s, activityId: newId };
    });
    if (!touched) continue;

    await schedulesRepository.patch(
      schedule.clientId,
      { templateSlots: nextSlots } as Partial<PssScheduleRecord>,
      { markPending: false },
    );
    rewritten++;
  }
  return rewritten;
}

// ── Local-record transitions ──────────────────────────────────────────────

async function applyServerIdLocally(
  localClientId: string,
  dto: PssSubActivityDto,
): Promise<{ scheduleSlotsRewritten: number }> {
  const local = await activitiesRepository.getByClientId(localClientId);
  if (!local) {
    // Record was hard-deleted between enqueue and replay. Nothing to do
    // for the activity itself; still rewrite schedules in case any
    // referenced the deleted clientId.
    return {
      scheduleSlotsRewritten: await rewriteActivityIdInSchedules(
        localClientId,
        dto.id,
      ),
    };
  }

  const merged = applySubActivityDto(local, dto);

  // The activity record itself must move from clientId-keyed to
  // serverId-keyed: Dexie uses `clientId` as the primary key, so we
  // cannot simply update — we delete + re-insert under the new key.
  if (dto.id !== localClientId) {
    await activitiesRepository.delete(localClientId);
    await activitiesRepository.upsert({ ...merged, clientId: dto.id });
  } else {
    await activitiesRepository.upsert(merged);
  }

  const scheduleSlotsRewritten = await rewriteActivityIdInSchedules(
    localClientId,
    dto.id,
  );
  return { scheduleSlotsRewritten };
}

async function flagLocalConflict(
  clientId: string,
  message: string,
): Promise<void> {
  await activitiesRepository.patch(
    clientId,
    {
      syncStatus: 'conflict',
      syncError: message,
    } as Partial<PssActivityRecord>,
    { markPending: false },
  );
}

async function flagLocalFailure(
  clientId: string,
  message: string,
): Promise<void> {
  await activitiesRepository.patch(
    clientId,
    {
      syncStatus: 'failed',
      syncError: message,
    } as Partial<PssActivityRecord>,
    { markPending: false },
  );
}

// ── Error classification ──────────────────────────────────────────────────

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
  // Network failures and 5xx are transient.
  if (err.status === 0) return true;
  if (err.status >= 500 && err.status <= 599) return true;
  return false;
}

// ── Sender ────────────────────────────────────────────────────────────────

/**
 * Handle one queue item targeting `pss_activities`. Currently only the
 * `create` operation is wired (per DART-30 scope); other operations
 * fall through as fatal so they don't silently retry forever.
 */
export async function sendPssActivityQueueItem(
  item: PssSyncQueueItem,
): Promise<PssSyncSendOutcome> {
  if (item.operation !== 'create') {
    return {
      kind: 'fatal',
      error: `Unsupported pss_activities operation: ${item.operation}`,
    };
  }

  const payload = item.payload as PssSubActivityCreatePayload;
  const api = usePssSubActivitiesApi();

  try {
    const dto = await api.create(payload, {
      idempotencyKey: item.idempotencyKey,
    });
    await applyServerIdLocally(item.recordClientId, dto);
    return { kind: 'success', serverId: dto.id };
  } catch (err) {
    if (!isApiError(err)) {
      const message =
        err instanceof Error ? err.message : 'Unknown sender failure';
      // Treat unknown shapes as retryable — better to attempt again than
      // to mark dead on a transient bug.
      return { kind: 'retryable', error: message };
    }

    if (isConflict(err)) {
      await flagLocalConflict(item.recordClientId, err.message);
      return { kind: 'fatal', error: err.message };
    }
    if (isRetryable(err)) {
      // Don't flip the local record yet — the worker will retry with
      // backoff. The user just sees `pending` until the budget runs out.
      return { kind: 'retryable', error: err.message };
    }
    // 4xx other than 409: validation failure, auth, etc. Mark failed so
    // the picker can surface it; the queue indicator (DART-67) exposes
    // a manual retry.
    await flagLocalFailure(item.recordClientId, err.message);
    return { kind: 'fatal', error: err.message };
  }
}

/**
 * Re-export under the dispatcher-facing name to make wiring obvious.
 */
export const PSS_ACTIVITIES_SYNC_SENDER = sendPssActivityQueueItem;

/**
 * Build a payload object suitable for `pss_sync_queue` enqueue from a
 * fresh local record. Pure helper — exported so the create composable
 * doesn't have to import the mapper module twice.
 */
export function buildCustomActivityCreatePayload(
  record: PssActivityRecord,
): PssSubActivityCreatePayload {
  return toCreatePayload(record);
}
