/**
 * Sync sender for `pss_day_smiley`.
 *
 * Replays the offline-queued POST /api/v1/pss/days/:dayId/smiley.
 * Server upserts on (schedule_id, date) so retries with the same
 * idempotency key are safe.
 *
 * Outcome mapping:
 *   • 2xx                                  → success (mark synced).
 *   • 409 / `conflict`                     → fatal (flag conflict).
 *   • 4xx other than 409                   → fatal (flag failed).
 *   • Network / 5xx                        → retryable (worker backoff).
 */

import { daySmileyRepository } from './repositories/daySmileyRepository';
import { usePssDaysApi, type PssDaySmileyPayload } from './daysApi';
import type { PssSyncSendOutcome } from '~/composables/usePssSyncQueue';
import type { PssApiError } from '~/interfaces/pss';
import type {
  PssDaySmileyRecord,
  PssSyncQueueItem,
} from '~/interfaces/pssDb';

interface DaySmileyQueuePayload {
  dayId: string;
  body: PssDaySmileyPayload;
}

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

async function flagConflict(clientId: string, message: string): Promise<void> {
  await daySmileyRepository.patch(
    clientId,
    { syncStatus: 'conflict', syncError: message } as Partial<PssDaySmileyRecord>,
    { markPending: false },
  );
}

async function flagFailure(clientId: string, message: string): Promise<void> {
  await daySmileyRepository.patch(
    clientId,
    { syncStatus: 'failed', syncError: message } as Partial<PssDaySmileyRecord>,
    { markPending: false },
  );
}

export async function sendPssDaySmileyQueueItem(
  item: PssSyncQueueItem,
): Promise<PssSyncSendOutcome> {
  if (item.operation !== 'create' && item.operation !== 'update') {
    return {
      kind: 'fatal',
      error: `Unsupported pss_day_smiley operation: ${item.operation}`,
    };
  }

  const { dayId, body } = item.payload as DaySmileyQueuePayload;
  const api = usePssDaysApi();

  try {
    const dto = await api.submitSmiley(dayId, body, {
      idempotencyKey: item.idempotencyKey,
    });
    await daySmileyRepository.markSynced(item.recordClientId, dto.id);
    return { kind: 'success', serverId: dto.id };
  } catch (err) {
    if (!isApiError(err)) {
      const message =
        err instanceof Error ? err.message : 'Unknown sender failure';
      return { kind: 'retryable', error: message };
    }
    if (isConflict(err)) {
      await flagConflict(item.recordClientId, err.message);
      return { kind: 'fatal', error: err.message };
    }
    if (isRetryable(err)) {
      return { kind: 'retryable', error: err.message };
    }
    await flagFailure(item.recordClientId, err.message);
    return { kind: 'fatal', error: err.message };
  }
}

export const PSS_DAY_SMILEY_SYNC_SENDER = sendPssDaySmileyQueueItem;
