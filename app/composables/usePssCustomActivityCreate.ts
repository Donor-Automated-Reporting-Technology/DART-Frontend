/**
 * usePssCustomActivityCreate — offline-first create flow for custom
 * PSS sub-activities (DART-30).
 *
 * Jira: DART-30 (sub-task of DART-36 / DART-60).
 *
 * Flow:
 *   1. Validate the form input.
 *   2. Build a `PssActivityRecord` (source='custom', syncStatus='pending',
 *      fresh UUID v4 as both `id` and `clientId`, `serverId=null`).
 *   3. Upsert into IndexedDB (`pss_activities`) so the picker (DART-38)
 *      sees it instantly.
 *   4. Enqueue a `create` op into `pss_sync_queue` with a stable
 *      idempotency key.
 *   5. Return the local record. The caller can immediately reference it
 *      from a schedule — when the worker drains, the activity sender
 *      will rewrite all schedule-slot references from the temp clientId
 *      to the server-issued id.
 *
 * Online-or-offline agnostic: the worker decides. The composable does
 * not call the API directly; it lives entirely on top of the
 * IndexedDB + outbox primitives so behaviour is identical in both
 * states (key requirement of the airplane-mode test in the AC).
 *
 * Stateless / parallel-safe: no Pinia store, no shared module state,
 * one fresh draft per call.
 */

import { v4 as uuidv4 } from 'uuid';
import { activitiesRepository } from '~/services/pss/repositories/activitiesRepository';
import { syncQueueRepository } from '~/services/pss/repositories/syncQueueRepository';
import { usePssSyncQueue } from '~/composables/usePssSyncQueue';
import { buildCustomActivityCreatePayload } from '~/services/pss/syncSenders';
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
} from '~/interfaces/pssDb';

// ── Types ────────────────────────────────────────────────────────────────

export interface PssCustomActivityInput {
  name: string;
  description: string;
  category: PssActivityCategory;
  ageGroup: PssActivityAgeGroup;
  steps: string[];
  materials: string;
  conclusion: string;
  attentionNote: string;
  /** Authenticated user UUID — stamped on the new record. */
  createdBy: string;
  /** Owning CFS UUID — required for custom activities. */
  cfsId: string;
}

export type PssCustomActivityIssueCode =
  | 'name_required'
  | 'description_required'
  | 'steps_required'
  | 'cfs_required'
  | 'created_by_required';

export interface PssCustomActivityIssue {
  code: PssCustomActivityIssueCode;
  message: string;
}

export interface PssCustomActivityCreateOk {
  ok: true;
  record: PssActivityRecord;
  /** Sync-queue item id — useful for tests and the queue indicator. */
  queueItemId: string;
}

export interface PssCustomActivityCreateError {
  ok: false;
  issues: PssCustomActivityIssue[];
}

export type PssCustomActivityCreateResult =
  | PssCustomActivityCreateOk
  | PssCustomActivityCreateError;

// ── Pure validator (exported for tests / form reuse) ─────────────────────

export function validateCustomActivity(
  input: PssCustomActivityInput,
): PssCustomActivityIssue[] {
  const issues: PssCustomActivityIssue[] = [];

  if (!input.name?.trim()) {
    issues.push({ code: 'name_required', message: 'Name is required.' });
  }
  if (!input.description?.trim()) {
    issues.push({
      code: 'description_required',
      message: 'Description is required.',
    });
  }
  if (
    !Array.isArray(input.steps) ||
    input.steps.length === 0 ||
    input.steps.every((s) => !s?.trim())
  ) {
    issues.push({
      code: 'steps_required',
      message: 'At least one step is required.',
    });
  }
  if (!input.cfsId?.trim()) {
    issues.push({
      code: 'cfs_required',
      message: 'CFS location is missing from your account.',
    });
  }
  if (!input.createdBy?.trim()) {
    issues.push({
      code: 'created_by_required',
      message: 'Authenticated user id is missing.',
    });
  }

  return issues;
}

// ── Composable ───────────────────────────────────────────────────────────

export function usePssCustomActivityCreate() {
  const { enqueue } = usePssSyncQueue();

  /**
   * Persist a new custom activity locally and enqueue the create op.
   * Resolves with the local record so the caller can immediately use
   * its `clientId` in a schedule slot.
   */
  async function create(
    input: PssCustomActivityInput,
  ): Promise<PssCustomActivityCreateResult> {
    const issues = validateCustomActivity(input);
    if (issues.length > 0) return { ok: false, issues };

    const now = new Date().toISOString();
    const clientId = uuidv4();
    const idempotencyKey = uuidv4();

    const record: PssActivityRecord = {
      id: clientId,
      clientId,
      serverId: null,
      clientTimestamp: now,
      syncStatus: 'pending',
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      ageGroup: input.ageGroup,
      source: 'custom',
      steps: input.steps.map((s) => s.trim()).filter((s) => s.length > 0),
      materials: input.materials,
      conclusion: input.conclusion,
      attentionNote: input.attentionNote,
      cfsId: input.cfsId,
      createdBy: input.createdBy,
    };

    await activitiesRepository.upsert(record);

    const queueItemId = await enqueue({
      resource: 'pss_activities',
      operation: 'create',
      recordClientId: clientId,
      payload: buildCustomActivityCreatePayload(record),
      idempotencyKey,
    });

    return { ok: true, record, queueItemId };
  }

  /**
   * Re-enqueue a previously-failed (or conflict-flagged) custom activity.
   *
   * Used by the activity picker / queue indicator to retry after the
   * user renames a duplicate. Re-uses the original `clientId` so any
   * schedule slots already pointing at it stay consistent. Caller is
   * expected to have already patched the offending fields on the
   * record (e.g. a new name) before calling.
   */
  async function retryCreate(clientId: string): Promise<{ ok: boolean }> {
    const local = await activitiesRepository.getByClientId(clientId);
    if (!local || local.source !== 'custom') return { ok: false };

    // Drop any queued items that were dead/failed for this record so we
    // don't replay stale payloads.
    const stale = await syncQueueRepository.listForRecord(clientId);
    for (const item of stale) {
      if (item.status === 'failed' || item.status === 'dead' || item.status === 'pending') {
        await syncQueueRepository.markSynced(item.id); // soft-remove
      }
    }
    await syncQueueRepository.removeSynced();

    // Reset local sync state so the picker shows pending again.
    await activitiesRepository.patch(
      clientId,
      {
        syncStatus: 'pending',
        syncError: undefined,
      } as Partial<PssActivityRecord>,
      { markPending: false },
    );

    await enqueue({
      resource: 'pss_activities',
      operation: 'create',
      recordClientId: clientId,
      payload: buildCustomActivityCreatePayload(local),
      idempotencyKey: uuidv4(),
    });

    return { ok: true };
  }

  return {
    create,
    retryCreate,
    validate: validateCustomActivity,
  };
}

export type UsePssCustomActivityCreateReturn = ReturnType<
  typeof usePssCustomActivityCreate
>;
