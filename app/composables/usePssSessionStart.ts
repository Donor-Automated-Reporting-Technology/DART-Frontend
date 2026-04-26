/**
 * usePssSessionStart — offline-first start-session orchestration.
 *
 * Jira: DART-51 (sub-task of DART-35).
 *
 * Flow (mirrors `usePssCustomActivityCreate` for consistency):
 *   1. Validate input (active schedule, today's slots, no in-progress
 *      session for the same (date, time period, age group)).
 *   2. Build a `PssSessionRecord` (status='in-progress', startedAt=now,
 *      fresh UUID v4 as both `id` and `clientId`, `serverId=null`).
 *   3. Build one `PssSessionActivityRecord` per scheduled slot
 *      (status='pending', preserves slot order).
 *   4. Upsert all rows into IndexedDB so the checklist screen
 *      (DART-45) sees them instantly.
 *   5. Enqueue ONE `pss_sessions` create op into the sync queue —
 *      payload carries the full slot list so the server can seed
 *      `pss_session_activities` atomically and the sender can mirror
 *      back the server-issued ids.
 *   6. Return the local session record and slot rows so the caller can
 *      navigate to the checklist using the local `clientId`.
 *
 * Online-or-offline agnostic: the worker decides. The composable does
 * not call the API directly; it lives entirely on top of the
 * IndexedDB + outbox primitives so behaviour is identical in both
 * states (key requirement for the AC "All writes work offline").
 *
 * Stateless / parallel-safe: no Pinia store touched, no shared module
 * state — every call mints fresh records.
 */

import { v4 as uuidv4 } from 'uuid';

import { sessionsRepository } from '~/services/pss/repositories/sessionsRepository';
import { sessionActivitiesRepository } from '~/services/pss/repositories/sessionActivitiesRepository';
import { enqueue as enqueueSync } from '~/composables/usePssSyncQueue';
import { toSessionCreatePayload } from '~/services/pss/sessionsApi';
import type {
  PssScheduleAgeGroup,
  PssScheduleRecord,
  PssSessionActivityRecord,
  PssSessionRecord,
  PssTemplateSlot,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

// ── Types ────────────────────────────────────────────────────────────

export interface PssSessionStartInput {
  /** Active schedule for the facilitator's CFS (status === 'active'). */
  schedule: PssScheduleRecord;
  /** YYYY-MM-DD — typically today, but accepted as an arg for testability. */
  date: string;
  timePeriod: PssTimePeriodLabel;
  ageGroup: PssScheduleAgeGroup;
  /** Authenticated user UUID — stamped on the session as facilitatorId. */
  facilitatorId: string;
}

export type PssSessionStartIssueCode =
  | 'schedule_not_active'
  | 'no_slots_for_period'
  | 'session_already_started'
  | 'facilitator_required'
  | 'invalid_date';

export interface PssSessionStartIssue {
  code: PssSessionStartIssueCode;
  message: string;
}

export interface PssSessionStartOk {
  ok: true;
  session: PssSessionRecord;
  slots: PssSessionActivityRecord[];
  /** Sync-queue item id — useful for tests and the queue indicator. */
  queueItemId: string;
}

export interface PssSessionStartError {
  ok: false;
  /**
   * Set when an in-progress session already exists for the same
   * (date, time period, age group) — caller should navigate to that
   * existing session instead of creating a new one.
   */
  existing?: PssSessionRecord;
  issues: PssSessionStartIssue[];
}

export type PssSessionStartResult =
  | PssSessionStartOk
  | PssSessionStartError;

// ── Pure helpers (exported for tests) ────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_FROM_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Map a YYYY-MM-DD string to the schedule's day-of-week token. */
export function dayOfWeekFor(date: string): typeof DAY_FROM_INDEX[number] | null {
  if (!ISO_DATE_RE.test(date)) return null;
  // Treat the date as midnight UTC so timezone never shifts the day-of-week.
  const ts = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ts)) return null;
  const idx = new Date(ts).getUTCDay();
  return DAY_FROM_INDEX[idx] ?? null;
}

/**
 * Filter the schedule's templateSlots down to the ordered slot list for
 * the requested (day, time period, age group). Returned in slot-order.
 */
export function slotsForPeriod(
  schedule: PssScheduleRecord,
  date: string,
  timePeriod: PssTimePeriodLabel,
  ageGroup: PssScheduleAgeGroup,
): PssTemplateSlot[] {
  const day = dayOfWeekFor(date);
  if (!day) return [];
  return schedule.templateSlots
    .filter(
      (s) =>
        s.day === day &&
        s.timePeriod === timePeriod &&
        s.ageGroup === ageGroup,
    )
    .sort((a, b) => a.order - b.order);
}

// ── Composable ───────────────────────────────────────────────────────

export function usePssSessionStart() {
  /**
   * Start a session for the given (date, time period, age group) slot.
   *
   * Duplicate prevention: looks up `(scheduleId, date, timePeriod,
   * ageGroup)` in IndexedDB before creating. If an in-progress session
   * already exists locally, returns it under `existing` so the caller
   * can navigate there instead of double-starting.
   *
   * @returns `{ ok: true, session, slots, queueItemId }` on success, or
   *   `{ ok: false, issues, existing? }` on validation failure / duplicate.
   */
  async function start(
    input: PssSessionStartInput,
  ): Promise<PssSessionStartResult> {
    const issues: PssSessionStartIssue[] = [];

    if (input.schedule.status !== 'active') {
      issues.push({
        code: 'schedule_not_active',
        message: 'No active schedule — start one before running a session.',
      });
    }
    if (!input.facilitatorId?.trim()) {
      issues.push({
        code: 'facilitator_required',
        message: 'Authenticated user id is missing.',
      });
    }
    if (!ISO_DATE_RE.test(input.date)) {
      issues.push({
        code: 'invalid_date',
        message: 'Session date must be YYYY-MM-DD.',
      });
    }

    if (issues.length > 0) return { ok: false, issues };

    const slotTemplates = slotsForPeriod(
      input.schedule,
      input.date,
      input.timePeriod,
      input.ageGroup,
    );
    if (slotTemplates.length === 0) {
      return {
        ok: false,
        issues: [
          {
            code: 'no_slots_for_period',
            message: 'No activities scheduled for this slot today.',
          },
        ],
      };
    }

    // Duplicate prevention — scoped by schedule + date.
    const sameDay = await sessionsRepository.listByScheduleAndDate(
      input.schedule.clientId,
      input.date,
    );
    const duplicate = sameDay.find(
      (s) =>
        s.timePeriod === input.timePeriod &&
        s.ageGroup === input.ageGroup &&
        s.status === 'in-progress',
    );
    if (duplicate) {
      return {
        ok: false,
        existing: duplicate,
        issues: [
          {
            code: 'session_already_started',
            message:
              'A session for this period is already in progress — open it instead.',
          },
        ],
      };
    }

    const now = new Date().toISOString();
    const sessionClientId = uuidv4();
    const idempotencyKey = uuidv4();

    const session: PssSessionRecord = {
      id: sessionClientId,
      clientId: sessionClientId,
      serverId: null,
      clientTimestamp: now,
      syncStatus: 'pending',
      scheduleId: input.schedule.clientId,
      date: input.date,
      timePeriod: input.timePeriod,
      ageGroup: input.ageGroup,
      status: 'in-progress',
      facilitatorId: input.facilitatorId,
      remarks: '',
      startedAt: now,
      completedAt: null,
    };

    const slots: PssSessionActivityRecord[] = slotTemplates.map((tpl) => {
      const slotClientId = uuidv4();
      return {
        id: slotClientId,
        clientId: slotClientId,
        serverId: null,
        clientTimestamp: now,
        syncStatus: 'pending',
        sessionId: sessionClientId,
        activityId: tpl.activityId,
        order: tpl.order,
        status: 'pending',
        notes: '',
        completedAt: null,
        flaggedChildren: [],
      };
    });

    // Persist locally first so the checklist screen sees the records
    // even if the queue enqueue step throws.
    await sessionsRepository.upsert(session);
    for (const slot of slots) {
      await sessionActivitiesRepository.upsert(slot);
    }

    const payload = toSessionCreatePayload(
      session,
      input.schedule.cfsLocationId,
      slots,
    );

    const queueItemId = await enqueueSync({
      resource: 'pss_sessions',
      operation: 'create',
      recordClientId: sessionClientId,
      payload,
      idempotencyKey,
    });

    return { ok: true, session, slots, queueItemId };
  }

  return { start };
}
