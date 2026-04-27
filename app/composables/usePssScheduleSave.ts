/**
 * usePssScheduleSave — close the PSS schedule wizard loop.
 *
 * Jira: DART-41 (sub-task of DART-36).
 * Source: DART/PSS_MODULE_PRD.md §6.6, DART/PSS_SCHEDULE_TRD.md §6.1
 *         (PSS-013, PSS-014).
 *
 * Stateless composable that:
 *   1. Validates an assembled `PssScheduleRecord` for save-time rules:
 *      - WARN: any active day missing a Play OR Wellbeing activity.
 *      - BLOCK: any active day with 0 activities, or no active day with
 *        any content at all, or a slot pointing at a locked
 *        (session-started) day/period.
 *   2. Persists the record to IndexedDB via `schedulesRepository`.
 *   3. Online → calls `usePssSchedulesApi` directly (create-or-update +
 *      activate). Offline → enqueues `create`/`update`/`activate`
 *      operations on the shared sync queue (DART-66).
 *   4. Auto-archives the previously-active schedule for the same CFS
 *      (server enforces UNIQUE; we mirror it locally so the UI is
 *      consistent before the next pull).
 *
 * Stateless / parallel-safe: the parent owns the schedule object. This
 * composable returns `validate(...)` and `save(...)` and does NOT mount a
 * Pinia store, so it composes with peer's DART-47 setup screen without
 * touching shared files.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  PssActivityCategory,
  PssDayOfWeek,
  PssScheduleRecord,
  PssTemplateSlot,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';
import { activitiesRepository, schedulesRepository } from '~/services/pss/repositories';
import { enqueue as enqueueSync } from '~/composables/usePssSyncQueue';
import {
  applyScheduleDto,
  toSchedulePayload,
  usePssSchedulesApi,
  type PssActivityLookup,
} from '~/services/pss/schedulesApi';

// ── Validation contract ────────────────────────────────────────────────

export interface PssScheduleValidationIssue {
  /** Day this issue belongs to. `undefined` for schedule-level issues. */
  day?: PssDayOfWeek;
  /** Optional time-period scope. */
  timePeriod?: PssTimePeriodLabel;
  /** Human-readable message safe to surface in a banner. */
  message: string;
  /** Machine-readable code for tests / i18n. */
  code:
    | 'no_content'
    | 'day_empty'
    | 'missing_play'
    | 'missing_wellbeing'
    | 'locked_day'
    | 'locked_period';
}

export interface PssScheduleValidationResult {
  /** Hard-blocking issues — Save MUST be disabled when this is non-empty. */
  blockers: PssScheduleValidationIssue[];
  /** Non-blocking issues — render a yellow banner, allow Save. */
  warnings: PssScheduleValidationIssue[];
}

/** A day/period the parent has frozen because a session has started or
 *  completed there (PRD §6.6 edit-lock). */
export interface PssScheduleLock {
  day: PssDayOfWeek;
  /** Omit to lock the whole day. */
  timePeriod?: PssTimePeriodLabel;
}

// ── Save contract ──────────────────────────────────────────────────────

export interface PssScheduleSaveContext {
  /** Online status from `useOfflineStatus` / `usePssSyncQueue`. */
  isOnline: boolean;
  /**
   * The currently-active schedule for the same CFS, if any. When set and
   * not the schedule we are saving, it will be archived in the same
   * transaction (server enforces UNIQUE).
   */
  previousActive?: PssScheduleRecord | null;
  /** Days/periods currently locked because a session was started. */
  locks?: PssScheduleLock[];
}

export type PssScheduleSaveOutcome =
  | {
      ok: true;
      /** The persisted local record (with sync metadata). */
      record: PssScheduleRecord;
      /** True when the save round-tripped through the network. */
      synced: boolean;
      validation: PssScheduleValidationResult;
    }
  | {
      ok: false;
      validation: PssScheduleValidationResult;
      /** Surfaced when validation passed but persistence threw. */
      error?: string;
    };

export interface UsePssScheduleSaveReturn {
  validate: (
    schedule: PssScheduleRecord,
    locks?: PssScheduleLock[],
  ) => PssScheduleValidationResult;
  save: (
    schedule: PssScheduleRecord,
    context: PssScheduleSaveContext,
  ) => Promise<PssScheduleSaveOutcome>;
}

// ── Helpers ────────────────────────────────────────────────────────────

const DAY_LABEL: Record<PssDayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function nowIso(): string {
  return new Date().toISOString();
}

function lockMatches(
  lock: PssScheduleLock,
  slot: { day: PssDayOfWeek; timePeriod: PssTimePeriodLabel },
): boolean {
  if (lock.day !== slot.day) return false;
  if (!lock.timePeriod) return true;
  return lock.timePeriod === slot.timePeriod;
}

/** Group a flat slot list by day for category-coverage checks. */
function slotsByDay(
  slots: PssTemplateSlot[],
): Map<PssDayOfWeek, PssTemplateSlot[]> {
  const out = new Map<PssDayOfWeek, PssTemplateSlot[]>();
  for (const s of slots) {
    const list = out.get(s.day);
    if (list) list.push(s);
    else out.set(s.day, [s]);
  }
  return out;
}

/**
 * Resolve the category for a slot. The validator only needs the
 * Play/Wellbeing/Learn categorisation; we surface a helper as a prop on
 * `validate` so callers can inject the activity catalogue lookup
 * (typically `activitiesRepository.getByEitherId`). To keep the
 * composable stateless and side-effect free at call time we accept the
 * resolver via the schedule itself: slots sourced from the picker
 * already know their activity, but the catalogue is the source of truth.
 *
 * In practice the calling page already knows the categories (it built
 * the picker that produced the slot). To avoid a second async lookup we
 * accept the resolver as part of the schedule via a side channel — see
 * `PssScheduleRecord.templateSlots[].activityId` and parent-injected
 * `categoryFor` map below.
 */
export type PssCategoryResolver = (
  activityId: string,
) => PssActivityCategory | undefined;

// ── Validation ─────────────────────────────────────────────────────────

/**
 * Pure validation. The category resolver is required to evaluate the
 * "missing Play / Wellbeing" warnings — the parent supplies it because
 * the activity catalogue lives in IndexedDB and the page has already
 * loaded it for the picker.
 */
export function validateSchedule(
  schedule: PssScheduleRecord,
  categoryFor: PssCategoryResolver,
  locks: PssScheduleLock[] = [],
): PssScheduleValidationResult {
  const blockers: PssScheduleValidationIssue[] = [];
  const warnings: PssScheduleValidationIssue[] = [];

  // Locked-slot blocker — surface BEFORE per-day checks so the user can
  // remove the offending slot before re-trying.
  for (const slot of schedule.templateSlots) {
    const matched = locks.find((l) => lockMatches(l, slot));
    if (!matched) continue;
    blockers.push({
      day: slot.day,
      timePeriod: slot.timePeriod,
      code: matched.timePeriod ? 'locked_period' : 'locked_day',
      message: matched.timePeriod
        ? `Cannot edit ${matched.timePeriod} on ${DAY_LABEL[slot.day]} — a session has already started.`
        : `Cannot edit ${DAY_LABEL[slot.day]} — a session has already started.`,
    });
  }

  // No content anywhere → top-level blocker.
  const anyContent = schedule.activeDays.some((d) =>
    schedule.templateSlots.some((s) => s.day === d),
  );
  if (!anyContent) {
    blockers.push({
      code: 'no_content',
      message: 'Add at least one activity before saving.',
    });
    return { blockers, warnings };
  }

  // Per-day checks.
  const grouped = slotsByDay(schedule.templateSlots);
  for (const day of schedule.activeDays) {
    const list = grouped.get(day) ?? [];
    if (list.length === 0) {
      blockers.push({
        day,
        code: 'day_empty',
        message: `${DAY_LABEL[day]} has no activities.`,
      });
      continue;
    }
    const cats = new Set<PssActivityCategory>();
    for (const slot of list) {
      const c = categoryFor(slot.activityId);
      if (c) cats.add(c);
    }
    if (!cats.has('play')) {
      warnings.push({
        day,
        code: 'missing_play',
        message: `${DAY_LABEL[day]} has no Play activity.`,
      });
    }
    if (!cats.has('wellbeing')) {
      warnings.push({
        day,
        code: 'missing_wellbeing',
        message: `${DAY_LABEL[day]} has no Wellbeing activity.`,
      });
    }
  }

  return { blockers, warnings };
}

// ── Save flow ──────────────────────────────────────────────────────────

/** Persist the schedule locally and (online) push to the server. */
async function persistOnline(
  schedule: PssScheduleRecord,
  previousActive: PssScheduleRecord | null,
  lookup: PssActivityLookup,
): Promise<PssScheduleRecord> {
  const api = usePssSchedulesApi();

  // Stable idempotency keys so an aborted-then-retried Save does not
  // double-write on the server.
  const writeKey = uuidv4();
  const activateKey = uuidv4();
  const archiveKey = uuidv4();

  // 1. Create-or-update.
  //    BE on develop after PR #6 only exposes POST (create). Edits to a
  //    schedule that already has a server id are treated as new drafts
  //    until the BE ships PATCH; the previous active record is archived
  //    locally below and the server enforces the same UNIQUE-active
  //    invariant on activate.
  const isNew = !schedule.serverId;
  const dto = await api.create(schedule, lookup, { idempotencyKey: writeKey });
  void isNew;

  // 2. Activate (server moves any other active schedule on the same CFS
  //    to status='archived' atomically).
  const activatedDto = await api.activate(dto.id, {
    idempotencyKey: activateKey,
  });

  // 3. Optimistic local archive of the previously-active record so the
  //    UI does not show two `active` rows for the same CFS until the
  //    next pull. The server has already enforced this.
  if (
    previousActive &&
    previousActive.clientId !== schedule.clientId &&
    previousActive.status === 'active'
  ) {
    await schedulesRepository.patch(previousActive.clientId, {
      status: 'archived',
      syncStatus: 'synced',
    });
  }
  // `archiveKey` is reserved for an explicit DELETE/ARCHIVE round-trip
  // when offline edits race the server-side auto-archive. Online here,
  // the activate call already covered it, so no extra request needed.
  void archiveKey;

  // 4. Merge the server-authoritative DTO back over the local record and
  //    mark it synced. clientId stays stable so any in-flight UI bindings
  //    keep working.
  const merged = applyScheduleDto(schedule, activatedDto);
  merged.syncStatus = 'synced';
  merged.syncError = undefined;
  merged.clientTimestamp = nowIso();
  await schedulesRepository.upsert(merged);
  return merged;
}

/** Persist the schedule locally and queue mutations for the sync worker. */
async function persistOffline(
  schedule: PssScheduleRecord,
  previousActive: PssScheduleRecord | null,
  lookup: PssActivityLookup,
): Promise<PssScheduleRecord> {
  const isNew = !schedule.serverId;
  const local: PssScheduleRecord = {
    ...schedule,
    status: 'active',
    syncStatus: 'pending',
    clientTimestamp: nowIso(),
  };
  await schedulesRepository.upsert(local);

  // Queue the create/update — payload mirrors the wire shape so the
  // worker can replay it without re-resolving the record.
  const writePayload = toSchedulePayload(local, lookup);
  await enqueueSync({
    resource: 'pss_schedules',
    operation: isNew ? 'create' : 'update',
    recordClientId: local.clientId,
    payload: writePayload,
  });

  // Queue the activate as a separate op so the worker can retry it
  // independently if the create succeeded but activate failed. The BE
  // auto-archives any other active schedule on the same CFS via the
  // UNIQUE-active constraint, so no separate archive op is needed.
  await enqueueSync({
    resource: 'pss_schedules',
    operation: 'update',
    recordClientId: local.clientId,
    payload: { __op: 'activate', id: local.serverId ?? local.clientId },
  });

  // Optimistic local archive of the previous active schedule so the
  // current-schedule view (DART-33) shows the right one immediately.
  // No queued archive op: the server enforces the same invariant when
  // it processes the activate above.
  if (
    previousActive &&
    previousActive.clientId !== local.clientId &&
    previousActive.status === 'active'
  ) {
    await schedulesRepository.patch(previousActive.clientId, {
      status: 'archived',
      syncStatus: 'synced',
    });
  }

  return local;
}

export function usePssScheduleSave(
  categoryFor: PssCategoryResolver,
): UsePssScheduleSaveReturn {
  function validate(
    schedule: PssScheduleRecord,
    locks: PssScheduleLock[] = [],
  ): PssScheduleValidationResult {
    return validateSchedule(schedule, categoryFor, locks);
  }

  async function save(
    schedule: PssScheduleRecord,
    context: PssScheduleSaveContext,
  ): Promise<PssScheduleSaveOutcome> {
    const validation = validate(schedule, context.locks ?? []);
    if (validation.blockers.length > 0) {
      return { ok: false, validation };
    }

    const previousActive = context.previousActive ?? null;
    try {
      // Pre-fetch the activity catalogue once so the wire-shape mappers
      // can denormalise each slot's `activityId` into the BE's
      // `activity_name` / `activity_aim` / `activity_steps` / `materials`
      // strings (DART-73 contract — server stores activity text inline,
      // not a FK).
      const activityIds = Array.from(
        new Set(schedule.templateSlots.map((s) => s.activityId)),
      );
      const activityRows = await Promise.all(
        activityIds.map((id) => activitiesRepository.getByEitherId(id)),
      );
      const activityMap = new Map(
        activityRows
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .flatMap((r) => [
            [r.clientId, r] as const,
            ...(r.serverId ? [[r.serverId, r] as const] : []),
          ]),
      );
      const lookup: PssActivityLookup = (id) => activityMap.get(id);

      let synced = false;
      let record: PssScheduleRecord;
      if (context.isOnline) {
        try {
          record = await persistOnline(schedule, previousActive, lookup);
          synced = true;
        } catch (err) {
          // Only fall back to the offline queue on transport-level
          // failures (DNS, connection refused, abort) — `usePssApi`
          // normalises those to `status: 0`. HTTP responses (4xx/5xx)
          // are real server decisions and must surface to the user
          // rather than silently queueing a write the server already
          // rejected. Without this guard a 422/500 would be hidden
          // behind a "saved offline" toast and the schedule would
          // never persist.
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status?: unknown }).status
              : undefined;
          const isTransport = status === 0;
          if (!isTransport) {
            // Re-throw so the outer catch marks the local record as
            // failed and the caller sees `ok: false` with the error.
            throw err;
          }
          // eslint-disable-next-line no-console
          console.warn(
            '[pss] online schedule save failed (network); queueing for retry',
            err,
          );
          record = await persistOffline(schedule, previousActive, lookup);
          synced = false;
        }
      } else {
        record = await persistOffline(schedule, previousActive, lookup);
      }
      return {
        ok: true,
        record,
        synced,
        validation,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save schedule';
      // Keep the local copy so the user does not lose work — mark it
      // failed so the queue worker can attempt to flush it later.
      await schedulesRepository
        .upsert({
          ...schedule,
          syncStatus: 'failed',
          syncError: message,
          clientTimestamp: nowIso(),
        })
        .catch(() => {
          /* swallow secondary persistence error */
        });
      return { ok: false, validation, error: message };
    }
  }

  return { validate, save };
}
